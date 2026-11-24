# USB: USB-C, RKNanoD OTG, Realtek USB-audio chip

Status: draft, 2026-11

The AP30's USB-C port serves two different chips. The RKNanoD's own **USB 2.0 OTG controller** handles file transfer
(mass storage, `071b:3203`), the boot loader's **recovery mode** (`2207:262d`) and charger detection. **USB DAC mode
is not the RKNanoD at all:** a separate **Realtek ALC5686** USB-audio chip (`0bda:4a35`) takes over the USB data lines
through an analog switch selected by GPIO0_14, while the RKNanoD keeps running the screen and steps out of the audio
path. That split explains three user complaints: the wheel does nothing in DAC mode, DAC mode does not charge, and
DAC mode is limited to 24-bit / 48 kHz. This page covers the hardware side; the stock firmware's USB modes are in
[../firmware/usb_modes.md](../firmware/usb_modes.md).

Tags: **[AP30]** firmware V1.7.8 or the device · **[TRM]** RKNanoD TRM V1.0 · **[DS]** a datasheet · **[EM]** Echo
Mini · **[WEB]** public source · **[?]** guess.

## Contents

- [Summary](#summary)
- [Connector and switch](#connector-and-switch)
- [RKNanoD USB OTG controller](#rknanod-usb-otg-controller)
- [USB host: what the SoC can do, what the board does](#usb-host-what-the-soc-can-do-what-the-board-does)
- [The Realtek ALC5686 (USB DAC mode)](#the-realtek-alc5686-usb-dac-mode)
- [GPIO hand-over between RKNanoD and Realtek](#gpio-hand-over-between-rknanod-and-realtek)
- [Charging and USB](#charging-and-usb)
- [USB identities](#usb-identities)
- [UART over the USB pins](#uart-over-the-usb-pins)
- [Open questions](#open-questions)
- [Sources](#sources)

## Summary

| Item | Value | Tag |
|---|---|---|
| Connector | USB-C, 16-pin SMD receptacle on board side B, between the two jacks | [AP30] |
| Speed | USB 2.0 high-speed (both chips) | [AP30] measured |
| Data switch | DPDT analog switch, 10-lead leadless part marked `7227` [?]; select = GPIO0_14: 1 = RKNanoD, 0 = Realtek | [AP30], part / wiring [?] |
| RKNanoD role | device only in the stock firmware: mass storage, loader recovery mode, charger detection | [AP30] |
| USB DAC mode | Realtek ALC5686, own crystal and firmware, UAC + HID, max 24-bit / 48 kHz | [AP30] + [WEB] |
| VBUS sense | GRF register 0x50010000 + 0xE8 bit 1 (`utmisrp_bvalid`), used by loader and firmware | [AP30 + TRM] |
| USB host | supported by the SoC (4 channels, one root port), never used; board support unknown | [TRM] + [AP30] + [?] |

## Connector and switch

```
                 USB-C ─── VBUS ──────────────────────────► charger, regulator enable (diode-OR), VBUS sense (GRF)
                   │
                   └── D+ / D- ──► "7227" DPDT switch [?] ──┬── side 1 ──► RKNanoD USB PHY  (GPIO0_14 = 1, default)
                                   select = GPIO0_14 [?]     └── side 2 ──► Realtek ALC5686  (GPIO0_14 = 0, DAC mode)
                                   ("mBJ3H" SOT-23-6 next to the connector: ESD array or switch [?])
```

- The `7227` marking and its 10-lead package match the 7227 family of DPDT analog / USB 2.0 switches (WillSemi
  WAS7227Q, Full-Way FSW7227) [?, marking lookup]. It sits between the 24.576 MHz crystal and the SoC on side A
  [AP30]. Whether it switches the USB pair, or I2S / clock lines between the RKNanoD and the ALC5686, is not traced
  [?].
- Every firmware use of GPIO0_14 fits "1 = USB to the RKNanoD, 0 = USB to the Realtek": 1 at boot and in File
  Transfer, 0 in USB DAC mode [AP30].
- The Rockchip reference board switches its USB pair between a device and a host port with an FSUSB30 analog switch
  selected by a `DEV_HOST` line [WEB] EVK; the AP30 reuses the idea for the Realtek hand-over [?].
- USB-C CC configuration (sink resistors, any PD / fast-charge controller) is not known [?]. Reviewers charge it
  from both USB-C and USB-A chargers [WEB].

## RKNanoD USB OTG controller

[TRM ch. 14 unless tagged]

| Item | Value |
|---|---|
| Standard | USB 2.0 OTG, high-speed / full-speed (low-speed in host mode); UTMI+ level 3 PHY (16-bit) |
| Base / IRQ | `0x60080000`, IRQ 5 (vector 0x15) [AP30] |
| IP | DesignWare HS OTG (DWC2) register layout [AP30] |
| Device mode | EP0 + 3 endpoints, of which one periodic IN endpoint ≤ 64 bytes |
| Host mode | 4 channels, one root port; no HNP / SRP |
| FIFO | 308 × 35 bits in total |
| DMA | the TRM says both "AHB slave only, no internal DMA" and "internal DMA logic"; the stock driver copies FIFOs by CPU [AP30] |
| PHY control | GRF `USBPHY_CON0-11` (0x80-0xAC), `UOC_CON0-2` (0xB0-0xB8; CON2 holds VBUS charge / discharge enables), status `SOC_USB_STATUS` (0xE8) |
| VBUS status bits | bit 0 `utmiotg_vbusvalid`, **bit 1 `utmisrp_bvalid`** (used as "USB power present"), bit 2 `utmiotg_avalid`, bit 3 `utmisrp_sessend` |
| Resets | CRU soft reset ids 0x01 (usbphy), 0x02 (usbglb) [AP30 ids, TRM names] |
| MaskROM | the boot ROM's USB-boot entry pointer is at ROM address 0x8C; jumping there gives MaskROM Rockusb [AP30, EM] |

Endpoint budget: mass storage (bulk IN + OUT) leaves one endpoint; USB audio with feedback plus HID, or a composite
MSC + audio device, does not fit in 3 endpoints [TRM, ?]. Register-level notes:
[soc_peripherals.md](soc_peripherals.md).

## USB host: what the SoC can do, what the board does

- **SoC:** host mode exists (4 channels, one root port, low/full/high speed) [TRM ch. 14].
- **Firmware:** the stock USB stack (overlays 9-12) is device-only; no host driver exists in the image [AP30].
  Reviewers confirm the AP30 cannot drive an external DAC dongle [WEB].
- **Board (open question):** host mode would need the player to *source* 5 V on VBUS and present a USB-C source
  (Rp) on CC. No 5 V boost converter or VBUS switch has been identified on the board, and the CC wiring is unknown
  [AP30 + ?]. The `7227` switch would also have to point at the RKNanoD. Until the power path is traced, USB host is
  "SoC-capable, board unknown".

## The Realtek ALC5686 (USB DAC mode)

| Item | Value | Tag |
|---|---|---|
| Part | Realtek ALC5686, QFN-48, board side A lower left, own 24.000 MHz crystal | [AP30] marking |
| Enumeration | `0bda:4a35`, high-speed, bcdDevice 0.02, Manufacturer "Realtek", Product "AP30", a serial string built from VID, PID and a date-like number (probably the same on every unit [?]) | [AP30] measured on a device |
| Interfaces | USB audio (interface 2 shows a descriptor quirk in the Linux log: "no altsetting 3/6") + **HID** (interface 3, HID 1.11, probably media / volume keys [?]) | [AP30] measured |
| Firmware | its own: no Realtek string, address or `0bda:4a35` anywhere in the RKNanoD image. The ALC5686 is documented with embedded flash and a FLASH_CS pin | [AP30] + [WEB] Igor's Lab |
| Rate limit | 24-bit / 48 kHz (reviewers); set by the ALC5686 and its firmware, which the RKNanoD firmware cannot change | [WEB] + [AP30] |
| Audio output path | the ALC5686 has its own DAC and headphone driver (product class); in DAC mode the analog output may come from it through a switch, or it may feed the CS43198 over I2S. Not traced. The firmware does not run the CS43198 init on entering DAC mode | [WEB] + [AP30] + [?] |
| Volume | from the host only; the wheel does nothing (see below) | [WEB] + [AP30] |
| Power | runs from the player's battery; no charging in this mode | [WEB] + [AP30] |

The RKNanoD's own USB-audio class (overlay 11: UAC1 48 kHz / 16-bit + HID, feeding I2S1 → CS43198) is present in
the image but **never selected** on the AP30; the Echo Mini uses that path as its USB DAC [AP30, EM].

## GPIO hand-over between RKNanoD and Realtek

Entering USB DAC mode, in this order [AP30]:

| Step | Pin | Value | Meaning (role [?] unless noted) |
|---|---|---|---|
| 1 | — | DAC-mode flag set | firmware state |
| 2 | GPIO1_4 | 1 | audio-path enable (also set by local playback) |
| 3 | GPIO0_14 | 0 | USB data lines to the Realtek |
| 4 | GPIO2_1 | 0 | unmute |
| 5 | GPIO1_0 | switched from I2S1A MCLK to GPIO, driven low; "suppress charging" flag set, so it is not raised and "full" is never reported | charge control [?] |
| 6 | — | the RKNanoD's own USB stack is **not** started | |
| 7 | GPIO0_12 | 1, 0.5 s later | Realtek enable / reset, output source select, or charge-current select [?] |

Leaving DAC mode reverses it: GPIO1_4 = 0, GPIO0_14 = 1, GPIO2_1 = 1, GPIO0_12 = 0, then GPIO1_0 = 1 if VBUS is
still present (charging back on); the key-timer interrupt is re-registered [AP30].

While the Realtek is active the RKNanoD keeps its UI (DAC-mode screen, clock, battery icon, a volume picture from the
stored volume), the backlight, the Power key and the key lock, but it is **not in the audio data path** [AP30].
Rule for own firmware: never drive I2S1 from the RKNanoD while GPIO0_14 = 0 [?].

**Why the wheel is dead in DAC mode:** the key handler forwards direction keys only while the RKNanoD's own
USB-audio class is selected, which never happens on the AP30, and there is no control channel from the RKNanoD to the
ALC5686 (no Realtek command, address or string in the image). Wheel events have nowhere to go [AP30].

## Charging and USB

| Situation | Behaviour | Tag |
|---|---|---|
| VBUS appears, player off | the board powers up (VBUS is in the regulator enable's diode-OR) and boots into the charge screen | [AP30] |
| VBUS appears, player on | VBUS must be stable 0.5 s; the controller then waits up to 3 s for host activity. Host seen → USB mode menu (File Transfer default, or USB audio). No host → charger only: charging starts, no USB function | [AP30] |
| File Transfer | mass storage; charging stays on | [AP30] |
| USB DAC mode | **no charging**: the firmware deliberately keeps the charge line (GPIO1_0) low; Hidizs support confirmed "DAC mode and USB charging mode are separate". The player runs from its battery | [AP30] + [WEB] |
| Power-off with VBUS present | impossible (VBUS holds the regulators on); the firmware shows the charge screen instead | [AP30] |
| Charge time | about 1 h on a fast charger, 3-4 h from a PC USB-A port (reviewers) | [WEB] |

Why charging is off in DAC mode (current budget, ground loops, a charger / switch conflict) is not known [?]. The
charger hardware: [power.md](power.md#charging).

## USB identities

| Mode | VID:PID | Strings / answers | Tag |
|---|---|---|---|
| Stock firmware, File Transfer | **`071b:3203`** ("Rockchip Media Player" in USB ID databases), high-speed | SCSI INQUIRY vendor `HIFI MP3`, product `USB MP3` (LUN 0, internal user volume) / `SD` (LUN 1, microSD), revision `1.00`; Rockchip vendor command `id` answers `RKNANOC` (a leftover product ID from the older chip generation) | [AP30] measured |
| Boot loader recovery ("loader USB mode", Rockusb) | **`2207:262d`**, high-speed | READ_CHIP_INFO "C262", READ_FLASH_ID "EMMC" | [AP30] measured |
| USB DAC mode | **`0bda:4a35`**, high-speed | Manufacturer "Realtek", Product "AP30"; audio + HID | [AP30] measured |
| MaskROM (not reached on the AP30 so far) | Rockchip MaskROM Rockusb | — | [?] |

- Every boot with USB power present shows a ~2 s full-speed enumeration burst (Linux error −71) before the real
  device appears; ignore it [AP30 measured].
- The stock firmware reboots into loader USB mode or MaskROM on Rockchip vendor SCSI commands (CDB `FF E0 FF FF FF
  FE 00 01` / `… 00 00`) [AP30]: [../firmware/usb_modes.md](../firmware/usb_modes.md). The loader's Rockusb commands
  and the recovery procedure: [../firmware/boot_loader.md](../firmware/boot_loader.md),
  [../guides/recovery.md](../guides/recovery.md).

> **Warning:** loader USB mode (`2207:262d`) allows raw writes to the internal flash. Never write physical sectors
> 0x0000-0x1FFF (the boot loader, i.e. the recovery path), never run `rkdeveloptool ef`, never download a foreign
> loader (`db` / `ul`). Host-side: turn off USB autosuspend and keep reads to ≤ 16 sectors per command. Recovery
> procedure: [../guides/recovery.md](../guides/recovery.md).

## UART over the USB pins

With the PHY in bypass mode the USB pads become UART0 ("UART0B"): transmit on D-, receive through the D+ single-ended
line indicator (the TRM labels it inconsistently; check by experiment). To enter: disable OTG (`UOC_CON0` bit 0),
D+ pull-up off, PLL power-down in suspend, PHY suspend, then the bypass-select and bypass-DM-enable bits
(`UOC_CON0` bits 2 and 1) [TRM ch. 14.3]. The stock firmware's UART driver has this route [AP30], but never uses
it. On the AP30 it needs GPIO0_14 = 1 (switch to the RKNanoD) and a USB-C breakout with a 3.3 V adapter; untested
[?]. More on debug access: [board_ap30.md](board_ap30.md#debug-access-jtag-uart-shared-pins).

## Open questions

| Question | How it could be answered |
|---|---|
| `7227` wiring: is GPIO0_14 its select; does it switch the USB pair or I2S / clock lines? | continuity from its pins to USB-C D+/D-, the ALC5686, the SoC USB balls and GPIO0_14 (ball A7) |
| What GPIO1_4 and GPIO0_12 really enable | continuity to the DAC / amp supply enables and the ALC5686 reset pin |
| Who configures the CS43198 in DAC mode; how the ALC5686 reaches the output | logic analyser on the DAC's I2C and I2S pins in DAC mode |
| ALC5686 descriptors: rates, HID usages, volume control | `lsusb -v -d 0bda:4a35`, ALSA capture |
| Why charging is off in DAC mode | measure VBUS current in DAC mode |
| Can the board source VBUS (host mode)? CC configuration? | trace the VBUS power path and the CC pins |
| Is the OTG controller's DMA mode usable? | bare-metal test |

## Sources

- [AP30] analysis of firmware V1.7.8 (USB overlays 9-12: mode menu, mass storage, vendor commands, DAC hand-over;
  VBUS service; board pin setup); board inspection (USB-C, `7227`, ALC5686); USB enumeration logs on a Linux host
  (`071b:3203`, `2207:262d`, `0bda:4a35`).
- [TRM] [RKNanoD TRM V1.0](https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf) ch. 4 (GRF), ch. 14 (USB OTG).
- [WEB] [Igor's Lab: ALC5686](https://www.igorslab.de/ein-umfassender-einblick-in-den-alc5686-soundchip-mit-datenblatt/);
  [rkdeveloptool](https://github.com/rockchip-linux/rkdeveloptool), [Rockusb wiki](https://opensource.rock-chips.com/wiki_Rockusb) ([archived copy](https://web.archive.org/web/20260503124531/https://opensource.rock-chips.com/wiki_Rockusb));
  reviews on DAC-mode limits and charging, e.g. [Moonstar Reviews](https://moonstarreviews.net/hidizs-ap30-music-boy-review/)
  (more in [../community/user_feedback.md](../community/user_feedback.md)); EVK USB switch: RKNanoD EVK schematic in
  public SDK copies.
- [EM] Echo Mini USB DAC through the RKNanoD's own audio class:
  [../related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md).
