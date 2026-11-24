# Snowsky (FiiO) Echo Mini

Status: draft, 2026-11

The Snowsky Echo Mini (Snowsky is a FiiO sub-brand) is a small music player released in early 2025 on the **same
Rockchip RKNanoD SoC** as the AP30 and built from the **same firmware code base**: the AP30 updater still accepts the
Echo Mini's update file name `ECHOMINI.IMG`, and whole second-core decoder modules are byte-identical between the two
products. The Echo Mini has an active modding community, so many RKNanoD facts were first found there (tag [EM]).
This page lists the hardware differences, compares every official Echo Mini release (V1.2.5 to V4.0.0) with the AP30
firmware, and collects the Echo Mini findings that matter for the AP30.

## Contents

- [Hardware: what is shared, what differs](#hardware-what-is-shared-what-differs)
- [Evidence for the shared code base](#evidence-for-the-shared-code-base)
- [Official Echo Mini firmware](#official-echo-mini-firmware)
- [Version table](#version-table)
- [Second-core decoder modules: one lineage](#second-core-decoder-modules-one-lineage)
- [Update file names](#update-file-names)
- [The Echo Mini's USB DAC is the AP30's dormant overlay 11](#the-echo-minis-usb-dac-is-the-ap30s-dormant-overlay-11)
- [Code in one product but not the other](#code-in-one-product-but-not-the-other)
- [Bugs FiiO fixed that match AP30 symptoms](#bugs-fiio-fixed-that-match-ap30-symptoms)
- [Debug strings and build clues](#debug-strings-and-build-clues)
- [Echo Mini findings reused for the AP30](#echo-mini-findings-reused-for-the-ap30)
- [Sibling products](#sibling-products)
- [Open questions](#open-questions)
- [Sources](#sources)

## Hardware: what is shared, what differs

| Item | Echo Mini [EM] | AP30 [AP30] |
|---|---|---|
| SoC | Rockchip RKNanoD | Rockchip RKNanoD-G (LFBGA121) |
| DAC | 2 × Cirrus Logic CS43131, on I2C0 | 1 × Cirrus Logic CS43198 on I2C1 (pin set C), address 0x66, + Richtek RT6863 amplifier |
| Display | 320 × 170 (ST7789-type panel, needs colour inversion) | 296 × 240 (JD9853-like controller [?], no inversion command) |
| USB DAC | the RKNanoD itself, through overlay 11 (48 kHz, from Echo Mini V2.4.0) | a separate Realtek ALC5686 (`0bda:4a35`); overlay 11 is present but never selected |
| Volume control | no wheel code in its firmware (buttons [?]) | ALPS wheel (quadrature encoder) |
| Bluetooth | transmitter module on a UART (protocol documented by EchoPod) | JieLi transmitter chip on UART1 (pin set A), 115200 8N1 |
| Internal storage | 8 GB, and a 512 MB variant from V3.7.0 | ≈ 480 MiB raw, 216 MiB user volume |
| Boot loader | 4.06 | 4.16 |
| Hard reset | pinhole | 8 s Power long-press (the same reset class: it clears the boot-mode marker) |
| FW2 slot position | R = P / 2 (FW2 offset is half the system-zone offset) | rule does not hold: FW2 at loader LBA 0xF000, system zone at 0x82000 |
| Games | none (no game overlays in any release) | 29 games (+4 hidden), plus an e-book reader and the BT Music screen |

Sources: [EM] from the echo-mini-newfw study and the Echo Mini images; [AP30] from the AP30 firmware and device.

## Evidence for the shared code base

* The AP30 update scan's second file-name template is `ECHOMINI.IMG` [AP30].
* The USB mass-storage INQUIRY table is the same, renamed: Echo Mini `ECHO` / `MINI` / `MINI SD` / `CD-ROM` `1.00`,
  AP30 `HIFI MP3` / `USB MP3` / `SD` [AP30 + EM].
* Same RKnanoFW container, same header vendor/model ("Rockchip" / "RKnano SDK 1.0"), same 21-language string table
  layout family [AP30 + EM].
* Second-core decoder modules are byte-identical between products (below), and the system-core code shares about a
  third of its functions byte for byte [AP30 + EM].
* Echo Mini studies map onto the AP30 almost one to one: mailbox protocol, core-B start, accelerators, loader logic
  [AP30 + EM].

## Official Echo Mini firmware

* **26 official releases** are known (25 on FiiO's download page plus an unlisted V1.6.0), **30 images** including the
  512 MB variant, all on FiiO's own CDN. No official image older than V1.2.5 (the first public update) was found
  [EM, WEB].
* Same container as the AP30: header magic, header copy at `header.size`, RKCRC32 trailer. CRC, header copy and
  padding are correct in all 30 images [EM].
* The header **version** field is not the release number: V1.2.5 = 5.0.0, V1.2.7 = 3.1.0, V1.3.0 = 0.1.3,
  V1.5.0 = 0.5.0, V1.6.2 = 0.6.2, every other release 0.0.0. The header **date** is the build date and always grows
  [EM]. (The AP30 factory image also says 5.0.0.)
* Stage-3 section count: 90 (V1.2.5-V1.4.6), then 91 from V1.5.0 (decoder modules moved up one slot, slot 72 left
  empty). The AP30 V1.7.8 has 113: its extra slots are the games and BT Music [EM + AP30].
* String table: 21 languages in every version, records of 0x102 bytes (the AP30 factory layout); 416 records in
  V1.2.5 growing to 453 (8 GB) / 458 (512 MB) in V4.0.0 (AP30 V1.7.8: 307 records of 0x112 bytes). The language block
  order differs (block 6 is German on the Echo Mini). From V3.3.0 the German block carries its own menu-tree headers
  (54 records differ from block 0), which strict string-table parsers reject [EM].
* Image resources: 686 (V1.2.5) → 1632 (V4.0.0) images at 320 × 170; the AP30 has 478 at 296 × 240 [EM + AP30].
* **Two hardware variants from V3.7.0:** 8 GB (`HIFIECnn.IMG`) and 512 MB (`MINIVnnn.IMG`). The 512 MB build's
  section 0 is 0x23C bytes larger, so most system overlays move; real size changes are in overlays 1, 6 (charging
  screen 0x1210 → 0x2F4 B), 8 (updater), 9 (USB), 11, 21, 25-28, 31-33 and 60. Core B is identical. Both are 32 MiB
  containers [EM].

## Version table

Compared against AP30 V1.7.8 by function-level comparison of the images. "s0 identical" = share of the AP30's 819
section-0 functions found byte-identical in the Echo Mini image (by count; by bytes in brackets). "Core B identical" =
same for the 2785 second-core functions. Page date = "updated" date on FiiO's page; header date = build date in the
image. All [EM], comparison columns [EM + AP30].

| Version | Page date | Header date / ver | Image | Size | Slots | Strings (lang × rec) | s0 identical | core B identical | Changelog (short) |
|---|---|---|---|---|---|---|---|---|---|
| V1.2.5 | 2025-01-21 | 2025-01-20 / 5.0.0 | `HIFIEC25.IMG` | 25 MiB | 90 | 21 × 416 | 34 % (12 %) | 79 % (63 %) | gain setting, 5 min power saving default, filter saved, folder shuffle, auto fast-forward / noise, BT pops |
| V1.2.7 | 2025-01-24 | 2025-01-22 / 3.1.0 | `HIFIEC27.IMG` | 25 MiB | 90 | 21 × 416 | 34 % (12 %) | 79 % (63 %) | file sorting, clock reset, charging text flicker, BT auto-reconnect |
| V1.3.0 | 2025-02-15 | 2025-02-12 / 0.1.3 | `HIFIEC30.IMG` | 25 MiB | 90 | 21 × 416 | 34 % (12 %) | 80 % (63 %) | title from ID3, 24 h clock, library update after charging while off, start-of-track dropout, Favourites |
| V1.4.0 | 2025-02-24 | 2025-02-24 / 0.0.0 | `HIFIEC40.IMG` | 25 MiB | 90 | 21 × 422 | 34 % (12 %) | 81 % (67 %) | cover art + full-screen lyrics, FF/REW, 120 volume steps, Favourites in file browser, power-off pop |
| V1.4.6 | 2025-03-24 | 2025-03-24 / 0.0.0 | `HIFIEC46.IMG` | 25 MiB | 90 | 21 × 431 | 35 % (13 %) | 81 % (66 %) | screensaver clock, backlight whine, lyrics, sorting by file name / track number |
| V1.5.0 | 2025-04-18 | 2025-04-17 / 0.5.0 | `HIFIEC50.IMG` | 25 MiB | 91 | 21 × 432 | 34 % (12 %) | 84 % (70 %) | Retro EQ, album artist first, low-brightness flicker, shuffle memory, ID3 |
| V1.6.0 | (unlisted) | 2025-04-28 / 0.0.0 | `HIFIEC60.IMG` | 25 MiB | 91 | 21 × 432 | 34 % (12 %) | 84 % (70 %) | first build of the 2025-04-30 entry, replaced by V1.6.2 |
| V1.6.2 | 2025-04-30 | 2025-05-07 / 0.6.2 | `HIFIEC62.IMG` | 25 MiB | 91 | 21 × 432 | 34 % (12 %) | 84 % (70 %) | track artist first, start-of-track clipping, shuffle after manual pick, album art |
| V1.7.0 | 2025-06-09 | 2025-06-07 / 0.0.0 | `HIFIEC70.IMG` | 26 MiB | 91 | 21 × 433 | 34 % (12 %) | 86 % (76 %) | custom 5-band EQ, no automatic library update at boot, some OGG files, special characters |
| V1.8.0 | 2025-07-09 | 2025-07-10 / 0.0.0 | `HIFIEC80.IMG` | 28 MiB | 91 | 21 × 436 | 35 % (13 %) | 81 % (70 %) | 3 UI themes, low-brightness flicker, ID3 "unknown", update crashes, dropped characters |
| V2.4.0 | 2025-08-21 | 2025-08-20 / 0.0.0 | `HIFIEC40.IMG` | 32 MiB | 91 | 21 × 443 | 35 % (13 %) | 84 % (77 %) | **USB DAC** (48 kHz UAC, overlay 11), folder skip, DAC DRE parameters; formats internal storage |
| V2.5.0 | 2025-09-30 | 2025-09-27 / 0.0.0 | `HIFIEC50.IMG` | 32 MiB | 91 | 21 × 443 | 35 % (13 %) | 84 % (77 %) | occasional noise, shuffle logic, capacity display |
| V2.6.0 | 2025-10-25 | 2025-10-23 / 0.0.0 | `HIFIEC60.IMG` | 32 MiB | 91 | 21 × 443 | 35 % (13 %) | 84 % (77 %) | M4A album sorting, RIFF (WAV) ID3 |
| V2.7.0 | 2025-11-19 | 2025-11-17 / 0.0.0 | `HIFIEC70.IMG` | 32 MiB | 91 | 21 × 446 | 35 % (13 %) | 84 % (77 %) | volume-button swap, cover missing after track change |
| V2.8.0 | 2025-12-03 | 2025-12-02 / 0.0.0 | `HIFIEC80.IMG` | 32 MiB | 91 | 21 × 450 | 35 % (13 %) | 84 % (77 %) | lyrics switch, channel balance, favourites cleared on drive-letter change, library-update crash; formats storage |
| V3.0.0 | 2025-12-26 | 2025-12-24 / 0.0.0 | `HIFIEC00.IMG` | 32 MiB | 91 | 21 × 450 | 35 % (13 %) | 84 % (77 %) | long-press menu = favourite, FF/REW with screen off, "Media Library"; formats storage + favourites |
| V3.1.0 | 2026-01-16 | 2026-01-17 / 0.0.0 | `HIFIEC10.IMG` | 32 MiB | 91 | 21 × 450 | 35 % (13 %) | 84 % (77 %) | play all in genre, sleep timer |
| V3.2.0 | 2026-02-10 | 2026-02-08 / 0.0.0 | `HIFIEC20.IMG` | 32 MiB | 91 | 21 × 450 | 35 % (13 %) | 84 % (77 %) | occasional track skipping on play, volume steps 4-5 |
| V3.3.0 | 2026-03-27 | 2026-03-30 / 0.0.0 | `HIFIEC33.IMG` | 32 MiB | 91 | 21 × 450 | 35 % (13 %) | 84 % (77 %) | DSF ID3, library update clearing Favourites |
| V3.4.0 | 2026-04-24 | 2026-04-22 / 0.0.0 | `HIFIEC34.IMG` | 32 MiB | 91 | 21 × 452 | 34 % (13 %) | 86 % (79 %) | button modes A/B, battery level accuracy |
| V3.5.0 | 2026-05-15 | 2026-05-13 / 0.0.0 | `HIFIEC35.IMG` | 32 MiB | 91 | 21 × 452 | 34 % (12 %) | 82 % (74 %) | CD number in album sort, resume from Favourites |
| V3.6.0 | 2026-06-04 | 2026-05-29 / 0.0.0 | `HIFIEC36.IMG` | 32 MiB | 91 | 21 × 452 | 35 % (13 %) | 87 % (80 %) | M4A album sort, Favourites freeze, library update on some microSD cards |
| V3.7.0 | 2026-07-07 | 2026-06-22 / 0.0.0 | `HIFIEC37.IMG` | 32 MiB | 91 | 21 × 453 | 35 % (12 %) | 87 % (80 %) | button mode C, FLAC ID3, Previous-track 3 s rule, faster library; **first 512 MB build** |
| V3.7.0 512M | 2026-07-07 | 2026-07-05 / 0.0.0 | `MINIV370.IMG` | 32 MiB | 91 | 21 × 458 | 34 % (12 %) | 87 % (80 %) | 512 MB variant |
| V3.8.0 | 2026-07-27 | 2026-07-18 / 0.0.0 | `HIFIEC38.IMG` | 32 MiB | 91 | 21 × 453 | 35 % (12 %) | 65 % (33 %) | OGG Previous-track "unsupported", APE/WMA ID3, MP3 covers; **all decoder modules rebuilt** |
| V3.8.0 512M | 2026-07-27 | 2026-07-24 / 0.0.0 | `MINIV380.IMG` | 32 MiB | 91 | 21 × 458 | 34 % (12 %) | 65 % (33 %) | 512 MB variant |
| V3.9.0 | 2026-08-31 | 2026-08-24 / 0.0.0 | `HIFIEC39.IMG` | 32 MiB | 91 | 21 × 453 | 35 % (12 %) | 65 % (33 %) | add-to-Favourites failure, ID3 display; 8 GB + 512 MB in one zip |
| V3.9.0 512M | 2026-08-31 | 2026-08-24 / 0.0.0 | `MINIV390.IMG` | 32 MiB | 91 | 21 × 458 | 34 % (12 %) | 65 % (33 %) | 512 MB variant |
| V4.0.0 | 2026-10-24 | 2026-10-20 / 0.0.0 | `HIFIEC40.IMG` | 32 MiB | 91 | 21 × 453 | 34 % (12 %) | 65 % (33 %) | **M3U playlists**, album sorting, playback response; new ALAC module |
| V4.0.0 512M | 2026-10-24 | 2026-10-23 / 0.0.0 | `MINIV400.IMG` | 32 MiB | 91 | 21 × 458 | 34 % (12 %) | 65 % (33 %) | 512 MB variant |

What the table says:

* **The system-core side is flat across versions.** About 34 % of the AP30's section-0 functions are byte-identical in
  every Echo Mini release (only ~12 % of the bytes: the identical ones are small), 71-74 % identical or merely moved;
  the system overlays ~24 % identical, 46-50 % identical or moved. No Echo Mini version is closer than another: the
  system side forked and both lines kept changing [EM + AP30; interpretation ?].
* **Core B is where the products meet:** up to 87 % of the AP30's 2785 second-core functions are identical (80 % of
  the bytes) in Echo Mini V3.6.0-V3.7.0, falling to 65 % (33 %) from V3.8.0, when FiiO rebuilt every decoder module
  [EM + AP30].
* `HIFIEC39.IMG` (V3.9.0, 8 GB) is the file community projects use as the "revert to stock" image; the SHA-256 of
  `HIFIEC37.IMG` matches the value EchoPod publishes [EM, WEB].

## Second-core decoder modules: one lineage

The same ten decoder modules exist in every Echo Mini release and in the AP30: MP3, WMA, AAC, WAV, OGG, FLAC, ALAC,
APE, DSDIFF, DSF, all linked at 0x01000000 [EM + AP30]. Echo Mini slots are 72-81 up to V1.4.6 and **73-82 from
V1.5.0**, i.e. AP30 number + 1, then + 2 [EM]. No release adds a codec (no Opus, no MP2 on core B) [EM].

Because the modules are linked at a fixed address, identical code gives identical bytes. Comparing the code bytes of
each module with the three AP30 images (`=` = identical code; data not compared) [EM + AP30]:

| Echo Mini | MP3 | WMA | AAC | WAV | OGG | FLAC | ALAC | APE | DSDIFF | DSF |
|---|---|---|---|---|---|---|---|---|---|---|
| V1.2.5-V1.3.0 | = YF18 | = YF18 | = all 3 | = YF05, YF26 | - | - | - | - | - | - |
| V1.4.0-V1.4.6 | = YF18 | = YF18 | = all 3 | = YF05, YF26 | - | = YF18 | - | - | - | - |
| V1.5.0-V1.7.0 | = YF18 | = YF18 | = all 3 | = YF05, YF26 | - | = YF18 | - | - | = YF18, YF26 | - |
| V1.8.0 | = YF18 | = YF18 | = all 3 | - | - | - | - | - | = YF18, YF26 | - |
| V2.4.0-V3.3.0 | = YF18 | = YF18 | = all 3 | - | = YF18 | - | - | - | = YF18, YF26 | - |
| V3.4.0 | = YF18 | = YF18 | = all 3 | - | = YF18 | - | - | - | - | = YF18, YF26 |
| V3.5.0 | = YF18 | = YF18 | = all 3 | - | = YF18 | - | - | - | - | - |
| V3.6.0-V3.7.0 | = YF18 | = YF18 | = all 3 | - | = YF18 | = YF18 | - | - | - | - |
| **V3.8.0-V3.9.0** | = YF05, YF26 | = YF05, YF26 | - | - | = YF05, YF26 | = YF05, YF26 | = YF05, YF26 | = YF05, YF26 | = YF05 | = YF05 |
| V4.0.0 | = YF05, YF26 | = YF05, YF26 | - | - | = YF05, YF26 | = YF05, YF26 | - (new ALAC) | = YF05, YF26 | = YF05 | = YF05 |

YF26 = `HIFIYF26.IMG` (2026-07-23), YF05 = `HIFIYF05.IMG` (2026-08-19, factory), YF18 = `HIFIYF18.IMG` (V1.7.8,
2026-10-19); see [../overview/firmware_releases.md](../overview/firmware_releases.md).

1. **One code base, version for version.** Every AP30 module except V1.7.8's WAV, ALAC and APE is byte-identical to
   some Echo Mini release [AP30 + EM].
2. **Echo Mini V3.8.0 (built 2026-07-18) rebuilt every decoder at once** (all sizes change, e.g. MP3 0x8F68 →
   0x8F5C bytes; the FLAC module gains a long seek debug trace). The AP30's first two images already carry these
   V3.8.0-generation modules (MP3, WMA, OGG, FLAC, ALAC, APE; YF05 also DSDIFF and DSF; both keep an older AAC and WAV),
   YF26 only five days after the Echo Mini build [AP30 + EM].
3. **AP30 V1.7.8 went back to the older generation:** its MP3, WMA, AAC, OGG, FLAC, DSDIFF and DSF modules are
   pre-V3.8.0 Echo Mini ones (OGG of V2.4.0-V3.7.0, FLAC of V1.4.x / V1.5-1.7 / V3.6-3.7, DSF of V3.4.0); its WAV, ALAC
   and APE match nothing in the archive. Hidizs's "playback stutter fixed" may be this rollback [?].
4. **Echo Mini V4.0.0 replaced the ALAC/M4A module** (0x6B44 → 0x853C bytes) with handling for 64-bit MP4 box sizes
   and more debug output, i.e. large or unusual M4A files. No AP30 image has it [EM].

## Update file names

| Image | Template 1 | Template 2 |
|---|---|---|
| AP30, every release [AP30] | `HIFIYF00.IMG` | `ECHOMINI.IMG` |
| Echo Mini 8 GB, every version [EM] | `HIFIEC00.IMG` | `ECHOMINI.IMG` |
| Echo Mini 512 MB, V3.7.0-V4.0.0 [EM] | `MINIV100.IMG` | `MINIMINI.IMG` |

`ECHOMINI.IMG` is the Echo Mini's own second name, kept when Hidizs changed the first template. FiiO's note "copy both
files, the device picks the right one" fits: each variant only knows its own prefixes [EM]. An AP30 image is ignored
by an Echo Mini by name alone; an Echo Mini image named `ECHOMINI.IMG` would be picked up by an AP30, so never leave
one on an AP30's storage (see [../overview/firmware_releases.md](../overview/firmware_releases.md)).

> **Warning**
> Echo Mini firmware is built for different hardware. Do not install it on an AP30. If a wrong image was installed,
> hold **D-pad Right + Power** with USB connected to reach loader USB mode and restore an official AP30 image
> ([../guides/recovery.md](../guides/recovery.md)). Never write physical sectors 0..0x1FFF, never run
> `rkdeveloptool ef`, never download a random loader.

## The Echo Mini's USB DAC is the AP30's dormant overlay 11

Echo Mini V2.4.0 (2025-08-21) "added USB DAC function": driver-free, **48 kHz only**, no exclusive mode, a prompt "USB
DAC or data transfer" on connection [EM, WEB]. In the image, overlay 11 goes from empty to 0xBA4 bytes of code + 0x1280C
bytes of BSS, the USB overlay 9 grows from 0x584 to 0xA88 bytes, and the strings "USB Connection Options", "USB Audio
Decoding…" and "UAC Volume" appear [EM]. All 28 functions of the AP30's overlay 11 are found in V2.4.0's overlay 11 (1
identical, 15 moved, 12 changed); in V1.8.0, 26 of 28 are absent [EM + AP30].

So the AP30's overlay 11 (UAC1 + HID, 48 kHz / 16-bit, I2S1 → CS43198) **is the Echo Mini's USB DAC**, inherited code
the AP30 never selects because its USB DAC mode goes to the Realtek chip [AP30 + EM]. If the AP30's USB data lines can
be switched to the RKNanoD in that mode, the dormant overlay would give a 48 kHz RKNanoD DAC path; the Echo Mini proves
the module works on this SoC [?]. AP30 USB details: [../firmware/usb_modes.md](../firmware/usb_modes.md).

## Code in one product but not the other

**Echo Mini only** [EM] (sections no AP30 section maps to):

* overlay 15: a **system-core MPEG audio decoder** (MP2) and overlay 16: an **AVI parser** = the SDK video player
  ("Video File" in the menus). The AP30 keeps only the "Video files" string.
* overlays 28-29 and 63: **recording** (`U:\RECORD`, Mic / Line In / FM recording strings); overlay 59: a
  **dictionary** ("Copy WOOOOODX.DIC to card!"); lunar-calendar, calculator and stopwatch strings. These are SDK tool
  features, probably unreachable from the Echo Mini UI [?].
* FiiO's later features: USB DAC, M3U playlists, button modes, channel balance, lyrics switch, volume-button swap,
  folder skip, Previous-track 3 s rule.

**AP30 only** [AP30]: the games and BT Music overlays (81-112), the volume-wheel code, AVLS, and Hidizs's own
favourites code (none of its favourites functions exist in any Echo Mini release).

**In neither:** a Bluetooth receive (sink) mode (Bluetooth strings are transmit-side only), gapless-playback strings,
new codecs. The Echo Mini even says "ExFAT Format Not Supported!" [EM]. (The AP30's FAT layer does read exFAT [AP30].)

## Bugs FiiO fixed that match AP30 symptoms

| Echo Mini fix [EM] | AP30 relevance |
|---|---|
| V2.8.0 "changing the drive letter would clear the favorites list"; V3.3.0 "updating the Media Library would accidentally clear Favorites"; V3.9.0 "could not add to Favorites in certain situations" | Same symptom as on the AP30 (favourites vanish after a microSD swap) [AP30]. But Hidizs rewrote favourites (the AP30's favourites code exists in no Echo Mini release, and the library scan code differs a lot), so FiiO's fix cannot be lifted as code. It does show the bug class is real and fixable in the scan path [AP30 + EM] |
| V1.3.0 "music library may update after charging while powered off"; V1.7.0 "cancel automatic media library update at startup" | Related to the AP30's library rebuild after an unclean shutdown [AP30] |
| V3.6.0 "Media Library could not be updated on some micro-SD cards" | possibly the same scan code on the AP30 [?] |
| V3.8.0 OGG "unsupported format" on Previous track, APE / WMA tags missing, some MP3 covers missing | AP30 V1.7.8 has the pre-V3.8.0 decoders: these may show on the AP30 [?: device test needed; tag and cover parts are probably system-core side] |
| V2.5.0 "occasional noise", V1.2.5 "automatic fast-forwarding and noise", V1.6.2 "audio clipping at track start" | audio-path bugs of the shared code base; not checked on the AP30 |
| V3.7.0 Previous-track 3 s rule; V3.4.0 / V3.7.0 button modes; V2.7.0 volume-button swap; V2.8.0 channel balance + lyrics switch; V2.4.0 folder skip; V4.0.0 M3U playlists | features the AP30 lacks; its file-type list ends with DFF / DSF (+ CUE in the browser), no M3U [AP30] |

Known AP30 bugs: [../firmware/known_bugs.md](../firmware/known_bugs.md).

## Debug strings and build clues

| Marker | AP30 V1.7.8 | EM V1.2.5-V1.3.0 | V1.4.0-V1.7.0 | V1.8.0-V3.5.0 | V3.6.0-V3.7.0 | V3.8.0-V4.0.0 |
|---|---|---|---|---|---|---|
| `FILE: %s, LINE: %d:` format strings | 248 | 14 | 16-17 | 13 | 16 | 12 |
| `..\..\Common\…` source paths | 57 | 10 | 11-12 | 9 | 11 | 8 |
| `FLAC seek:` trace (core B) | 0 | 0 | 0 | 0 | 0 | 15 |

The AP30 was built with the SDK's file/line debug format strings enabled in far more source files than any Echo Mini
release, which is why the AP30 image names so many SDK source files [AP30 + EM]. (The AP30's debug output itself goes
nowhere in the release build [AP30].) No compiler or SDK version string differs between the products; the identical
decoder bytes suggest the same toolchain built both [?].

## Echo Mini findings reused for the AP30

From the echo-mini-newfw study and other projects ([community_projects.md](community_projects.md)), checked on the AP30
where marked:

| Finding | Status on the AP30 |
|---|---|
| Mailbox at 0x40110000: per-channel command/data words, A→B at +0x00/+0x04/+0x08+8·ch/+0x0C+8·ch, B→A at +0x28/+0x2C/+0x30+8·ch/+0x34+8·ch; writing the data word sends | confirmed by the AP30 driver [AP30] |
| Decoder control channel 1: 1 OPEN, 4 DECODE, 0xB SEEK (ms), 0xD CLOSE | identical in the AP30 front-ends [AP30] |
| File channel 2: core B asks core A for seek (0x69), read (0x6B), close (0x73) on a descriptor (0x65) | [EM]; front-ends agree [AP30] |
| Decoder info struct (time, length, bitrate, bits per sample, sample rate, channels, PCM pointer, frames) | confirmed at 0x03048AD8 on the AP30 with the same offsets [AP30] |
| Core-B start: clock on, core B reset, module copied into HIGHRAM0, clock info (0x90 bytes) copied to 0x01020000, reset released, wait for "ready" | the AP30 does the same [AP30] |
| Core-B vector table in RAM at 0x01022000 | [EM] |
| MP3 accelerators (IMDCT36 at 0x60010000, SYNTH at 0x60050000) and HIFIACC (FLAC LPC, ALAC filter, APE filters, FFT) | drivers present in the AP30 modules [AP30]; register details [EM] |
| Loader logic (header check, FW2 fallback, markers) | re-derived from the AP30's own loader 4.16 [AP30] |

Details: [../hardware/dual_core.md](../hardware/dual_core.md), [../firmware/core_b_codecs.md](../firmware/core_b_codecs.md),
[../firmware/boot_loader.md](../firmware/boot_loader.md).

## Sibling products

FiiO's CDN also hosts firmware for the Snowsky **ECHO** (V1.2.0-V2.0.0) and **ECHO NANO** (V1.2.0-V2.0.0) [WEB].
They were not downloaded or analysed; whether they use the RKNanoD is not known [?]. One reviewer compares the AP30
with the Echo Nano [WEB].

## Open questions

* Whether AP30 V1.7.8 shows the decoder bugs FiiO fixed in V3.8.0 [?].
* Whether the AP30's USB data lines can reach the RKNanoD in a mode where overlay 11 would work [?].
* Where V1.7.8's WAV, ALAC and APE modules come from [?].
* Whether the German-block menu tree from Echo Mini V3.3.0 is a resource-tool quirk or a real German-menu bug [?].
* Which chip the Snowsky ECHO and ECHO NANO use [?].

## Sources

* [EM] the 30 official Echo Mini images (V1.2.5-V4.0.0) from
  [FiiO's download page](https://forum.fiio.com/note/showNoteContent.do?id=202501210934383987154&tid=17), with FiiO's
  changelogs; [fiio.com V1.6.0 announcement](https://fiio.com/newsinfo/1036917.html);
  [FiiO support article](https://fiiosupport.freshdesk.com/support/solutions/articles/69000869715-how-to-update-the-firmware-for-echo-mini-).
* [EM] [berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw) `ETUDE.md` (MIT);
  [iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw);
  [BasilSkyWalk/echopod](https://github.com/BasilSkyWalk/echopod); [brnomt/ReChord](https://github.com/brnomt/ReChord).
* [WEB] [Head-Fi Echo Mini thread](https://www.head-fi.org/threads/fiio%E2%80%99s-innovative-sub-brand-snowsky-pure-music-player-echo-mini-is-officially-released.975162/page-31);
  [Ichos: Echo Nano review](https://ichos-reviews.com/fiio-snowsky-echo-nano-review/).
* [AP30] analysis of `HIFIYF26.IMG`, `HIFIYF05.IMG` and `HIFIYF18.IMG`; the Echo Mini images were only read, never run.
