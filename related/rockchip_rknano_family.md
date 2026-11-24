# The Rockchip RKNano family

Status: draft, 2026-11

"RKNano" is Rockchip's line of small Cortex-M3 microcontrollers for portable music players. Two chips matter here:
the older single-core **RKNanoC** (datasheet 2012-2013) and the dual-core **RKNanoD** (2015), which is the AP30's SoC.
Both come with Rockchip's bare-metal **RKnano SDK**, and the AP30 firmware is an application of that SDK, which is why
it still calls itself `RKNANOC` over USB. This page compares the two chips, lists the public documents, describes the
SDK lineage in our own words, names other players on the chip, and explains why Rockbox does not run on it.

## Contents

- [RKNanoC vs RKNanoD](#rknanoc-vs-rknanod)
- [RKNanoD packages](#rknanod-packages)
- [Public documents](#public-documents)
- [How we know the AP30 has an RKNanoD](#how-we-know-the-ap30-has-an-rknanod)
- [The RKnano SDK lineage](#the-rknano-sdk-lineage)
- [Boot loader versions](#boot-loader-versions)
- [The family in Rockchip's open-source tools](#the-family-in-rockchips-open-source-tools)
- [Other players on the RKNanoD](#other-players-on-the-rknanod)
- [Rockbox status](#rockbox-status)
- [Open questions](#open-questions)
- [Sources](#sources)

## RKNanoC vs RKNanoD

| Feature | RKNanoC [DS RKNanoC V1.7] | RKNanoD [DS RKNanoD V0.1 / V1.8, TRM] |
|---|---|---|
| Datasheet era | 2012-2013 | 2015 (V0.1) to 2022 (V1.8) |
| CPU | 1 × Cortex-M3, 100 MHz | 2 × Cortex-M3: system core ("core A") and calculation core ("core B") |
| On-chip RAM | 128 KB IRAM + 96 KB DRAM (224 KB) | ≈ 1 MB: core A 320 KiB IRAM + 256 KiB DRAM, core B 128 KiB IRAM + 256 KiB DRAM, 64 KiB PMU SRAM; 16 KiB boot ROM |
| UART / I2C / I2S | 1 / 1 / 1 | 6 / 3 / 2 |
| Other peripherals | — | 2 SPI, SFC (SPI flash), 5 PWM, 2 × 64-bit timers, 3 × 32 GPIO, 8-channel 10-bit SAR-ADC (200 kHz), 2 DMACs (6 + 2 channels), 4-channel mailbox, VOP display controller (RGB565 / YUV420, i8080 MCU interface, up to 400 × 400, E-ink T-CON), USB 2.0 OTG (HS/FS, 6 endpoints), SD/MMC, eMMC (MMC 4.41, 8-bit), internal audio codec (stereo DAC/ADC + headphone amp), MP3 accelerators (IMDCT36, sub-band synthesis); a "HiFi" accelerator for lossless decoders [EM] |
| Clocks | — | one 24 MHz oscillator + one PLL |
| Packages | QFN, LQFP80, TBGA81 | QFN68 (-N), LFBGA121 (-G), LQFP128 (-L) |
| Register manual | none public | TRM V1.0 (427 pages) |

The AP30 uses none of the internal codec: audio goes over I2S to an external CS43198 [AP30].

Maximum core clocks are not settled: Rockchip documents give 200 / 400 MHz (system / calculation core) in one place
and 250 / 500 MHz in another [?: Rockchip SDK and reference-board documents]; nothing was measured on the AP30.

## RKNanoD packages

| Suffix | Package | Notes |
|---|---|---|
| **-N** | QFN68 | fewer GPIOs: six pins the AP30 firmware drives (including the volume-wheel encoder pins) do not exist on it [AP30 + DS] |
| **-G** | LFBGA121 | **the AP30's package**, confirmed by the chip marking "RKNANOD-G" [AP30] |
| -L | LQFP128 | has the same GPIOs as -G [DS V1.8]; Rockchip's SDK treats -L and -G the same and only special-cases -N [?: SDK copies] |

Pin multiplexing per package: [../hardware/board_ap30.md](../hardware/board_ap30.md).

## Public documents

| Document | Version | Link |
|---|---|---|
| RKNanoD TRM | V1.0 (2015) | [rockchip.fr](https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf) |
| RKNanoD datasheet | V0.1 (2015), V1.2, V1.7, V1.8 (2022) | [V0.1](https://rockchip.fr/RKNanoD%20datasheet%20V0.1.pdf), [V1.2](https://rockchip.fr/RKNanoD%20datasheet%20V1.2.pdf), [V1.7](https://rockchip.fr/RKNanoD%20datasheet%20V1.7.pdf), [V1.8](https://rockchip.fr/RKNanoD%20datasheet%20V1.8.pdf) |
| RKNanoC datasheet | V1.7 (2013) | [rockchips.net](https://rockchips.net/wp-content/uploads/2025/08/RKNanoC-datasheet-V1.7.pdf) |

The TRM is the register reference for this collection (tag [TRM]); every peripheral base address and interrupt
number found in the AP30 code matches it [AP30 + TRM]. The datasheets have the pin tables but no register map. Full
list with sizes: [../overview/sources.md](../overview/sources.md).

## How we know the AP30 has an RKNanoD

| Evidence | RKNanoC would show | AP30 shows |
|---|---|---|
| cores | one | a second core started by the firmware: decoders linked for core B at 0x01000000, a CRU reset bit for core B, mailbox interrupts 9-12, clock changes synchronised with core B [AP30] |
| RAM | 224 KB | firmware uses 0x03000000-0x0309F7CC (≈ 638 KB) and HIGHRAM 0x01000000-0x0105FFFF, exactly the RKNanoD layout [AP30 + TRM] |
| UART / I2C / I2S | 1 / 1 / 1 | six UART bases with interrupts 21-26, I2C0-2 with interrupts 29-31, both I2S blocks [AP30] |
| package | QFN / LQFP80 / TBGA81 | GPIOs that exist only on LFBGA121 / LQFP128 [AP30 + DS] |
| marking | — | "RKNANOD-G" [AP30] |

Only one thing says "RKNanoC": the product ID string `RKNANOC` returned by a Rockchip vendor SCSI command. It is a
leftover of the older SDK generation [AP30 + ?]. Details: [../overview/device.md](../overview/device.md#the-rknanoc-identity-quirk).

## The RKnano SDK lineage

Rockchip ships these chips with a C SDK, not an operating system. What the AP30 image shows about it [AP30], with
the public context in brackets:

* **Identity.** The image header names the vendor "Rockchip" and the model "RKnano SDK 1.0". The same header is in
  every Echo Mini image [AP30 + EM]. Only the RECHO community firmware changes it [WEB].
* **Programming model.** Bare metal: no preemptive scheduler. One "task" (screen application) runs at a time; it owns
  windows with service, key, paint, init and deinit callbacks; a 10 ms SysTick drives a software-timer list; a
  message bitmap passes events; audio buffer work runs as a deferred interrupt on PendSV [AP30].
  [../firmware/architecture.md](../firmware/architecture.md)
* **Overlays ("modules").** The whole program does not fit in RAM. A section table in the image lists code / data /
  BSS ranges; section 0 stays resident and the rest are copied into shared RAM windows on demand. Core-B decoders are
  modules too, loaded into HIGHRAM0 one at a time [AP30]. [../formats/stage3_sections.md](../formats/stage3_sections.md)
* **Second core.** Core A loads a decoder module into core B's RAM, releases core B from reset and then exchanges
  commands and file data with it through the mailbox. Each module carries its own copy of a small core-B runtime
  (mailbox file client, startup) [AP30]. [../hardware/dual_core.md](../hardware/dual_core.md)
* **Codec libraries.** Rockchip delivered most decoders as prebuilt libraries derived from open-source projects
  (libmad, FFmpeg, Tremor, Helix AAC, libsndfile, Speex), plus a proprietary WMA decoder and its own DSD converter
  [AP30 + WEB]. [../firmware/third_party_components.md](../firmware/third_party_components.md)
* **Resources.** UI strings come from a spreadsheet with one column per language, compiled into a menu/string table;
  the AP30's 21-language order is exactly the column order of Rockchip's 21-language sheets (zh-CN, zh-TW, en, ko, ja,
  es, fr, de, it, pt, ru, sv, th, pl, da, nl, el, cs, tr, he, ar) [AP30 + ?: SDK copies]. Images are packed into a
  "ROCK26IMAGERES" blob [AP30]. [../formats/resources.md](../formats/resources.md)
* **Debug output.** The SDK prints "FILE: …, LINE: …" messages with source paths such as `..\..\Common\…`; in the
  AP30 these strings remain (248 format strings, 57 source paths) but the output function does nothing in the
  release build [AP30].
* **Leftovers.** The AP30 image still contains a driver for an audio codec chip it does not have (once mistaken for an
  FM tuner) that matches the codec of Rockchip's early reference board, and an RKNanoC-era product ID [AP30 + ?].

**Generations** (from SDK copies that circulate publicly, see
[../overview/sources.md](../overview/sources.md#not-linked-on-purpose); not linked here) [?]:

| SDK | Chip | Era | Notes |
|---|---|---|---|
| RKNanoC SDK | RKNanoC | ≈ 2013-2017 | single core; contains USB audio device code of the same lineage as the AP30's dormant USB-audio overlay |
| RKNanoD "MP3" SDK V1.3 | RKNanoD | released 2016-11 | the bare-metal task/overlay model the AP30 uses; core-B decoder libraries; update image `RKNANOFW.IMG`; tools for menus, resources and flashing |
| RKNanoD "Wireless Audio" SDK V1.5 | RKNanoD | 2016-10 | a different architecture built on RKOS / FreeRTOS; its drivers are later revisions of the MP3 SDK's, and some of those later fixes also appear in the AP30 |

The AP30 and the Echo Mini are both built from the MP3-SDK generation [AP30 + EM]. Vendors changed names, menus,
board drivers and features on top (Hidizs: games, volume wheel, favourites; FiiO: USB DAC, M3U, themes) [AP30 + EM].

## Boot loader versions

The boot loader lives in the flash's hidden IDB area and is never part of an update image [AP30].

| Loader | Where | Tag |
|---|---|---|
| 4.04 | sample firmware shipped with Rockchip's SDK tools (an RKFW container with an RKNanoD boot loader and an RKnanoFW image) | [?: SDK copies] |
| 4.06 | Snowsky Echo Mini | [EM] |
| **4.16** | Hidizs AP30 (reported over USB, chip tag "C262", Rockusb PID `262d`) | [AP30] |

[../firmware/boot_loader.md](../firmware/boot_loader.md)

## The family in Rockchip's open-source tools

* **rkdeveloptool** lists an older RKNano loader ID `071b:3226` as `RKNANO` and accepts any `2207:xxxx` loader, which
  covers the AP30's `2207:262d`. Its chip-info signature for the family is "onan" (0x6E616E6F) [WEB]; not yet read
  from an AP30 [?].
* **rkbin** has an empty boot-merger recipe `RKBOOT/RKNANO.ini` (unchanged since 2013) and no RKNano binaries [WEB].
* **u-boot** knows `RKNANO` in its boot merger and documents the Rockusb opcodes and the IDB RC4 key [WEB].
* The **Linux mailbox driver** (`rockchip-mailbox.c`) drives a block with the same register layout as the RKNanoD
  mailbox [WEB + AP30]. Linux itself does not run on the RKNano.
* Windows **RKDevTool** contains an RKNano device class and the PID `262D` [WEB].

## Other players on the RKNanoD

| Player | Status |
|---|---|
| Hidizs AP30 | [AP30] |
| Snowsky (FiiO) Echo Mini | [EM], same firmware code base: [snowsky_echo_mini.md](snowsky_echo_mini.md) |
| Snowsky ECHO, ECHO NANO | firmware on the same FiiO CDN; chip not checked [?] |
| Wi-Fi/Bluetooth audio demo boards and the Firefly "Fireduino" board | named as RKNanoD-based SDK trees in a Qiita article [WEB](https://qiita.com/eggman/items/7822981acba166469e49); not checked [?] |

## Rockbox status

* Rockbox's source tree contains `utils/rknanoutils` (rkboottool, rkload, GPL): tools to unpack RKnano firmware
  containers and load code over USB [WEB]. They were the first reference for the AP30's container format.
* There is **no Rockbox port** for an RKNano player [?: none known]. A port is not realistic: Rockbox targets
  usually have megabytes of RAM for the core, codecs and buffers, while the RKNanoD has about 1 MB of SRAM in total,
  split between two cores, and no external RAM [AP30 + TRM; feasibility judgement ?].
* Community replacement firmwares for the Echo Mini (EchoPod, ReChord, echo-mini-newfw, RECHO) show the practical
  route instead: bare-metal firmware with decoders on core B ([community_projects.md](community_projects.md)).

## Open questions

* The real maximum core clocks of the RKNanoD-G [?].
* The chip-info answer of the AP30's loader to the Rockusb chip-version command [?].
* Which other commercial players use the RKNanoD [?].
* Why the AP30's loader reports 4.16 while the Echo Mini's reports 4.06 (newer drop from Rockchip, or a Hidizs build)
  [?].

## Sources

* [DS] RKNanoC datasheet V1.7; RKNanoD datasheets V0.1 and V1.8. [TRM] RKNanoD TRM V1.0. Links above.
* [AP30] analysis of firmware V1.7.8, loader 4.16 and the chip marking of an opened unit.
* [EM] Echo Mini images and studies ([snowsky_echo_mini.md](snowsky_echo_mini.md)).
* [WEB] [rockchip-linux/rkdeveloptool](https://github.com/rockchip-linux/rkdeveloptool),
  [rockchip-linux/rkbin](https://github.com/rockchip-linux/rkbin), [rockchip-linux/u-boot](https://github.com/rockchip-linux/u-boot),
  [rockchip-linux/kernel](https://github.com/rockchip-linux/kernel), [Qiita: RKNanoD notes](https://qiita.com/eggman/items/7822981acba166469e49),
  [Rockbox rknanoutils](https://git.rockbox.org/cgit/rockbox.git/tree/utils/rknanoutils).
* [?] structure of Rockchip's SDK copies, described in our own words only (not linked).
