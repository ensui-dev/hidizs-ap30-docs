# Start-up: from reset to the main menu

Status: draft, 2026-11

After the boot loader has copied sections 0-2 of the firmware into RAM, it jumps through the **boot vector table at
0x03004000**. Its reset entry is a short trampoline that cleans up the CPU state, switches VTOR to a second table at
the start of section 0's code, and starts the main init routine (0x030631d6). That routine sets safe pin levels,
programs clocks and interrupts, mounts storage, loads the settings, checks the battery, shows the logo, scans for an
update file and picks the first task. Before the main menu appears, two things may run: the **firmware update** (if
an update file was found) and the **media library rebuild** (if the settings say the library is dirty, which an
**unclean shutdown** causes). All facts are from V1.7.8 [AP30] unless tagged otherwise.

## Contents

- [The chain at a glance](#the-chain-at-a-glance)
- [What the boot loader leaves behind](#what-the-boot-loader-leaves-behind)
- [Vector tables and the reset trampoline](#vector-tables-and-the-reset-trampoline)
- [Main init, step by step](#main-init-step-by-step)
- [Settings load and the boot-area tag](#settings-load-and-the-boot-area-tag)
- [Choosing the first task](#choosing-the-first-task)
- [What runs before the main menu](#what-runs-before-the-main-menu)
- [Unclean shutdown and the library rebuild](#unclean-shutdown-and-the-library-rebuild)
- [Core B at start-up](#core-b-at-start-up)
- [Open questions](#open-questions)
- [Sources](#sources)

## The chain at a glance

```
power on / reset
   │
   ▼
MaskROM ─► IDB loader (stages A, B, C) ─ marker / D-pad Right check ─► loader USB mode (see boot_loader.md)
   │ copies sections 0, 1, 2 of FW1 (or FW2 on fallback), zeroes their bss,
   │ disables all NVIC lines, VTOR = 0x03004000, SP/PC from that table
   ▼
boot table @0x03004000   SP = 0x03004000, reset = 0x030563b9 (Thumb)
   │
   ▼
trampoline @0x030563b8   clear SHCSR, stop SysTick, disable all NVIC lines, zero section 0 bss,
   │                     VTOR = 0x03050000, VECTCLRACTIVE, load SP/PC from that table
   ▼
runtime table @0x03050000   SP = 0x03004000, reset = main init 0x030631d6
   │
   ▼
main init  ─► pins safe ─► clocks/IRQs ─► SysTick 10 ms ─► storage ─► settings ─► ADC ─► battery check
   │          ─► fonts / images / LCD ─► logo ─► keys ─► file system + update scan
   │          ─► first task ─► services ─► free space ─► watchdog ─► RTC check ─► last disk
   ▼
main loop: task 0 (main menu) or 12 (charge screen)
   │
   ├─ update file found?   ─► main menu runs the updater ─► reboot by watchdog
   └─ library dirty?       ─► task 13 "Updating Library…" ─► back to the main menu
```

[AP30, analysis of firmware V1.7.8; the loader part: [boot_loader.md](boot_loader.md).]

## What the boot loader leaves behind

| Item | State when the firmware starts |
|---|---|
| Code | sections 0, 1 and 2 copied from the slot that passed the loader's check (FW1 normally, FW2 on fallback); their bss zeroed |
| Core | core A in privileged thread mode, MSP = 0x03004000, VTOR = 0x03004000 |
| NVIC | all lines disabled; pending bits not cleared |
| Boot marker | low half of `PMU_SYS_REG3` (0x5002004c) = 0x18df (booted FW1) or 0x18cf (booted FW2). The firmware **never reads it** |
| POWERHOLD (GPIO2_6) | driven high by the loader |
| Clocks | PLL in normal mode at 48 MHz (set by the loader), UART1 at 115200 for the loader banner |
| Watchdog | not running |
| Core B | in reset (hardware default); its power domain powered (reset default) |

[AP30, loader disassembly; details in [boot_loader.md](boot_loader.md) and
[../hardware/soc_rknanod.md](../hardware/soc_rknanod.md).]

Because the firmware never reads the boot marker and its "use FW2" flag is never set, everything loaded after the
first three sections (overlays, images, fonts, strings) comes from **FW1**, even when the loader booted FW2
[AP30].

## Vector tables and the reset trampoline

The firmware has **two** vector tables and uses three during its life [AP30]:

| Table | Address | Contents | When active |
|---|---|---|---|
| boot table | 0x03004000 (start of section 0 data) | SP 0x03004000, reset 0x030563b9, 38 more entries | the loader points VTOR here and jumps through it |
| runtime table | 0x03050000 (start of section 0 code) | SP 0x03004000, reset = main init 0x030631d6, fault handlers | set by the trampoline |
| RAM table | 0x03004000 (rebuilt) | 57 entries, unregistered ones → crash handler | built when the first interrupt handler is registered; VTOR moves back here |

The **trampoline** at 0x030563b8, in order [AP30]:

1. Clear SHCSR (fault-handler enables).
2. Stop SysTick.
3. Disable every NVIC interrupt line.
4. Zero section 0's bss (0x03005a8c, 0x1e0b8 bytes).
5. Set VTOR = 0x03050000.
6. Write AIRCR with VECTCLRACTIVE.
7. Load SP and PC from the runtime table and jump: the main init routine starts with a fresh stack.

The reason for the indirection is not documented; one effect is that the boot table's place becomes free for the RAM
vector table the OS layer builds later [?].

## Main init, step by step

The main init routine (section 0, 0x030631d6) calls overlay 1 piece by piece. Order as found in V1.7.8 [AP30]:

| # | Step | Details |
|---|---|---|
| 1 | Safe pin levels | GPIO2_2 low (audio power line), GPIO2_7 low (Bluetooth module power), GPIO2_16 / GPIO2_17 low as plain GPIOs (the Bluetooth UART pins, also the loader's UART), GPIO2_14 high then low, GPIO0_12 low (audio source switch [?]) |
| 2 | Interrupts off | global interrupt disable |
| 3 | Globals | overlay 1 initialises some global variables |
| 4 | Clocks and resets | overlay 1 writes a known "everything idle" state: almost every peripheral clock gated and held in reset, core B's domain gated, NVIC priorities set (register values: [power_management.md](power_management.md)) |
| 5 | SysTick | 10 ms period, enabled; base clock profile entered |
| 6 | Board pins | pin multiplexing for the board (also clears the force-JTAG bit) |
| 7 | Storage devices | internal flash identified and its IDB read (system-zone size, FW2 offset), microSD driver initialised |
| 8 | **Settings load** | see [below](#settings-load-and-the-boot-area-tag) |
| 9 | ADC | SAR-ADC clock and reference set up |
| 10 | **Boot battery check** | if the battery reads **≤ 3299 mV and no USB power** is present, POWERHOLD is released: the player switches itself off again |
| 11 | Fonts, images, LCD | font base addresses read from the image header, the image set selected, LCD driver chosen and initialised, white text colour; UI clock profile entered |
| 12 | **Boot logo** | shown unless message 0x191 is set (it never is in V1.7.8) |
| 13 | I2S pin group | I2S1 port A selected |
| 14 | Keys | key ladder and wheel pins, key-scan software timer |
| 15 | **File system + update scan** | mounts the internal user volume (formats it if mounting fails), loads the favourites list, looks for `ECHOMINI.IMG`, then `HIFIYF00.IMG` … `HIFIYF89.IMG` (the last one found wins); a hit sends message 0x192 |
| 16 | First task | see [Choosing the first task](#choosing-the-first-task) |
| 17 | System services | the auto-off timers (backlight, idle power-off, sleep timer) registered |
| 18 | Pins again | Bluetooth power and UART pins low, GPIO2_14 high |
| 19 | Free space | overlay 7 computes free and total space of the internal volume |
| 20 | Clock | the base clock profile is left; GPIO2_2 low |
| 21 | **Watchdog** | started: first timeout raises an interrupt, the second resets (about 21 s at the boot bus clock) |
| 22 | **RTC check** | the RTC (PCF8563-compatible, I2C) is read; if the date or time is out of range, it is set to **2026-08-19 09:00:00** (the factory firmware's build date) |
| 23 | Last disk | if the last-used disk was the microSD and a card is inserted (GPIO0_11 low), the card becomes the current disk and its free space is computed; if no card is present, the internal disk is used and the **library is marked dirty** |
| 24 | Player defaults | a few player variables reset; GPIO2_2 low, **GPIO2_1 high (audio mute)**, USB DAC mode off |
| 25 | Main loop | never returns |

The boot logo appears at step 12; everything after it runs while the logo is on screen. The init order matters for
anyone patching the image: the settings are in RAM before the display starts, and storage works before the update
scan.

## Settings load and the boot-area tag

Overlay 1's settings loader (0x03082090) does more than read the configuration block [AP30]:

1. **Boot-area tag.** It first reads sectors 1-2 of IDB copy 0 in the hidden boot area. If the four bytes `FWUP` sit
   at offset 0x1fc of sector 2, it overwrites them with 0xFF and writes both sectors back (only those 4 bytes change).
   It then tries to read that buffer as settings; the CRC fails, so **factory defaults** are loaded. Who writes the
   tag is unknown (a PC upgrade tool [?]); it was not present on the analysed unit.
2. **Normal path.** It reads the 0x800-byte settings block from part 1, block 0, checks the CRC-8 and the "SAVE" /
   "INFO" magics, and range-checks every field into the configuration block (0x03022894).
3. **Invalid block.** If the checks fail, every field gets its default and message 400 (0x190) is sent; the boot code
   then probes the user volume and **formats it if the probe fails** [AP30].
4. **Clean-shutdown check.** If the clean-shutdown mark (+0x2e9) is not 0x55aa, the library-dirty flag (+0x42) is set.
   The mark is then cleared and the block is **written back at once**, so a crash at any later point leaves the mark
   cleared for the next boot.
5. The code-page tables (overlays 63-69) are located for later text conversion.

So the stock firmware does contain code that writes into the hidden IDB area (here only the tag bytes). The loader
stages themselves are not rewritten by any firmware path found [AP30]. Never write that area yourself:
[../guides/README.md](../guides/README.md).

## Choosing the first task

| Condition at step 16 | First task |
|---|---|
| update file found (message 0x192) | task 0, main menu (it will run the updater) |
| no update file, USB power present | task 12, charge screen |
| no update file, no USB power | task 0, main menu |

[AP30.]

## What runs before the main menu

### The firmware update

On message 0x192 the main menu draws the "updating" image, marks the internal disk as the last disk, re-queues the
message, and on the next pass loads overlay 8 and runs the updater. On success it saves the settings, sets the
watchdog timeout to 0 and spins, so the **watchdog reboots** the player. On failure it marks the library dirty and
continues [AP30]. The full process, including how FW1 and FW2 are written: [update_process.md](update_process.md).

### The library rebuild

Each pass of the main menu checks the library-dirty flag. If it is set, the menu removes the player service (music
stops) and switches to **task 13**, the library-build screen ("Updating Library…"). That task clears the flag,
runs the scan (overlay 38), the sort (overlay 39) and the favourites-area reset (overlay 40), sends message 0x18d and
returns to the task it was started from [AP30]. Details of the build: [storage_and_filesystems.md](storage_and_filesystems.md#building-the-library).

## Unclean shutdown and the library rebuild

This is the one start-up behaviour owners notice: after a hard power cut the player shows "Library / Updating
Library…" before the main menu; after a normal power-off it does not.

```
normal power-off (menu, Power held 2 s, low battery, timers)
   └─► settings saved with clean-shutdown mark = 0x55aa ─► power down
next boot: mark == 0x55aa ─► library NOT dirty ─► main menu directly
            (the mark is cleared and saved again at once)

hard power cut (Power held ~8 s: external reset), crash, battery pulled
   └─► mark still cleared from the last boot
next boot: mark != 0x55aa ─► library dirty ─► main menu ─► task 13 "Updating Library…" ─► main menu
```

| Observation | Explanation | Tag |
|---|---|---|
| Holding Power while the player is on shows the goodbye screen, then the player starts again | the firmware's own power-key path: held > 200 ticks (2 s) → power-off request, settings saved with the clean mark; the key is still held when power drops, which presumably powers the board up again [?] | [AP30], device |
| Holding Power through that restart cuts power without the goodbye screen, then boots | an external hardware long-press reset after about 8 s, independent of the firmware | measured on a device |
| After the hard cut the boot shows "Updating Library…" | the clean mark was not written, so the boot sets the library-dirty flag | [AP30] + device |
| The library screen lasted about 480 ms on the test unit | a small library; the time grows with the number of files (reviewers report 40 s to 10 min for large cards) | measured on a device (video frame count), [WEB] reviews |
| A normal boot shows no library screen | the clean mark was 0x55aa | [AP30] |

The mark is written by the power-off path (with the "clean" value) and cleared both at every boot and at the end of
every library rebuild [AP30]. Other things that set the library-dirty flag: a disk format, a USB File Transfer session
in which the host wrote, file deletion in the browser, a failed update, a disk change seen by the library menu, and a
missing microSD card at boot when the card was the last disk ([storage_and_filesystems.md](storage_and_filesystems.md#rebuild-triggers)).

The long-press reset itself is described in [../hardware/power.md](../hardware/power.md).

## Core B at start-up

Core B is **not** started during boot. The init writes a reset state that gates core B's bus clock and all clocks of
its power domain and holds core B in reset [AP30]. Core B is powered and started only when the music player (or BT
Music) starts a track; see [core_b_codecs.md](core_b_codecs.md#starting-and-stopping-core-b).

## Open questions

- Why the firmware uses a trampoline and a second vector table instead of starting from the boot table directly [?].
- Who writes the `FWUP` tag in the boot area (a factory or PC tool?) [?].
- Whether the boot-time power-key check in overlay 1 (it reads the RAM reboot flag at 0x0309fff0) is called at all in
  V1.7.8; no caller was found [?].
- Whether the boot battery threshold (3299 mV) and the low-battery threshold (3450 mV) differ between releases.

## Sources

- [AP30] analysis of firmware V1.7.8 (boot table, trampoline, main init, overlay 1, main menu, library-build task).
- Measured on a device: power-key behaviour, the 8 s hard reset, the library screen duration (~480 ms from a phone
  video).
- [WEB] library scan times from reviews, collected in [../community/user_feedback.md](../community/user_feedback.md).
- [EM] the loader's boot markers were first documented in the Echo Mini study
  [berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw) `ETUDE.md` and then confirmed in the
  AP30 loader.
