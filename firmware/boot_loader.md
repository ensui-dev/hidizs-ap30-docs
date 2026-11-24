# The boot loader (IDB area)

Status: draft, 2026-11

The AP30 boots in three steps: the SoC's mask ROM, a Rockchip boot loader stored in a hidden area at the start of the
internal flash (the "IDB area"), and then the HidizsOS firmware image in slot FW1 (or FW2). The loader is never
written by firmware updates. It decides between a normal boot and **loader USB mode** (a Rockusb device,
`2207:262d`), checks the firmware image very lightly (magic and a header copy, no CRC), copies the first three code
sections into RAM and jumps in. Its behaviour is controlled by a marker in the PMU register `PMU_SYS_REG3` and by a
button check (D-pad Right with USB power). This page describes the loader as read from a dump of the IDB area of an
AP30 and disassembled, plus what was measured on the device.

## Contents
- [Identity and version](#identity-and-version)
- [Where it lives: the IDB area](#where-it-lives-the-idb-area)
- [Scrambling](#scrambling)
- [Boot flow](#boot-flow)
- [Boot markers in PMU_SYS_REG3](#boot-markers-in-pmu_sys_reg3)
- [The button check (D-pad Right)](#the-button-check-d-pad-right)
- [Choosing FW1 or FW2, and the sticky fallback](#choosing-fw1-or-fw2-and-the-sticky-fallback)
- [What the loader checks and loads](#what-the-loader-checks-and-loads)
- [Loader USB mode (Rockusb)](#loader-usb-mode-rockusb)
- [The READ_SECTOR (0x04) view](#the-read_sector-0x04-view)
- [What the loader sets up for the firmware](#what-the-loader-sets-up-for-the-firmware)
- [RAM the loader owns](#ram-the-loader-owns)
- [Interaction with the stock firmware](#interaction-with-the-stock-firmware)
- [Consequences for recovery](#consequences-for-recovery)
- [Open questions](#open-questions)
- [Sources](#sources)

## Identity and version

| Item | Value | Tag |
|---|---|---|
| Version reported by the stock firmware | **4.16** (`0x0416`, returned by the firmware's vendor SCSI "info" command, read from the IDB) | [AP30] |
| Banner printed by the loader itself | "Boot Release Time: Dec  3 2025 17:30:10, version: 4.15" | [AP30] |
| Why the two numbers differ | unknown | [?] |
| Echo Mini loader, for comparison | 4.06 | [EM] |
| Chip ID it reports (Rockusb READ_CHIP_INFO) | ASCII `C262` followed by `USBC` (same as the Echo Mini) | [AP30] |
| Flash info it reports (Rockusb READ_FLASH_INFO) | vendor field "Samsung eMMC", 983,040 sectors (480 MiB), block 512 KiB, page 8 KiB, ECC 0, CS0. The vendor field is probably a default value, not a read CID: the part on the board looks like an SD-NAND (see [../hardware/storage.md](../hardware/storage.md)) | [AP30]; vendor field meaning [?] |
| Main stage linked at | 0x03000000 | [AP30] |

The loader version is the same before and after installing V1.7.8 (4.16 both times), which confirms that updates do
not touch it [AP30].

## Where it lives: the IDB area

The internal flash starts with a hidden area of 0x2000 sectors (4 MiB) that the loader keeps outside its own
LBA space. The loader's LBA 0 is physical sector 0x2000 (the FW1 header). The full map is on
[../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md); the loader part looks like this
(physical sector numbers; the "op 0x04 address" column is what the loader's READ_SECTOR command uses, see
[below](#the-read_sector-0x04-view)):

```
physical  op 0x04
0x0000    —        ┌ 64 sectors, not reachable with READ_SECTOR; content unknown                 [?]
0x0040    0x0000   ├ IDB copy 0 ───────────────────────────────────────────────────────────────┐
                   │ +0x00  header       RC4   magic 0x0FF0AA55, stage table at +0x38          │
                   │ +0x01  sector 1     plain "NANO" tag at +0x0a; system-zone size at +0x02  │
                   │ +0x02  sector 2     RC4   "C262" (the chip ID the loader reports)         │
                   │ +0x03  sector 3     device identity (serial / UID / Bluetooth + Wi-Fi MAC)│
                   │ +0x04  stage A      RC4   4 sectors (2 KiB), SP 0x03002000, reset 0x0300010d
                   │ +0x0c  stage B      RC4   4 sectors, byte-identical to stage A            │
                   │ +0x14  stage C      RC4   36 sectors (18 KiB) = MAIN LOADER,              │
                   │                           SP 0x03090000, reset 0x0300008d                  │
                   │ +0x38  trailer      plain 00 00 0f 00 00 04 08 00 32 00 01 00  (meaning ?)│
0x01f0    0x01b0   │ FAT16 boot sector ("MSDOS5.0", "NO NAME", hidden sectors = 496 = its own  │
                   │ position) + two empty FATs at op 0x1c0 / 0x2b0: leftover of a factory      │
                   │ format [?]                                                                │
0x0400    0x03c0   │ 0xFF (erased)                                                             │
0x0440    0x0400   ├ IDB copy 1 (identical)                                                    │
0x0840    0x0800   ├ IDB copy 2 (identical)                                                    │
0x0c40    0x0c00   ├ IDB copy 3 (identical)                                                    │
0x1040    0x1000   ├ IDB copy 4 (identical)                                                    │
0x107c    0x103c   │ 0xFF (erased) up to the end of the hidden area                            │
0x2000    0x1fc0   └ FW1 header = loader LBA 0 ────────────────────────────────────────────────┘
```
All [AP30], from three identical dumps of op 0x04 addresses 0..0x1FFF.

**The header's stage table** (+0x38 in the descrambled header sector): `{0x14, 0x24}` = stage C start sector and
sector count, `{4, 4}` = stage A, `{0xc, 4}` = stage B [AP30 layout; field names [?]]. Bytes +0x50..0x5F are also
non-zero; their meaning is unknown [?]. This is not the textbook layout of other Rockchip IDB headers [?].

**Sector 1** carries values the stock firmware reads at boot: the ASCII tag `NANO` at +0x0a (the firmware checks it),
the system-zone size in MiB at +0x02 (60 on the AP30; the firmware turns it into sectors, and half of it, 0xF000
sectors = 30 MiB, becomes the FW2 slot offset), and another value at +0x20 whose role is not known [AP30].

**Sector 3 = device identity.** In Rockchip's SDK this sector holds a packed record: a 16-bit serial length, a 60-byte
serial number, 405 reserved bytes, then a UID length + 30-byte UID, a Bluetooth address length + 6-byte address, and a
MAC length + 6-byte MAC [EVK]. Only Rockchip's factory tool writes it, from a serial-number list [EVK]. The AP30
firmware contains a reader for physical sector 0x43 (= op 0x04 address 3) at 0x0305ef14 and a wrapper at 0x03068766,
but nothing calls the wrapper, so V1.7.8 never reads the serial [AP30]. Treat this sector as personal data: never
publish a dump of it.

## Scrambling

The header sector, sector 2 and the three stages are scrambled with **RC4 using Rockchip's standard IDB key**, the
16 bytes `7C 4E 03 04 55 05 09 07 2D 2C 7B 38 17 0D 17 11` (decimal 124, 78, 3, 4, 85, 5, 9, 7, 45, 44, 123, 56, 23,
13, 23, 17) [WEB: rkdeveloptool `P_RC4`, u-boot `tools/rockchip/rkcommon.c`]. The keystream **restarts for every
512-byte sector**: each sector is descrambled on its own with a fresh RC4 state [AP30]. Sectors 1 and 3 and the trailer
are stored in clear [AP30]. After descrambling, the header starts `55 AA F0 0F` (magic 0x0FF0AA55 little-endian)
[AP30].

## Boot flow

Stage A and stage B are identical 2 KiB programs with a stack at 0x03002000; they run first, presumably early setup
and the load of stage C [?]. Stage C is the main loader. Its flow, in words [AP30, stage C disassembly]:

```
power-on / reset
   │  mask ROM: reads the IDB from the flash (five copies), runs stage A/B, then stage C
   ▼
stage C main (~0x030009e2)
   1. POWERHOLD (GPIO2_6) := output, high      ── the loader keeps the player powered
   2. clocks (PLL 48 MHz, APB /2), UART1A TX on GPIO2_16, 115200 8N1, banner
   3. VTOR := 0x0304A000
   4. m := PMU_SYS_REG3 & 0xFFFF               ── survives soft resets, cleared by power-on resets
        m == 0x18BF ─► clear marker, clear NVIC, jump through the ROM vector at ROM 0x8C ─► MaskROM USB
        m == 0x18AF ─► usb := 1, marker := 0x18EF        (firmware asked for loader mode)
        m == 0x18EF ─► usb := 1, marker := 0             (one more loader-mode boot, then normal)
   5. common init (0x030006c0)
   6. button check (0x03000934): D-pad Right + VBUS ─► prints "FW upgrade mode is detected",
                                                      marker := 0x18EF, usb := 1
   7. usb == 0 ─► prints "MemBoot", boots the firmware (0x03000c14), never returns
      usb == 1 ─► Rockusb loader mode (init 0x03003964), serves commands while VBUS is present
                  VBUS lost ─► prints "power down", then spins forever with POWERHOLD still high
```

Strings the loader prints on its console: the banner, `BootDevType=`, `IDBAddr=`, "MemBoot", "FW upgrade mode is
detected", "ADCounter =%d", "adc time out", "Vbus err", "power down" [AP30].

## Boot markers in PMU_SYS_REG3

`PMU_SYS_REG3` is at 0x5002004C. Like other Rockchip registers it is written with a mask in the upper 16 bits, so a
write of `0xFFFF18AF` sets the low half to `0x18AF` [AP30; TRM]. The low half survives a soft reset (Cortex-M
`SYSRESETREQ`) and is cleared by a power-on-class reset, including the ~8 s Power long-press reset [AP30, measured].

| Low 16 bits | Written by | Effect at the next boot | Tag |
|---|---|---|---|
| `0x18BF` | nothing in V1.7.8 (the firmware's MaskROM reboot jumps to ROM 0x8C directly) | marker cleared, jump to MaskROM USB | [AP30] |
| `0x18AF` | the stock firmware, when asked to reboot into loader mode (vendor SCSI command) | loader USB mode; the marker becomes `0x18EF` | [AP30] |
| `0x18EF` | the loader: after the button entry, after converting `0x18AF`, and on the "FW2 failed, try FW1" path | **one more** loader-mode boot, then the marker is cleared | [AP30] |
| `0x18DF` | the loader, just before it tries FW1 | normal boot | [AP30] |
| `0x18CF` | the loader, just before it tries FW2 (because FW1 failed the check) | **FW2 is tried first again** (sticky) | [AP30] |
| `0x0000` | the loader clears it; power-on reset | normal boot | [AP30] |

The stock firmware never reads or clears this register; its only access is the `0x18AF` write before a reboot to
loader mode [AP30]. So whatever marker the loader left is still there while the firmware runs, and the next soft
reset sees it. A firmware can read the low half early at boot to learn which slot it was started from (`0x18DF` FW1,
`0x18CF` FW2) [AP30].

**What this explains, measured on the device [AP30]:**
* After a button entry the marker is `0x18EF`. A Rockusb DEVICE_RESET (sub-code 0) then comes back in loader mode
  (and clears the marker); the next DEVICE_RESET boots the firmware. Observed exactly so: resets 1 and 3 returned to
  the loader, 2 and 4 booted.
* The ~8 s long-press reset clears the register: after a button entry had left `0x18EF`, a long press booted the
  firmware, not the loader. So that reset is power-on class, not a soft reset.

## The button check (D-pad Right)

At 0x03000934 [AP30]:

* It takes up to **500 samples** of SAR-ADC channel 1 (the key ladder). Each conversion has a timeout ("adc time out").
* A sample **≤ 0x40** counts as "pressed" (the ladder's 0 V slot). Three samples above 0x40 in a row end the check
  with "no" (it prints `ADCounter =n`). A pressed sample resets that miss counter.
* Every sample also checks **VBUS** (GRF at 0x50010000 + 0xE8, bit 1). No VBUS ends the check with "no" ("Vbus err").
* If all 500 samples pass, the result is "yes" only if VBUS is still present.

So loader mode needs **D-pad Right held for the whole check, with USB power present**. Without the button the check
gives up after 3 samples, so a normal boot is not slowed down [AP30].

**Why D-pad Right:** the check tests the ladder voltage, not a key code. On Rockchip's reference board the 0 V slot of
the ADC1 ladder is the MENU key, which the SDK also names the upgrade key [EVK]. Hidizs wired D-pad Right to that slot
(the firmware's key table: ADC < 70 → key code 0x004 = D-pad Right), so it inherited the role [AP30 + EVK]. Rockchip's
tool manual describes the same entry: hold the upgrade key while plugging in USB [EVK]. Key ladder values:
[../hardware/input.md](../hardware/input.md).

**The full-speed burst.** On every boot with USB power present, the host sees a ~2 s full-speed USB device that fails
to enumerate (`-71` / `-110` / `-32` errors) before either loader mode or the firmware appears [AP30, two different
host computers]. The button check touches no USB and, without the button, ends after 3 samples, so the burst comes
from another stage (mask ROM, stage A/B, or the loader's common init) [?]. Once, after a long-press reset from loader
mode, the burst was missing; unexplained [?]. Loader USB mode itself is high-speed.

## Choosing FW1 or FW2, and the sticky fallback

The boot routine (0x03000c14) never returns [AP30]:

```
if marker == 0x18CF:                    last boot came from FW2
    if FW2 present: try FW2
    marker := 0x18EF; try FW1; spin forever
marker := 0x18DF; try FW1
if FW2 present: marker := 0x18CF; try FW2
spin forever
```

* FW1 is at loader LBA 0 (physical 0x2000). FW2 is at an LBA derived from the IDB (0xF000 on the AP30, physical
  0x11000) [AP30].
* **FW2 is used only when FW1 fails the loader's check** (wrong magic, header copy mismatch, or a read error). A FW1 that
  passes the check but crashes or hangs at run time is booted again and again: there is no watchdog and no boot
  counter in the loader [AP30, device-proven with a deliberately hung FW1].
* Once FW2 has booted, `0x18CF` stays set (the firmware never clears it), so every soft reset prefers FW2 until a
  power-on-class reset clears the register [AP30; behaviour across a real power loss [?]].
* If both slots fail, the loader spins in this routine. It does **not** fall back to USB mode by itself; the button
  entry is the only way in [AP30].
* Note: the stock firmware V1.7.8 loads all its overlays, images, fonts and strings from FW1 regardless of which slot
  the loader booted, so a FW2 fallback cannot rescue a damaged FW1 with stock firmware [AP30]. Details:
  [update_process.md](update_process.md).
* The stock updater writes the same image to both slots, so after any official install FW1 == FW2 and the fallback has
  nothing different to fall back to [AP30].

## What the loader checks and loads

The "try" routine (0x03003460) returns failure on any problem [AP30]:

1. Read the 512-byte header at the slot start. Bytes +0x1F8..0x1FF must be `RKnanoFW`.
2. Read 512 bytes at slot start + `header.size` (u32 at +0x1F4). They must equal the header byte for byte.
3. Read the stage3 section table at slot start + stage[3].offset (u32 at header +0x6C).
4. For **sections 0, 1 and 2**: copy `code_sz` bytes to `code_pa`, copy `data_sz` bytes to `data_pa`, zero `bss_sz`
   bytes at `bss_pa`.
5. Disable and clear all NVIC lines, set VTOR to the vector table at the start of section 0's data (0x03004000 in
   every image seen), write AIRCR = 0x05FA0002 (VECTCLRACTIVE), load SP and PC from that table.

**Not checked:** the RKCRC32 at the end of the image, the date, the version, the vendor and model strings, any
signature. There is no signature anywhere [AP30]. Byte-level format: [../formats/rknanofw_container.md](../formats/rknanofw_container.md)
and [../formats/stage3_sections.md](../formats/stage3_sections.md). Whether the loader handles a section count below 3
is not verified [?].

## Loader USB mode (Rockusb)

| Item | Value | Tag |
|---|---|---|
| USB ID | **`2207:262d`**, bcdDevice 1.00, bcdUSB 2.01 | [AP30] |
| Speed | high-speed (480 Mbit/s) | [AP30] |
| Interface | class/subclass/protocol `ff/06/05`, bulk endpoints `0x81` IN and `0x01` OUT, 512-byte packets | [AP30] |
| Same as | the Snowsky Echo Mini loader | [AP30 vs EM] |
| Screen | black (the loader does not drive the LCD) | [AP30] |
| Protocol | Rockchip "Rockusb": a USB mass-storage-style bulk-only transport (CBW/CSW) with Rockchip opcodes | [AP30; WEB Rockusb wiki] |
| Host tools that see it | `rkdeveloptool ld` lists it as "Loader" (rkdeveloptool accepts any `2207:xxxx` with PID ≥ 0x100); Rockchip's Windows RKDevTool contains an RKNano device class and PID 262D | [AP30; WEB] |
| Re-plug | unplugging and re-plugging while the loader runs re-enumerates as `2207:262d` straight away | [AP30] |
| Leaving | Rockusb DEVICE_RESET (see the marker note above: may need two), or the ~8 s Power long press without D-pad Right | [AP30] |

**Commands seen to work** (opcode values as in rkdeveloptool) [AP30 unless tagged]:

| Command | Opcode | Result on the AP30 |
|---|---|---|
| TEST_UNIT_READY | 0x00 | CSW status 0 |
| READ_FLASH_ID | 0x01 | `EMMC` |
| READ_FLASH_INFO | 0x1A | see the identity table above |
| READ_CHIP_INFO | 0x1B | `C262` `USBC` |
| READ_CAPABILITY | 0xAA | answers with more than 8 bytes ("overflow" for a client that expects 8) |
| READ_LBA | 0x14 | works, **at most 16 sectors (8 KiB) per command**; 128-sector reads wedged the loader |
| WRITE_LBA | 0x15 | works (single sectors and full 28 MiB slot rewrites, each 16-sector chunk read back and compared) |
| READ_SECTOR | 0x04 | the IDB view, see below |
| DEVICE_RESET | 0xFF, sub-code 0 | reboots; the outcome depends on the marker |

Not tried and not to be tried: DEVICE_RESET sub-codes 2 (power off) and 3 (reset to MaskROM) [WEB rkdeveloptool],
erase commands, and any loader download. CSW residue fields come back byte-swapped (cosmetic) [AP30].

**Practical gotchas** [AP30, measured on Linux]:
* **USB autosuspend** suspends the idle loader after ~2 s; the kernel's reset-on-resume then knocks it off the bus and
  kills the host tool's handle ("creating comm object failed"). Turn autosuspend off before opening it
  (`/sys/module/usbcore/parameters/autosuspend` = -1), and re-plug afterwards.
* rkdeveloptool uses infinite USB timeouts; its `rl` (read LBA) hung forever once on this loader. A client with
  per-command timeouts is safer.
* After a garbled transfer, the next command can receive stale data; a client should drain the IN endpoint on open and
  retry once.

**When VBUS goes away** the loader prints "power down" and spins with POWERHOLD still high: the player stays on, black
and unresponsive, until the ~8 s Power long-press reset [AP30 code; the battery case is not yet measured on the device].

## The READ_SECTOR (0x04) view

READ_SECTOR is the loader's view of its own hidden area [AP30]:

* **Address = physical sector − 64.** Proof: op 0x04 addresses 0x1FC0..0x1FFF are byte-identical to FW1's first 64
  sectors (physical 0x2000.., loader LBA 0..). So address 0 is the IDB header at physical 64, and physical 0..63 cannot
  be read this way.
* **Each sector comes back as 528 bytes**: 512 data bytes plus 16 spare bytes that are the same constant on every
  sector (filler). A client must ask for 528 bytes per sector, or the 16 extra bytes land where the CSW belongs.
* Send **one sector per command**; the layout of a multi-sector reply is unknown.
* The stock firmware's raw boot-area access uses the same numbering (physical 0x40 + n), so a firmware "boot area"
  sector number equals an op 0x04 address [AP30].

Three complete dumps of addresses 0..0x1FFF were identical [AP30].

## What the loader sets up for the firmware

State at the jump into the image [AP30, stage C disassembly, unless tagged]:

| Item | State |
|---|---|
| Core | core A only, privileged thread mode, MSP = word 0 of the image vector table, VTOR = that table (0x03004000) |
| NVIC | all lines disabled (ICER0-7); pending bits not cleared |
| SysTick, SHCSR | not touched |
| POWERHOLD (GPIO2_6) | output, high (set first thing in `main`) |
| PLL | 48 MHz, unless a word left by the boot ROM already reads 0x30 (= 48): refdiv 1, fbdiv 32 (VCO 768 MHz), postdiv 4 × 4; a fixed ~1 ms wait, no lock poll |
| APB divider | /2 |
| System-core divider | left as the ROM set it [?] |
| Console | UART1 clocked from 24 MHz; GPIO2_16 muxed to UART1A_TX (GRF GPIO2C iomux +0x48 = 0x00030001); 115200 8N1, polled TX. On the AP30 this pin is also the Bluetooth module's RX line |
| SAR-ADC | powered, ADC clock 24 MHz / 24 = 1 MHz |
| Flash controller | clocked and muxed, card left in transfer state [?] |
| Watchdog | not started |
| Core B | in reset (hardware default) |
| `PMU_SYS_REG3` | `0x18DF` (booted FW1) or `0x18CF` (booted FW2) |
| RAM | sections 0-2 loaded, their bss zeroed; loader areas dirty |

The stock firmware later drives POWERHOLD again in its own pin setup, and drives it low only to power off [AP30]. More
on the start-up sequence: [startup.md](startup.md); clocks and pins: [../hardware/soc_peripherals.md](../hardware/soc_peripherals.md).

**Where the console goes.** The loader's text goes out on UART1A TX (GPIO2_16) [AP30]. There is a test pad labelled
`TX` on the board; that it is this line is likely but not traced [?]. See [../hardware/board_ap30.md](../hardware/board_ap30.md).

## RAM the loader owns

| Range | Use | Tag |
|---|---|---|
| 0x03000000.. (linked address of stage C) | stage C image | [AP30] |
| 0x03002000 | stage A/B stack top | [AP30] |
| VTOR 0x0304A000 | the loader's vector table while it runs; stage C (18 KiB) fits up to ~0x0304E800 | [AP30]; that stage C runs from a copy at 0x0304A000 [?, EM gives 0x0304A000-0x0304DFFF for the Echo Mini build] |
| 0x03088000.. | loader variables; the first three words it finds at 0x03050000 (left by the boot ROM) are saved here before section 0 overwrites them | [AP30] |
| 0x03090000 | stage C stack top (grows down from the start of PMU SRAM) | [AP30] |

The loader contains RAM-test strings naming exactly three ranges: **0x03000000-0x0304A000, 0x03050000-0x03088000 and
0x03090000-0x030A0000** [AP30]. Read the other way round, the loader's own footprint is **0x0304A000-0x0304FFFF and
0x03088000-0x0308FFFF**. An image must not place any loaded byte (code, data, or zeroed bss of sections 0-2) there;
the space can be used after entry as uninitialised memory [AP30 inference; EM: the Echo Mini custom firmware uses it
that way]. The stock image respects this (highest loaded byte 0x03082C68) [AP30].

## Interaction with the stock firmware

* **Reboot to loader mode** [AP30]: the firmware, connected as a USB disk, accepts the Rockchip vendor SCSI command
  `FF E0 FF FF FF FE 00 01`. It then writes `0xFFFF18AF` to `PMU_SYS_REG3` and resets (AIRCR `0x05FA0007`). With
  parameter `00 00` instead of `00 01` it jumps to the MaskROM USB entry at ROM 0x8C. On the device the firmware obeys
  (black screen), but in early tests the high-speed `2207:262d` did not appear; this path is untested since the loader
  logic was understood. Details: [usb_modes.md](usb_modes.md), [../guides/recovery.md](../guides/recovery.md).
* **The `FWUP` tag** [AP30]: at boot the firmware reads sectors 1-2 of IDB copy 0 (op 0x04 addresses 1-2); if the bytes
  `F W U P` are present it overwrites them with 0xFF and writes the sector back. Only those four bytes change. When this
  happens the settings fail their check and the firmware falls back to factory defaults. The tag was not present on the
  unit examined; who would set it is unknown [?].
* **Raw access to the hidden area** [AP30]: the firmware has functions that read and write physical 0x40 + n (limit
  0x1800) and physical 0x1800..0x1BFF directly. Apart from the `FWUP` clear, no write path into the IDB copies was
  found, but the existence of these functions is why a custom firmware must never write there casually.
* **The "NanoCRebootFlag" text** at 0x0309FFF0 is written by the firmware's reboot path and read by the firmware's own
  boot-time power-key check; it is not a loader marker [AP30].

## Consequences for recovery

* The loader is on a part of the flash that updates never write, so a bad firmware image cannot remove loader mode
  [AP30].
* A hung or crashing image is recoverable **with the USB cable in**: the ~8 s Power long-press reset (hardware,
  independent of software) followed by the button check while D-pad Right is held [AP30, device-proven]. Procedure:
  [../guides/recovery.md](../guides/recovery.md).
* What cannot be recovered this way: a destroyed IDB area (all five copies). Then only mask-ROM methods remain, all
  untested on the AP30. **Never write physical sectors 0..0x1FFF, never run `rkdeveloptool ef`, never download or
  upgrade a loader (`db`, `ul`).**

## Open questions

* Roles of stage A/B (identical, 2 KiB, stack 0x03002000) [?].
* The common init routine at 0x030006c0 in detail.
* The full Rockusb command set of loader 4.16 and what the DEVICE_RESET sub-codes do on this loader.
* Where the ~2 s full-speed burst comes from, and why it was missing once.
* Version 4.15 (banner) vs 4.16 (reported).
* The meaning of the header bytes +0x50..0x5F, the trailer at +0x38 of each copy, and sector 1 +0x20.
* Physical sectors 0..63 (unreachable with READ_SECTOR).
* The boot ROM's three words at 0x03050000 (the first compared with 0x30 = 48, possibly a frequency in MHz [?]).
* Whether the software entry (`0x18AF` marker) reaches high-speed loader mode on the AP30.
* Battery-only behaviour in loader mode (unplugged: the code predicts a powered, stuck player until the long press).
* Whether `0x18CF` survives a real battery power loss (expected not to [?]).
* Which UART pad on the board carries the console.

## Sources

* [AP30] analysis of the IDB area read from an AP30 (three identical dumps) and disassembly of stage C; analysis of
  firmware V1.7.8; measured on a device (USB enumeration logs, timer measurements, the hang-and-recover test).
* [TRM] Rockchip RKNanoD Technical Reference Manual V1.0, <https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf>
  (PMU, GRF, SAR-ADC, write-mask convention).
* [EVK] Rockchip RKNanoD reference board schematic V2.2 and SDK documents (upgrade key, IDB sector 3 layout, tool
  manual).
* [EM] Snowsky Echo Mini study, `ETUDE.md` in <https://github.com/iamcheyan/echo-mini-newfw> and
  <https://github.com/berettavexee/echo-mini-newfw>.
* [WEB] rkdeveloptool, <https://github.com/rockchip-linux/rkdeveloptool> (opcodes, RC4 key, device scan rules);
  Rockchip u-boot `tools/rockchip/rkcommon.c`, <https://github.com/rockchip-linux/u-boot>; Rockusb wiki,
  <https://opensource.rock-chips.com/wiki_Rockusb> ([archived copy](https://web.archive.org/web/20260503124531/https://opensource.rock-chips.com/wiki_Rockusb); the site is often unreachable).
* Related pages: [startup.md](startup.md), [update_process.md](update_process.md), [usb_modes.md](usb_modes.md),
  [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md), [../guides/recovery.md](../guides/recovery.md),
  [../hardware/power.md](../hardware/power.md).
