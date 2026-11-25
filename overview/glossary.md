# Glossary

Status: draft, 2026-11

Terms and abbreviations used across this collection, in alphabetical order. Each entry says what the term means
**for the AP30** and links to the page where the topic is covered in full. Tags follow
[conventions.md](conventions.md); entries without a tag are general definitions.

[A](#a) · [B](#b) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [J](#j) · [L](#l) ·
[M](#m) · [N](#n) · [O](#o) · [P](#p) · [R](#r) · [S](#s) · [T](#t) · [U](#u) · [V](#v) · [W](#w)

## A

**A-B repeat** — loop a part of a track: A on the Now Playing screen sets point A, a second press sets B, a third
clears it [WEB, matches the firmware's audio commands AP30]. [../firmware/audio_playback.md](../firmware/audio_playback.md)

**ADC ladder (key ladder)** — several buttons share one ADC input through a resistor chain; each key gives a different
voltage. The AP30 reads eight keys this way on SAR-ADC channel 1; only one ladder key can be read at a time [AP30, WEB].
[../hardware/input.md](../hardware/input.md)

**AHB / APB** — the Arm on-chip buses: AHB (fast, for memories and bus masters such as DMA, VOP, USB, SD/eMMC) and
APB (slow, for simple peripherals such as UART, I2C, timers). [../hardware/soc_rknanod.md](../hardware/soc_rknanod.md)

**AIRCR** — Cortex-M "Application Interrupt and Reset Control Register" (0xE000ED0C). A write with the key 0x05FA in the
upper half and the reset request bit set resets the system; the AP30 firmware reboots by writing 0x05FA0007 [AP30].

**ALC5686** — Realtek USB audio codec chip on the AP30 board. In USB DAC mode it, not the RKNanoD, is the USB
device (`0bda:4a35`) [AP30]. [../hardware/usb.md](../hardware/usb.md)

**AVLS** — "Automatic Volume Limiter System", a volume cap feature. Code for it exists in the AP30 firmware and not in
the Echo Mini's [AP30]; whether users can reach it is not established [?].

## B

**BAL / SE** — balanced (4.4 mm, each channel driven differentially) and single-ended (3.5 mm) headphone outputs.

**BCD** — binary-coded decimal: each hex digit holds one decimal digit (0x2026 = "2026"). The image header stores its
date and version this way [AP30]. [../formats/rknanofw_container.md](../formats/rknanofw_container.md)

**Boot loader (loader 4.16)** — the Rockchip program stored in the hidden IDB area of the internal flash. It powers
the board, checks the firmware headers, starts FW1 (or FW2), and offers loader USB mode. Updates never write it
[AP30]. The Echo Mini has loader 4.06 [EM]. [../firmware/boot_loader.md](../firmware/boot_loader.md)

**BSS** — the zero-initialised data area of a program or overlay. The stage-3 section table gives each section a
code, a data and a BSS range [AP30]. [../formats/stage3_sections.md](../formats/stage3_sections.md)

**BT Music** — the AP30's Bluetooth output screen (overlay 112 in V1.7.8). It powers the JieLi chip and talks to it
over UART [AP30]. [../firmware/bluetooth.md](../firmware/bluetooth.md)

## C

**Code page tables** — character-set conversion tables stored as data-only sections 63-69 in the code stage (the
large GBK table is a separate blob) [AP30]. [../formats/resources.md](../formats/resources.md)

**Core A / core B** — the RKNanoD's two Cortex-M3 cores. **Core A** ("system core") runs the firmware: UI, files,
USB, display, power. **Core B** ("calculation core", "HiFi core") runs one audio decoder module at a time and talks to
core A through the mailbox [AP30 + TRM]. [../hardware/dual_core.md](../hardware/dual_core.md)

**CRC (RKCRC32)** — the 32-bit checksum at the end of an RKnanoFW image (polynomial 0x04C10DB7, initial value 0,
MSB-first, stored little-endian). Neither the boot loader nor the stock updater checks it [AP30].
[../formats/rknanofw_container.md](../formats/rknanofw_container.md)

**CRU** — Clock and Reset Unit of the RKNanoD (base 0x40180000): PLL, clock dividers and selectors, clock gates
(`CLKGATEn_CON`) and soft resets (`SOFTRSTn_CON`). Core B is held in reset through a CRU soft-reset bit [TRM, AP30].
[../hardware/soc_peripherals.md](../hardware/soc_peripherals.md)

**CS43198** — Cirrus Logic stereo DAC used by the AP30 (I2C address 0x66, audio over I2S1) [AP30, DS].
[../hardware/audio_dac_cs43198.md](../hardware/audio_dac_cs43198.md)

## D

**DAC** — digital-to-analog converter. In this collection usually the CS43198; "USB DAC mode" means the player acting
as a USB sound card for a phone or PC (handled by the Realtek ALC5686).

**DesignWare (DW)** — Synopsys IP blocks that Rockchip licenses. On the RKNanoD: the watchdog, the SD/eMMC host
(MSHC), the DMA controllers and the USB 2.0 OTG controller (DWC2) [TRM].

**DMAC** — DMA controller. The RKNanoD has DMAC1 (6 channels, on AHB) and DMAC2 (2 channels, core B side); audio
reaches the I2S1 FIFO through DMAC1 channel 5 [DS, AP30]. [../hardware/soc_peripherals.md](../hardware/soc_peripherals.md)

**DoP** — "DSD over PCM": DSD bits packed into 24-bit PCM frames with marker bytes, so a PCM link can carry DSD. The
AP30 spec sheet lists "S/PDIF DoP"; the firmware converts DSD to 44.1 kHz PCM and has no DoP output [AP30].
[../firmware/audio_playback.md](../firmware/audio_playback.md)

**DSD / DSF / DFF (DSDIFF)** — Direct Stream Digital (1-bit high-rate audio) and its two file formats. Overlays 79
(DSDIFF) and 80 (DSF) decode them on core B [AP30]. [../firmware/core_b_codecs.md](../firmware/core_b_codecs.md)

## E

**Echo Mini** — the Snowsky (FiiO) Echo Mini, a sister player on the same SoC and the same firmware code base. Facts
taken from it carry the tag [EM]. [../related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md)

**ECHOMINI.IMG** — a second update file name the AP30 accepts, inherited from the Echo Mini [AP30 + EM].
[firmware_releases.md](firmware_releases.md#file-names-hifiyfnn-and-echomini)

**eMMC / SD-NAND** — managed NAND flash with an MMC/SD interface. The RKNanoD has an eMMC host; the AP30's internal
flash chip is an 8-pad LGA package of the SD-NAND kind [AP30 + ?]. [../hardware/storage.md](../hardware/storage.md)

**EVK** — Rockchip's RKNanoD evaluation (reference) board. Some AP30 board choices follow it [?].
[../hardware/board_ap30.md](../hardware/board_ap30.md)

## F

**FAT / exFAT** — the file systems of the user volume and microSD. The stock FAT layer reads FAT16, FAT32 and exFAT
with long file names [AP30]. [../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md)

**Favourites** — the "Favorites" list. Stored per disk in reserved blocks; it can vanish after a microSD swap
because a library rebuild filters it against a list that is not reloaded [AP30].
[../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md)

**FW1 / FW2** — the two firmware slots on the internal flash, each 28 MiB (0xE000 sectors) at loader LBA 0 and
0xF000. The loader boots FW1 and falls back to FW2 only if FW1's header check fails; FW2 then stays preferred
(marker 0x18CF) [AP30]. [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md)

## G

**Gapless** — playback with no gap between consecutive tracks. Up to V1.7.8 the AP30 tears the audio chain down at
every track change and fades the end of each track; V1.8.3 plays FLAC → FLAC of the same format gaplessly and keeps
the old behaviour for everything else [AP30]. [../firmware/audio_playback.md](../firmware/audio_playback.md)

**GBK** — the Chinese character encoding; the image contains a GBK conversion table blob, and the media library sorts
by pinyin keys derived from it [AP30].

**Giteki** — Japan's radio equipment certification (MIC). The AP30 appears only in the AP80 PRO MAX record
222-260312 [WEB].

**GPIO0 / GPIO1 / GPIO2** — the three 32-pin GPIO banks of the RKNanoD (bases 0x40160000, 0x40170000, 0x50030000).
Pins are written "GPIO2_13" = bank 2, pin 13 [TRM, AP30]. [conventions.md](conventions.md)

**GRF** — General Register Files (base 0x50010000): pin multiplexing (iomux), pull-ups, and assorted control bits
such as VBUS status. Write-mask register [TRM]. [../hardware/soc_peripherals.md](../hardware/soc_peripherals.md)

## H

**Header copy** — RKnanoFW images keep a second copy of the 0x200-byte header at offset `header.size`. The loader and
the updater only check that the two match [AP30]. [../formats/rknanofw_container.md](../formats/rknanofw_container.md)

**HidizsOS** — Hidizs's name for the stock firmware. It is a Rockchip RKnano SDK application, not Linux [AP30].
[../firmware/architecture.md](../firmware/architecture.md)

**HIFIACC** — the RKNanoD hardware accelerator used by the FLAC, ALAC and APE decoders (LPC / adaptive filters, FFT),
at core-B address 0x01060000 [EM, AP30 drivers present]. [../hardware/dual_core.md](../hardware/dual_core.md)

**HIFIYFnn.IMG** — the AP30 update file name pattern (nn = 00..89) [AP30]. [firmware_releases.md](firmware_releases.md)

**HIGHRAM (HIGHRAM0 / HIGHRAM1)** — core B's RAM: HIGHRAM0 (128 KiB, at 0x01000000 for core A, at 0 for core B)
holds the decoder code, HIGHRAM1 (256 KiB, 0x01020000) its data and shared buffers [TRM, AP30].

## I

**I2C** — two-wire control bus. On the AP30: I2C0 (pin set A) to the RTC (0xA2), I2C1 (pin set C) to the DAC (0x66)
[AP30]. Addresses in this collection are 8-bit (write address) unless stated.

**I2S** — serial audio bus. I2S1 carries PCM from the RKNanoD to the CS43198 [AP30].

**IDB (ID Block)** — Rockchip's boot area at the start of the internal flash: an RC4-scrambled header, chip tag
("C262"), a device-identity sector, and the loader stages, stored five times. It sits in physical sectors 0..0x1FFF
(the "hidden area"), outside the loader's normal LBA space, and must never be written [AP30].
[../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md)

**imgres (ROCK26IMAGERES)** — the image-resource blob: 478 RGB565 big-endian pictures with their original BMP names
and positions [AP30]. [../formats/resources.md](../formats/resources.md)

**IRAM / DRAM / SYSRAM** — the RKNanoD's on-chip RAM banks. Core A's view: SYSRAM at 0x03000000 (code and data of the
firmware); core B's: HIGHRAM. Total 1 MB including the PMU SRAM [TRM]. [../hardware/soc_rknanod.md](../hardware/soc_rknanod.md)

## J

**JieLi (JL)** — Chinese maker of Bluetooth audio SoCs. The AP30's Bluetooth chip is a JieLi QFN-32 [AP30].
[../hardware/bluetooth.md](../hardware/bluetooth.md)

## L

**LBA** — logical block address (512-byte sectors). Three numberings appear: **physical** sector on the flash;
**loader LBA** = physical − 0x2000 (what Rockusb read/write commands use; loader LBA 0 = FW1 header); **IDB read
address** = physical − 64 (Rockusb READ_SECTOR, opcode 0x04) [AP30]. [conventions.md](conventions.md)

**Library (media library database)** — the song index the player builds from the files ("Updating Library…"). It
lives in data areas of the internal flash and is rebuilt after an unclean shutdown, a format or a USB write [AP30].
[../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md)

**Loader mode (loader USB mode)** — the boot loader acting as a Rockusb device (`2207:262d`). Entered with D-pad
Right + Power with USB connected, or by a vendor SCSI command from the running firmware. From here the flash can be
read and FW1/FW2 rewritten: the AP30's recovery path [AP30]. [../guides/recovery.md](../guides/recovery.md)

**Long-press reset** — holding Power for about 8 s cuts power and restarts the player by hardware, whatever the
firmware does; it repeats every ~10 s while held [AP30, measured]. [../hardware/power.md](../hardware/power.md)

## M

**Mailbox** — the RKNanoD inter-core message block (base 0x40110000), four channels in each direction, a command
and a data word per channel; writing the data word sends the message. Same IP as Rockchip's Linux mailbox driver
[AP30 + EM + WEB]. [../hardware/dual_core.md](../hardware/dual_core.md)

**Marker (boot-mode marker)** — a value in `PMU_SYS_REG3` that survives a soft reset and tells the loader what to do
next: 0x18AF = enter loader mode, 0x18EF = one more loader-mode boot, 0x18CF = keep booting FW2 [AP30].
[../firmware/boot_loader.md](../firmware/boot_loader.md)

**MaskROM (mode)** — the SoC's built-in ROM USB boot mode, used when no valid loader exists. Never needed on the AP30
so far; the firmware can request it with a vendor command [AP30]. [../guides/recovery.md](../guides/recovery.md)

**MCU interface (i8080)** — a parallel display bus with command/data writes, used by small panels with their own
frame memory. The VOP drives the AP30 panel this way [AP30]. [../hardware/display.md](../hardware/display.md)

**Module** — Rockchip SDK word for an overlay (a "module" is loaded into an overlay window). Core-B decoders are
"codec modules" [AP30].

**MSC** — USB Mass Storage Class (the "File Transfer" mode, `071b:3203`) [AP30].

## N

**NOS** — "non-oversampling": a DAC filter setting that skips the digital interpolation filter. One of the five
filter choices; it maps to a CS43198 filter register value [AP30, WEB].

## O

**OTG (USB OTG)** — USB On-The-Go controller (DesignWare DWC2) in the RKNanoD; the AP30 uses it in device mode only
[AP30].

**Overlay** — a piece of code (and its data) that is copied from the image into a shared RAM window only when needed,
because the firmware does not fit into RAM at once. The AP30 V1.7.8 code stage has 113 section slots: section 0 is
resident, the others are overlays (system services 1-40, data tables, core-B decoders 71-80, games and BT Music
81-112) [AP30]. [../firmware/architecture.md](../firmware/architecture.md)

## P

**PLL** — phase-locked loop: the clock multiplier that makes the system clocks from the 24 MHz crystal [TRM].

**PMU** — Power Management Unit of the RKNanoD (base 0x50020000): power domains, and the `PMU_SYS_REG*` registers
that survive a soft reset (the boot-mode marker lives in `PMU_SYS_REG3` at 0x5002004C) [TRM, AP30].
[../hardware/soc_peripherals.md](../hardware/soc_peripherals.md)

**PMU SRAM** — 64 KiB RAM in the always-on domain (0x03090000) [TRM, EM].

**POWERHOLD** — the output that keeps the board powered after the Power key is released; the loader sets it [AP30].
[../hardware/power.md](../hardware/power.md)

**PWM** — pulse-width modulation. The AP30 backlight is PWM0 channel 0 at 15 kHz [AP30].

## R

**RC4** — the stream cipher Rockchip uses to scramble IDB sectors (fixed public key) [AP30 + WEB].

**RGB565** — 16-bit pixel format (5 bits red, 6 green, 5 blue). AP30 resources store it big-endian [AP30].

**RKNanoC / RKNanoD** — Rockchip audio-player microcontrollers. RKNanoC: one Cortex-M3, 224 KB RAM (2012-13).
RKNanoD: two Cortex-M3, 1 MB RAM (2015), packages -N (QFN68), -G (LFBGA121, the AP30's) and -L (LQFP128) [DS].
[../related/rockchip_rknano_family.md](../related/rockchip_rknano_family.md)

**RKnano SDK** — Rockchip's bare-metal software kit for these chips; the image header says "RKnano SDK 1.0" [AP30].
[../related/rockchip_rknano_family.md](../related/rockchip_rknano_family.md)

**RKnanoFW** — the magic string at offset 0x1F8 of an update image, and the name of the container format [AP30].
[../formats/rknanofw_container.md](../formats/rknanofw_container.md)

**rkdeveloptool** — Rockchip's open-source command-line Rockusb tool ([GitHub](https://github.com/rockchip-linux/rkdeveloptool)).
Works with the AP30 loader for listing and writing; its `rl` read command hangs on loader 4.16 [AP30]. Never use `ef`
(erase flash), `db` or `ul` on the AP30.

**Rockusb** — Rockchip's USB protocol for loader and MaskROM modes: SCSI-like command blocks over bulk endpoints
(read/write LBA, read sector, chip info, flash ID, reset) [WEB, AP30]. [../guides/recovery.md](../guides/recovery.md)

**RT6863** — Richtek headphone amplifier on the AP30 [AP30, WEB]. [../hardware/audio_amp_rt6863.md](../hardware/audio_amp_rt6863.md)

**RTC** — real-time clock; on the AP30 an AnalogTek AT85163S, PCF8563-compatible [AP30]. [../hardware/rtc.md](../hardware/rtc.md)

## S

**SARADC** — the RKNanoD's 8-channel 10-bit successive-approximation ADC (base 0x400D0000). Channel 0 = battery
voltage, channel 1 = button ladder [AP30]. [../hardware/soc_peripherals.md](../hardware/soc_peripherals.md)

**SAVE area** — the settings area on the internal flash (loader LBA 0x1E000): a "SAVE" tag with the firmware
date/version, then the system settings [AP30]. [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md)

**SBC** — the mandatory basic Bluetooth A2DP audio codec. The AP30 transmits SBC only [WEB].

**SCS** — Cortex-M System Control Space (0xE000E000): NVIC, SysTick, SCB.

**Section** — one record of the stage-3 table: code, data and BSS ranges (address, load address, size). Section 0 is
resident; the others are overlays [AP30]. [../formats/stage3_sections.md](../formats/stage3_sections.md)

**SFC** — the RKNanoD's serial (SPI) flash controller [DS]; the AP30 boots from its eMMC-style flash instead [AP30].

**Stage 3 (code stage)** — the blob holding all code and data sections; boot stages 0-2 are empty in AP30 images
(the loader lives in the IDB instead) [AP30]. [../formats/stage3_sections.md](../formats/stage3_sections.md)

**strtbl (string table)** — the 21-language UI text blob; records also encode the Settings menu tree [AP30].
[../formats/resources.md](../formats/resources.md)

**SysTick** — the Cortex-M system timer; the AP30 firmware runs it at a 10 ms tick [AP30].

## T

**Task / window** — the firmware's UI model: one "task" (screen application: music, settings, a game) is active; it
owns a list of "windows" with service, key, paint, init and deinit callbacks; tasks switch cooperatively [AP30].
[../firmware/ui_and_settings.md](../firmware/ui_and_settings.md)

**TRM** — Technical Reference Manual: here the Rockchip RKNanoD TRM V1.0 (2015, 427 pages), the register-level
description of the SoC. Tag [TRM]. [sources.md](sources.md)

## U

**UART** — serial port. The RKNanoD has six; on the AP30 UART1 (pin set A) is the Bluetooth link at 115200 8N1 [AP30].

**UAC** — USB Audio Class. The firmware contains a UAC1 + HID USB-audio overlay (48 kHz, 16-bit) inherited from the
Echo Mini, but the AP30 never selects it [AP30 + EM]. [../firmware/usb_modes.md](../firmware/usb_modes.md)

**Unclean shutdown flag** — a word in the settings (0x55AA = clean) that the firmware checks at boot; if the last
power-off was not clean, the media library is rebuilt ("Library / Updating Library…") [AP30].

## V

**VBUS** — the USB 5 V supply line. The loader enters loader mode only when VBUS is present and D-pad Right is held
[AP30].

**VOP** — Video Output Processor, the RKNanoD display controller (base 0x60070000), used in MCU (i8080) mode on the
AP30 [TRM, AP30]. [../hardware/display.md](../hardware/display.md)

**VTOR** — Cortex-M vector table offset register (0xE000ED08). The loader enters the firmware through the table at
0x03004000; the firmware then sets VTOR to 0x03050000 and later builds a RAM table [AP30].
[../firmware/startup.md](../firmware/startup.md)

## W

**WDT** — watchdog timer (DesignWare, base 0x40120000); the firmware starts it in "interrupt first, then reset" mode
[AP30]. [../firmware/power_management.md](../firmware/power_management.md)

**Write-mask register** — a Rockchip register style where the upper 16 bits of a 32-bit write select which of the
lower 16 bits change. Example: writing 0xFFFF18AF to `PMU_SYS_REG3` sets all 16 low bits to 0x18AF [TRM, AP30].
[conventions.md](conventions.md#registers)

## Sources

* [AP30] analysis of firmware V1.7.8 and the boot loader; measurements on a device.
* [TRM] Rockchip RKNanoD TRM V1.0; [DS] RKNanoD datasheets V0.1 / V1.8, RKNanoC datasheet V1.7, Cirrus Logic CS43198
  datasheet. Links: [sources.md](sources.md).
* [EM] the Echo Mini studies listed in [../related/community_projects.md](../related/community_projects.md).
* [WEB] reviews summarised in [../community/user_feedback.md](../community/user_feedback.md);
  [rockchip-linux/rkdeveloptool](https://github.com/rockchip-linux/rkdeveloptool),
  [Rockchip Rockusb wiki](https://opensource.rock-chips.com/wiki_Rockusb) ([archived copy](https://web.archive.org/web/20260503124531/https://opensource.rock-chips.com/wiki_Rockusb)).
