# The Hidizs AP30 "Music Boy"

Status: draft, 2026-11

The Hidizs AP30 "Music Boy" is a small, handheld-console-shaped digital audio player sold by Hidizs from mid-2026.
Inside it is a Rockchip **RKNanoD-G** microcontroller (two Cortex-M3 cores, 1 MB of on-chip RAM, no Linux), a
Cirrus Logic **CS43198** DAC, a Richtek **RT6863** headphone amplifier, a separate **Realtek ALC5686** chip that
handles the USB DAC mode, and a **JieLi** Bluetooth chip. Its firmware ("HidizsOS") is built on Rockchip's bare-metal
RKnano SDK and shares its code base with the Snowsky (FiiO) Echo Mini. This page lists the product facts, the
versions sold, the chips (with one line each and a link to the detailed page), the launch timeline, the official
update method, and the odd `RKNANOC` identity the player reports over USB.

## Contents

- [Specifications](#specifications)
- [Editions, colours and materials](#editions-colours-and-materials)
- [In the box](#in-the-box)
- [Chips on the board](#chips-on-the-board)
- [Controls](#controls)
- [Storage](#storage)
- [USB identities](#usb-identities)
- [The RKNANOC identity quirk](#the-rknanoc-identity-quirk)
- [Timeline](#timeline)
- [Official firmware update method](#official-firmware-update-method)
- [What the AP30 is not](#what-the-ap30-is-not)
- [Open questions](#open-questions)
- [Sources](#sources)

## Specifications

Vendor figures come from the Hidizs spec sheet as quoted on the Head-Fi showcase and in reviews [WEB]. Where our own
analysis or a measurement adds to or corrects a figure, the right-hand column says so.

| Item | Vendor value [WEB] | What we know beyond the spec sheet |
|---|---|---|
| SoC | "RKNONOD" (sic) master chip | Rockchip **RKNanoD-G**, LFBGA121 package, dual Cortex-M3 [AP30, chip marking + firmware]. Details: [../hardware/soc_rknanod.md](../hardware/soc_rknanod.md) |
| DAC | Cirrus Logic CS43198 (one chip) | on I2C, 8-bit address 0x66, fed by I2S1 [AP30]. [../hardware/audio_dac_cs43198.md](../hardware/audio_dac_cs43198.md) |
| Amplifier | Richtek RT6863, "true balanced" | QFN next to the jacks [AP30, chip marking]; no public datasheet found. [../hardware/audio_amp_rt6863.md](../hardware/audio_amp_rt6863.md) |
| Outputs | 3.5 mm single-ended 61 mW + 61 mW @ 32 Ω; 4.4 mm balanced 137 mW + 137 mW @ 32 Ω | two jacks on the bottom edge; the firmware polls two headphone-detect pins [AP30] |
| Gain | High / Low | |
| Digital filters | 5 (fast / slow roll-off, minimum / linear phase, NOS) | set through the DAC's filter register [AP30] |
| EQ | 6 presets + custom 5-band (60 Hz, 300 Hz, 1 kHz, 3 kHz, 6 kHz; ±6 dB) | software EQ on the system core, not in the DAC [AP30]. Preset names in the V1.7.8 English strings: Normal, Bass, Metal, Pop, Jazz, Unique [AP30] |
| Formats | DSF / DFF (DSD64/128/256), WAV and FLAC up to 24-bit/192 kHz, ALAC, APE (24/96), WMA, MP3, OGG, M4A (AAC) | ten decoder modules run on the second core [AP30]. DSD is **converted to 44.1 kHz PCM** on the device; there is no native DSD or DoP output [AP30]. [../firmware/core_b_codecs.md](../firmware/core_b_codecs.md) |
| "S/PDIF DoP" | listed as "supported (USB Audio + local playback)" | no S/PDIF output and no DoP path found in the firmware [AP30]; the claim is unexplained [?] |
| Screen | 2.0" IPS, 296 × 240, not touch | MCU (8080-style) panel driven by the SoC's VOP; controller looks like a Jadard JD9853-class part [?]. [../hardware/display.md](../hardware/display.md) |
| Bluetooth | 5.3, transmit only, SBC | separate JieLi chip on a UART [AP30]; no receive (sink) mode in the firmware [AP30]. [../hardware/bluetooth.md](../hardware/bluetooth.md) |
| USB | USB-C 2.0: file transfer, USB DAC | USB DAC mode is a separate Realtek chip, reported limited to 24-bit/48 kHz [WEB]. [../hardware/usb.md](../hardware/usb.md) |
| Storage | microSD up to 256 GB, small internal memory | ~216 MiB user volume on the internal flash [AP30, measured]; a 512 GB card is reported to work [WEB]. See [Storage](#storage) |
| Battery | 1200 mAh, 3.8 V (4.56 Wh) Li-po | soldered, no connector [AP30, opened unit]. [../hardware/power.md](../hardware/power.md) |
| Charging | 5 V 2 A | "about 1 h" (several reviews); 3-4 h from a PC USB-A port (one review) [WEB] |
| Battery life | (vendor: wireless 6-8 h; standby 60 days) | reviewers measured 9.6-11.2 h on 3.5 mm and 7.4-9 h on 4.4 mm, 7+ h on Bluetooth [WEB] |
| Weight | plastic ≈ 56 g, aluminium ≈ 80 g | one reviewer weighed a plastic unit at ≈ 55 g [WEB] |
| Box | 102 × 92 × 42 mm | [WEB] |
| OS | "HidizsOS" (some reviews and spec lists say "Linux") | **not Linux**: a bare-metal Rockchip RKnano SDK firmware with a cooperative task model and code overlays [AP30]. [../firmware/architecture.md](../firmware/architecture.md) |
| Extras | e-book reader (TXT), games, file browser, A-B repeat | 29 games in the menu in V1.7.8, plus 4 hidden ones [AP30]. [../firmware/games.md](../firmware/games.md) |

## Editions, colours and materials

Two editions with the same electronics [WEB]:

| Edition | Colours | Build | Weight | Kickstarter price | MSRP | Retail at review time |
|---|---|---|---|---|---|---|
| Plastic ("lightweight") | **Classic White**, **Shadow Black** (transparent black), **Crystal Ocean Blue** (transparent blue) | semi-transparent plastic shells; the battery label shows through the clear ones | ≈ 56 g | $85 (pledges reported from $75) | $119 | $92 |
| Aluminium ("premium", CNC) | **Arcade Black** (opaque black, orange D-pad), **Pixel Purple** | almost all aluminium, high-gloss tempered-glass back panel | ≈ 80 g | $99 | $129 | $99 |

* The back carries a **whale engraving**, described by Hidizs as an "ocean-inspired design connected to WDC" [WEB].
  On the transparent black plastic unit it is printed in colour; on the purple aluminium unit it is a white outline
  [WEB].
* The inside of the back cover is laser-etched "AP30 Music Boy" / "High Resolution Portable Music Player" [AP30,
  opened unit].
* No regulatory ID is printed on the box or the device. The box shows CCC, CE, FC, the Japanese Giteki mark, IC and
  RoHS marks [WEB, box photo]. The AP30 has **no certification filing of its own**: it only appears as a "listed
  model" in Hidizs's AP80 PRO MAX filings (FCC ID 2A7ZP-AP80PROMAX, ISED 35096-AP80PROMAX, Japan Giteki 222-260312),
  whose test reports and photos show a different, Wi-Fi-capable AP80 PRO MAX board [WEB]. Details:
  [../hardware/board_ap30.md](../hardware/board_ap30.md).

## In the box

From several reviews [WEB]:

* the player, a screen protector and a back-panel protector (two of each in some boxes);
* a rigid snap-on plastic case with a lanyard hole and a magnet;
* two magnetic rings (one for the back of a phone, one for the case: "Magnetic Phone Case Snap");
* a USB-C to USB-C short OTG cable (for phone use) and a USB-A to USB-C cable (PC, charging);
* manual, warranty and QC cards.

The short C-to-C cable is **directional**: the end with the printed text must go into the phone. The wrong way round
the player only charges and shows no USB prompt (Hidizs statement quoted by a reviewer) [WEB]. Kickstarter bundles
added a purple leather carry box, a knitted case and a lanyard [WEB].

## Chips on the board

One line per chip; the full board description (pin assignment, power tree, test pads, markings) is in
[../hardware/board_ap30.md](../hardware/board_ap30.md). Markings were read on an opened retail unit [AP30].

| Part | Role | Notes | Page |
|---|---|---|---|
| **Rockchip RKNanoD-G** (LFBGA121) | main SoC: two Cortex-M3 cores (system core A, calculation core B), 1 MB SRAM, VOP display controller, USB 2.0 OTG, SD/eMMC hosts, I2S, I2C, UART, SAR-ADC | marking "RKNANOD-G" [AP30] | [../hardware/soc_rknanod.md](../hardware/soc_rknanod.md) |
| **Cirrus Logic CS43198** (QFN-40) | stereo DAC | I2C address 0x66, I2S1 audio [AP30] | [../hardware/audio_dac_cs43198.md](../hardware/audio_dac_cs43198.md) |
| **Richtek RT6863** (QFN, marked "6863D") | headphone amplifier | next to the jacks; function from the spec sheet [AP30 + WEB] | [../hardware/audio_amp_rt6863.md](../hardware/audio_amp_rt6863.md) |
| **Realtek ALC5686** (QFN-48) | USB audio chip for USB DAC mode, enumerates as `0bda:4a35` "AP30" | runs its own firmware; the RKNanoD hands the USB port and audio over to it with GPIOs [AP30] | [../hardware/usb.md](../hardware/usb.md) |
| **JieLi** Bluetooth SoC (QFN-32, JL logo, marking `…-56C4`, probably AC6956C4 [?]) | Bluetooth 5.3 transmitter, SBC | own 24 MHz crystal, coax to an FPC antenna on the back cover; UART link to the RKNanoD [AP30] | [../hardware/bluetooth.md](../hardware/bluetooth.md) |
| **AnalogTek AT85163S** (MSOP-8) | real-time clock | PCF8563-compatible at I2C address 0xA2, 32.768 kHz crystal [AP30 + ?] | [../hardware/rtc.md](../hardware/rtc.md) |
| Storage chip, 8-pad LGA, marked "TM3F4GUAI" | internal flash (FW1 / FW2 / settings / user volume) | SD-NAND-style package, ≈ 4 Gbit [?]; vendor not identified; an empty BGA footprint next to it looks like an alternative eMMC site [?] | [../hardware/storage.md](../hardware/storage.md) |
| ALPS rotary encoder | volume wheel | quadrature on two GPIOs; its push switch is probably the Power key [?] | [../hardware/input.md](../hardware/input.md) |
| 2.0" IPS panel, 22-pin FPC "FDT0201B015-V02" | display | no controller marking visible; init sequence known [AP30] | [../hardware/display.md](../hardware/display.md) |
| 1200 mAh Li-po ("923033") | battery | soldered to pads BAT+ / BAT- / NTC, protection PCB on the cell [AP30] | [../hardware/power.md](../hardware/power.md) |
| Crystals | 24.000 MHz (SoC), 24.576 MHz (audio clock), 24.000 MHz (ALC5686), 24.000 MHz (JieLi), 32.768 kHz (RTC, by position [?]) | [AP30] | [../hardware/board_ap30.md](../hardware/board_ap30.md) |
| Discrete power parts | regulators, a likely charger / DC-DC ("DP1"), LDOs, a "7227"-family analog switch | **no dedicated PMIC** [AP30]; most parts not identified [?] | [../hardware/power.md](../hardware/power.md) |

Not on the board: no FM tuner, no Wi-Fi, no dedicated PMIC [AP30]. The main board carries the silk names
"HT9102_V2.1" (front) and "HDS_YXJ_20260420_V2.1" (back) [AP30].

## Controls

* **Buttons:** D-pad, A, B, Function, Play, Power, plus the ALPS volume wheel [WEB]. On the board there are eight
  tact switches, read through one ADC resistor ladder (D-pad ×4, A, B, and the two small "Select"/"Start" buttons the
  spec calls Function and Play) [AP30]. Only one ladder key can be read at a time [WEB, community measurement].
* **Power:** reviewers say pressing and holding the wheel is the power key [WEB]; the board has no separate edge
  switch [AP30]. Holding Power for about **8 s** forces a hardware power cut and restart, whatever the firmware is
  doing [AP30, measured].
* **Volume:** 100 steps with an arc overlay [WEB]; the wheel does nothing in USB DAC mode [WEB, explained by the
  hardware: the wheel is wired to the RKNanoD, not to the Realtek chip].
* Key mapping changed between firmware builds (for example a "Screen-Off Button Settings" option arrived in summer
  2026) [WEB + AP30]. Details: [../hardware/input.md](../hardware/input.md),
  [../firmware/display_and_input.md](../firmware/display_and_input.md).

## Storage

* **Internal flash** ≈ 480 MiB raw, split into a hidden boot loader area, two 28 MiB firmware slots (FW1, FW2), a
  settings area, some data areas, and a **216 MiB FAT32 user volume** [AP30, measured from a full read-out].
  Reviewers see "about 210 MB" of internal storage [WEB]. Layout:
  [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md).
* **microSD:** marketed up to 256 GB [WEB]. The firmware does not refuse larger cards; the real limit is the media
  library: at most **7,168 song records** and 28,672 files + folders per scan [AP30]. At typical CD-FLAC sizes that
  is about 250 GB, which is probably where "256 GB" comes from [?]. Details:
  [../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md).

## USB identities

| Mode | VID:PID | Identity | Page |
|---|---|---|---|
| File Transfer (mass storage, RKNanoD) | `071b:3203` | high-speed; SCSI INQUIRY vendor "HIFI MP3", product "USB MP3" (LUN 0, internal) / "SD" (LUN 1), revision "1.00" [AP30, device] | [../firmware/usb_modes.md](../firmware/usb_modes.md) |
| USB DAC (Realtek ALC5686) | `0bda:4a35` | high-speed; manufacturer "Realtek", product "AP30"; audio interface + HID interface [AP30, device] | [../hardware/usb.md](../hardware/usb.md) |
| Loader USB mode (Rockusb, boot loader) | `2207:262d` | entered with D-pad Right + Power with USB connected, or by a vendor SCSI command [AP30, device] | [../guides/recovery.md](../guides/recovery.md) |

When the player is plugged into a host while powered, it asks "USB Audio" or "File Transfer". In V1.7.8 the menu
times out after 60 s to the current choice (default: file transfer) [AP30]; reviewers on earlier builds saw it
disappear after about 3 s [WEB].

## The RKNANOC identity quirk

The player says it is an **RKNanoC** in one place, although it is an RKNanoD:

* The Rockchip vendor SCSI command that asks for a chip/product ID (sent to the player while it is a USB disk)
  answers **`RKNANOC`** [AP30, device].
* Everything else says RKNanoD: the chip marking "RKNANOD-G" [AP30]; the firmware uses two cores, 1 MB of RAM laid
  out exactly as the RKNanoD manual describes, six UARTs, three I2C and two I2S blocks, and every peripheral base
  address and interrupt number matches the RKNanoD manual [AP30 + TRM]. The RKNanoC has one core, 224 KB of RAM and
  one UART / I2C / I2S [DS RKNanoC V1.7].
* So the string is a leftover product ID from the older SDK generation (the RKNanoC datasheet dates from 2012-2013)
  [AP30 + ?]. The boot loader's own chip tag is "C262" (Rockusb chip info) [AP30]; that it relates to the loader's USB PID
  `262d` is a guess [?].
* The Hidizs spec sheet spells the chip "RKNONOD"; a Head-Fi commenter identified it as the RKNanoD before launch
  [WEB].

More on the two chips: [../related/rockchip_rknano_family.md](../related/rockchip_rknano_family.md).

## Timeline

| Date | Event | Tag |
|---|---|---|
| 2025-12-22/23 | The name "AP30" appears in the "listed models" of Hidizs's AP80 PRO MAX FCC filing (grant 2025-12-23); the tested device is an AP80 PRO MAX | [WEB] |
| 2026-03-09 | Japan Giteki record 222-260312 lists AP30 in the AP80 PRO MAX family | [WEB] |
| 2026-04-20 | design date in the AP30 main-board silk ("HDS_YXJ_20260420_V2.1") [?: reading of the silk as a date] | [AP30] |
| 2026-06-19 | Head-Fi showcase page created, with the vendor's product highlights and Kickstarter images | [WEB] |
| 2026-06-25 | first public identification of the SoC as an RKNanoD (Head-Fi comment) | [WEB] |
| July 2026 | early review units; reviewers report UI firmware version "1.2.9" | [WEB] |
| **2026-07-23** | **Kickstarter campaign starts**; the oldest known firmware file, `HIFIYF26.IMG`, carries this exact header date | [WEB] + [AP30] |
| 2026-07-27 | instructions for `HIFIYF26.IMG` dated in its public Drive folder (DSD256, Favorites, Screen-Off Button setting, A/B fixes) | [WEB] |
| August 2026 | reviewers report UI firmware version "1.3.5" (screen-off button controls, A/B fix) | [WEB] |
| 2026-08-17 | Kickstarter campaign ends | [WEB] |
| **2026-08-19** | build date of `HIFIYF05.IMG` ("11-Game Firmware"), found as the factory firmware on a retail unit; the firmware also resets an invalid clock to 2026-08-19 09:00 | [AP30] |
| Sep 2026 | `HIFIYF05.IMG` published on the Hidizs Download Center (Drive date "Sep 28"; year not shown) | [WEB] |
| **2026-10-19** | build date of `HIFIYF18.IMG` = **V1.7.8** (29 games, playback stutter and Custom EQ fixes); Drive date "Oct 18", instructions "Oct 27" | [AP30] + [WEB] |
| Nov 2026 | retail reviews continue; no newer firmware known at the time of writing | [WEB] |

Firmware details per release: [firmware_releases.md](firmware_releases.md).

## Official firmware update method

Hidizs's instructions [WEB]: copy the update file (for V1.7.8: `HIFIYF18.IMG`) to the **root of the internal
storage**, eject, restart the player; it updates by itself.

What the firmware actually does [AP30]:

* At every boot it looks for `ECHOMINI.IMG` first, then for `HIFIYF00.IMG` … `HIFIYF89.IMG`. Any of these names
  starts an update; the number does not need to match anything.
* It checks only the image's magic and that the header matches its own copy further in the file. **No checksum
  check, no version or date check**: older images install too (downgrade proven on a device).
* It writes the second firmware slot (FW2) first, header last, then copies FW2 over FW1 the same way, then deletes the
  file. A power cut leaves at most one slot without a valid header.
* The boot loader is never touched by updates.

Reports: one reviewer needed several tries and an on-device format before the update took; a community project
reports updates that only worked after formatting internal storage right before copying [WEB]. The cause is not
known; a file-read failure on the volume is the most likely explanation [?].

Full description: [../firmware/update_process.md](../firmware/update_process.md); safe procedures, downgrade and
custom images: [../guides/installing_firmware.md](../guides/installing_firmware.md); recovery if an update or a
custom image goes wrong: [../guides/recovery.md](../guides/recovery.md).

> **Warning**
> Only copy official images (or images you built and checked yourself) to the player. If a custom image does not
> boot, hold **D-pad Right + Power** with USB connected to reach loader USB mode and restore an official image
> ([../guides/recovery.md](../guides/recovery.md)). Never write the hidden boot area (physical sectors 0..0x1FFF),
> never run `rkdeveloptool ef`, and never download a random loader (`db` / `ul`) to the player.

## What the AP30 is not

* **Not Linux, not Android.** The firmware is a bare-metal RKnano SDK program running from on-chip RAM [AP30].
* **Not a Bluetooth receiver.** One early impression said so; the firmware has only a transmit screen ("BT Music")
  [AP30, WEB].
* **Not a USB host.** It cannot drive an external USB DAC; the RKNanoD USB stack runs in device mode only [AP30].
* **Not the same board as the AP80 PRO MAX**, despite the regulatory "listed model" statement [AP30 + WEB].

## Open questions

* Which internal version numbers ("1.2.9", "1.3.5") correspond to which firmware files; the update files carry
  header versions 0.0.0 / 5.0.0 / 8.0.0 instead [?].
* The exact storage chip and its vendor; earlier notes called the internal flash a Samsung eMMC, while the chip on the
  opened unit is an 8-pad LGA package with a non-Samsung marking [?].
* Whether the Power key is a push switch inside the volume wheel [?].
* The RT6863's exact role and pins (no public datasheet), and how the balanced output is built [?].
* What the "S/PDIF DoP" line in the spec sheet refers to [?].
* The LCD controller part number [?].

## Sources

* [AP30] analysis of the firmware images V1.7.8 (`HIFIYF18.IMG`), 5.0.0 (`HIFIYF05.IMG`) and 0.0.0 (`HIFIYF26.IMG`);
  measurements on a retail device; chip markings read on an opened retail unit.
* [TRM] Rockchip RKNanoD TRM V1.0; [DS] RKNanoD datasheet V1.8, RKNanoC datasheet V1.7 (links in
  [sources.md](sources.md)).
* [WEB] [Head-Fi AP30 showcase](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/) (spec text, comments);
  reviews by Moonstar Reviews ([link](https://moonstarreviews.net/hidizs-ap30-music-boy-review/)), Chris Love
  ([link](https://mobileaudiophile.com/daps/hidizs-ap30-music-boy-review/)), Pietro
  ([link](https://mobileaudiophile.com/daps/hidizs-ap30-high-res-music-player-review-pietros-take/)), QuietlyAmused
  ([link](https://mobileaudiophile.com/daps/hidizs-ap30-musicboy-review-you-win-little-you-lose-some-more/)), jreqtech
  ([link](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44027/)), ChifiLab
  ([link](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44230/)), Ichos
  ([link](https://ichos-reviews.com/hidizs-ap30-review/)) and others listed in
  [../community/user_feedback.md](../community/user_feedback.md).
* [WEB] [Hidizs Kickstarter launch post](https://www.hidizs.net/blogs/news/ap30-music-boy-kickstarter-launch-wearable-hi-res-music-player),
  [Kicktraq](https://www.kicktraq.com/projects/hidizs/ap30-music-boy-the-first-truly-wearable-hi-res-music-player/),
  [GDM](https://www.gdm.or.jp/crew/2026/0805/646849); [Hidizs Download Center](https://www.hidizs.net/pages/download-center).
* [WEB] Regulatory: [FCC ID 2A7ZP-AP80PROMAX](https://fccid.io/2A7ZP-AP80PROMAX),
  [Giteki 222-260312](https://fccid.io/giteki/222-260312),
  [ISED REL search](https://sms-sgs.ic.gc.ca/equipmentSearch/searchRadioEquipments?&lang=en).
* [WEB] Community: [nkahoang/hidizs-ap30-game-emu](https://github.com/nkahoang/hidizs-ap30-game-emu) (key ladder,
  update reports).
