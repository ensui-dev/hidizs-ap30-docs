# Community projects

Status: draft, 2026-11

Several community projects work on the AP30 or on its sister player, the Snowsky Echo Mini (same RKNanoD SoC, same
firmware code base). This page lists each one: what it is, its licence, what it found that matters for the AP30, and
where the results in this collection agree with it or correct it. The most important correction: the claim that "there
is no known way to recover an AP30 that won't boot" is **wrong**; an AP30 with a non-booting firmware was recovered
through the boot loader's USB mode on 2026-11-18 [AP30].

## Contents

- [Overview](#overview)
- [AP30: hidizs-ap30-game-emu (nkahoang)](#ap30-hidizs-ap30-game-emu-nkahoang)
- [Echo Mini: echo-mini-newfw and its ETUDE study](#echo-mini-echo-mini-newfw-and-its-etude-study)
- [Echo Mini: ReChord](#echo-mini-rechord)
- [Echo Mini: EchoPod](#echo-mini-echopod)
- [Echo Mini: RECHO](#echo-mini-recho)
- [Echo Mini: echo-mini-opus](#echo-mini-echo-mini-opus)
- [Echo Mini: snowsky-echo-mini-recovery](#echo-mini-snowsky-echo-mini-recovery)
- [Echo Mini: theme and resource editors](#echo-mini-theme-and-resource-editors)
- [Other references](#other-references)
- [Open questions](#open-questions)
- [Sources](#sources)

## Overview

| Project | Device | Kind | Licence | Relevance for the AP30 |
|---|---|---|---|---|
| [nkahoang/hidizs-ap30-game-emu](https://github.com/nkahoang/hidizs-ap30-game-emu) | **AP30** | Game Boy / Game & Watch emulator in a stock game slot; firmware notes | MIT | the only other AP30 project: key ladder, game API, image tools |
| [iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw) | Echo Mini | from-scratch firmware + `ETUDE.md` study | MIT | first public RKNanoD study |
| [berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw) | Echo Mini | the same project, much further along (study of ~5000 lines, 2026-11) | MIT | core-B mailbox protocol, core-B start, accelerators, loader |
| [brnomt/ReChord](https://github.com/brnomt/ReChord) | Echo Mini (FiiO) | from-source firmware | GPL-3.0 (repository) | vendors a Rockchip SDK; mailbox notes; core-B memory budget |
| [BasilSkyWalk/echopod](https://github.com/BasilSkyWalk/echopod) | Echo Mini 8 GB | iPod-style replacement firmware | GPL-3.0 | open-source decoders on core B; Bluetooth module protocol |
| [RECHO](https://recho.atzkey.workers.dev/) | Echo Mini | closed-source replacement firmware 0.10.1 | none stated | same container; user-level facts only |
| [berettavexee/echo-mini-opus](https://github.com/berettavexee/echo-mini-opus) | Echo Mini | binary patching of the stock firmware | see repository | patching approach, `docs/REPORT.md` |
| [TheMVS/snowsky-echo-mini-recovery](https://github.com/TheMVS/snowsky-echo-mini-recovery) | Echo Mini | recovery procedure with rkdeveloptool | see repository | recovery approach on the same SoC |
| [BlackVllad/Echo-Mini-Customizer](https://github.com/BlackVllad/Echo-Mini-Customizer) | Echo Mini | theme / resource editor with Thumb patching | see repository | resource formats, patching technique |
| [losses/flame-ocean-website](https://github.com/losses/flame-ocean-website) | Echo Mini | browser firmware editor | see repository | fonts, image resources, theme patching |

## AP30: hidizs-ap30-game-emu (nkahoang)

**What it is.** A Game Boy emulator (based on Peanut-GB) and a Game & Watch emulator that run in place of stock game
modules in the AP30 firmware V1.7.8, with an unpack/pack tool for the image and a Unicorn-based PC harness that runs
vendor code (window manager, FAT) with the flash access stubbed. Notes in `docs/FINDINGS.md` ("last updated
2026-11-17"). Licence MIT [WEB].

**Their numbering.** Their offsets are *code offsets* = file offset − 0x200. For section 0 their run address is
code offset − 0x2988C + 0x03050000 [WEB + AP30].

### Where our results answer or correct theirs

| Their statement or open question [WEB] | Our result [AP30] |
|---|---|
| "The AP30 has no such hole, so there is **no known way to recover a device that won't boot**"; brick recovery listed as the most important open item | **Disproved on a device, 2026-11-18.** The ~8 s Power long-press is a hardware reset that works whatever the firmware does (it plays the role of the Echo Mini's pinhole); with USB connected and **D-pad Right** held, the boot loader enters loader USB mode (`2207:262d`). A firmware deliberately patched to hang at start-up was restored through that mode. MaskROM was never needed. [../guides/recovery.md](../guides/recovery.md) |
| "Whether a long press on power still works during a hang is not known" | It does: the reset is hardware and works with any software running |
| "Does the loader fall back to fw2?"; "the loader is not in this image" | The loader was read out of the hidden IDB area and analysed: FW2 is tried **only when FW1 fails the loader's header check**, then stays preferred (marker 0x18CF); a hang or crash never triggers it. [../firmware/boot_loader.md](../firmware/boot_loader.md) |
| "What does the loader do with the reboot flag and the 0x5002004C write?" | 0x18AF in that register (`PMU_SYS_REG3`) = enter loader USB mode; the loader turns it into 0x18EF = one more loader-mode boot. The RAM reboot flag at 0x0309FFF0 is not a loader thing: the firmware's boot power-key check reads it |
| A boot-time dual-slot check routine (code offset 0x5EFA0) with a repair table | That routine exists but **nothing calls it in V1.7.8**; its repair logic never runs |
| "Whether the updater accepts an older date is not known" | **No date or version check** in the update scan or the updater. Installing the official V1.7.8 over a build dated later was proven on a device |
| "It does not accept any two digits … opens exactly that name" | Both halves are true: the updater opens the name built from a stored number, but the boot scan first tries `ECHOMINI.IMG`, then `HIFIYF00`..`89`, and stores the number found (last wins). So any `HIFIYFnn.IMG` works; `ECHOMINI.IMG` was proven on a device |
| "What posts the firmware-recovery message?" | Nothing sends it in V1.7.8 |
| "Update write order not traced in full" | FW2: first 8 KiB erased, data in 8 KiB steps, header block last, each block verified; then FW2 is copied over FW1 the same way. [../firmware/update_process.md](../firmware/update_process.md) |
| Their test images only took after formatting internal storage right before copying | Not reproduced: our installs worked without a format. The updater checks nothing about free space or the FAT layout; it aborts if the header check or a file read fails, and deletes the file either way. A file-read failure on that volume is the likely cause [?] |
| "Module 35's table entry would overlap the resident code" | Overlay 35 is data only (0xC834 bytes, no code); it is never loaded as code |
| "Internal storage size: not stated" | ≈ 480 MiB raw (983,040 sectors); full layout measured. [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md) |
| "Purpose of storage unit 1 not identified" | the boot scan sets its size to 200 MiB; its role is still open |
| "Exact DAC part" | CS43198 (spec page, chip marking); the "second DAC" guess comes from the Echo Mini (2 × CS43131) |
| "Platform: Rockchip RKnanoD" | agrees: RKNanoD-G (LFBGA121), confirmed by the chip marking |

### Where they add to ours

| Their result [WEB] | Use |
|---|---|
| Key ladder per button, measured on a device: Right 0, Up ~120, Left 241, Down 365, Select 488 (Back; long press = main menu), Start/Play 610, B 733, A 855; two ladder keys can't be read together, priority Right > … > A | in [../hardware/input.md](../hardware/input.md) |
| Framebuffer pixel order: "pixel x is stored at index x XOR 1" (pairs swapped) | matches the byte-swapped flush path [AP30]. [../hardware/display.md](../hardware/display.md) |
| Game module API (window structure, set window, put pixel, fill rect, draw string, messages, task switch, file open/read/seek/write/create/delete), several checked in emulation, file read + in-place write checked on a device | cross-checked while naming the game code [AP30]. [../firmware/games.md](../firmware/games.md) |
| Game ↔ module map for five games (Snake 81, Minesweeper 88, Make 24 91, 2048 92, Tank Battle ≈ 86) | confirmed and completed for all 29 games (Tank Battle = 86 exactly) [AP30] |
| RAM usable beyond a stock game: data/BSS up to 0x0302FD98 and 0x03084C00-0x0308BC00 used while a game runs | memory budget of a game slot |
| SD card makes itself the current disk on insert (card detect GPIO0_11) | GPIO agrees with ours [AP30] |
| Port of their patch to 5.0.0: 18-24 of 25 functions found by masked signatures, shifted 0x280-0x678 bytes (not constant) | see [../overview/firmware_releases.md](../overview/firmware_releases.md) |
| Unicorn harness | a way to check behaviour claims without a device |

### Agreements

Container layout, header fields, RKCRC32, the image-resource format and big-endian RGB565, 296 × 240, no signature or
encryption, the module table (113 × 8 words), overlays 63-69 = character tables, overlays 71-80 = core-B decoders at
0x01000000, the overlay map, the window structure, key event timing (down after 2 ticks, long press 40, repeat 12),
the 10 ms tick, the framebuffer split, the 0x2000-sector offset of the firmware area, the DAC at I2C 0x66, the RTC-like
device at 0xA2, the dormant USB-audio overlay 11, and the header-last firmware copy [WEB + AP30].

### Hidden games (our addition)

Four complete games have code and task windows but no menu entry (tasks 33 and 44 in overlay 100, 45 in overlay 110,
46 in overlay 111); a slot launcher like the emulator's could start them [AP30]. [../firmware/games.md](../firmware/games.md)

## Echo Mini: echo-mini-newfw and its ETUDE study

**What it is.** A from-scratch Echo Mini firmware (MIT), first published as
[iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw) and continued much further at
[berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw). Its `ETUDE.md` (in French, about 5000
lines by mid-November 2026) is the main public RKNanoD study: boot chain, loader logic, peripherals, mailbox, DMA,
I2S and audio clocks, display, keys, power, eMMC, DAC, USB, and the hardware accelerators [WEB]. The firmware itself
plays WAV, AIFF, FLAC, MP3, Vorbis, Opus, AAC/ALAC, Musepack and WavPack gaplessly, with ReplayGain, a tag library and
a USB sound card mode up to 192 kHz [WEB].

**What it found that carries over** (tag [EM]; confirmed on the AP30 where marked):

* It runs the **stock core-B decoder modules** under its own core-A code, so it documents their interface from the
  outside: mailbox register layout, control commands (1 OPEN, 4 DECODE, 0xB SEEK, 0xD CLOSE: identical in the AP30
  [AP30]), file requests from core B (descriptor 0x65, seek 0x69, read 0x6B, close 0x73; replies 0x6A / 0x6C / 0x74),
  core-B replies (1 ready, 2 open failed, 3 opened, 5 buffer decoded, 6 end or error, 0xC seek done, 0xE closed), and
  the info struct (time, length, bitrate, bits per sample, sample rate, channels, PCM pointer, frames) — confirmed at
  0x03048AD8 in the AP30 with the same offsets [AP30].
* Module numbering: Echo Mini module = AP30 number + 2 (from Echo Mini V1.5.0) [EM + AP30].
* Core-B start sequence (clock on, reset, module load, 0x90-byte clock table copied to 0x01020000, release, wait for
  "ready" ≤ 200,000 × 1 ms); core-B clock selected in `CRU_CLKSEL0` bits 15 and [14:12] [EM]; the AP30 does the same
  [AP30].
* Core-B exception table in RAM at 0x01022000 [EM].
* Accelerators: IMDCT36 at core-B 0x60010000 (18 words in, 36 out, interrupt 7) and SYNTH at 0x60050000 for MP3;
  HIFIACC sequences for FLAC LPC, ALAC adaptive filter (FFmpeg-style prediction), APE filters and FFT [EM]; the AP30
  modules contain the same accelerator drivers [AP30].
* An analysis of the RECHO binary (sections 1.4 and 2.1 of the study) [WEB].

**Where we differ.** Nothing contradicts; our loader analysis was redone on the AP30's own loader 4.16 rather than
taken from the Echo Mini's 4.06 [AP30].

## Echo Mini: ReChord

**What it is.** [brnomt/ReChord](https://github.com/brnomt/ReChord): a from-source custom firmware for the FiiO Echo
Mini (both cores replaced; audio up to 24-bit/96 kHz, gapless within one format), repository licence GPL-3.0 [WEB].

**What it contains that matters.** Its `firmware/rockchip/` directory is, by its own README, a "leaked/reference"
copy of Rockchip's RKNanoD MP3 SDK V1.3 (2016-11), including the core-B runtime sources and the decoder libraries as
prebuilt archives with full symbol tables [WEB]. Comparing those libraries with the AP30's core-B overlays finds 426
of 1747 decoder functions byte-identical (MP3, AAC, WAV + noise suppression, OGG, ALAC, APE; FLAC, DSDIFF and DSF are
other builds; WMA is not in the SDK), which also settled which overlay holds which codec (77 ALAC, 78 APE, 79 DSDIFF,
80 DSF) [AP30]. The system-core EQ and fade libraries match too [AP30].

Other ReChord material [EM]: a mailbox guide (base 0x40110000; channels 0 system, 1 decode, 2 file, 3 debug; decode
commands; file requests 105 seek, 107 read, 109 write, 111 tell, 113 get length, 115 close) that matches what the AP30
front-ends do; and a core-B memory budget (code 0x01000000-0x01020000 = 128 KiB, data 0x01040000-0x01060000), the
same layout as the AP30 [AP30].

**Caveats.** The Rockchip SDK files and libraries inside it are vendor code; the repository's GPL-3.0 cannot cover them
[?]. Its copy of the SDK also differs from the original in places (for example the default fault handler), so it should
not be used as evidence of what stock firmware contains without checking [AP30]. This collection does not reproduce
anything from that SDK.

## Echo Mini: EchoPod

**What it is.** [BasilSkyWalk/echopod](https://github.com/BasilSkyWalk/echopod): a replacement firmware for the Echo
Mini 8 GB with an iPod-style Cover Flow browser, M3U playlists, gapless FLAC/ALAC/MP3/AAC/Opus/QOA/WAV up to 192 kHz,
a 7-band EQ, Bluetooth pairing, and a USB DAC mode; GPL-3.0 [WEB].

**What matters for the AP30.**

* Its core B runs **its own open-source decoders** (libmad, faad2, dr_libs, opus, qoa), one per core-B image loaded at
  0x01000000 on demand, like the stock modules [EM]. A working example of open decoders on this SoC.
* `docs/research.md` documents the **Echo Mini's Bluetooth module UART protocol** (e.g. `CS00` scan, `CL06` connect,
  `CY0 1E` / `CY0 00` stream start/stop) [EM]. The AP30 uses a JieLi chip whose protocol is not yet known to match
  [?]. [../hardware/bluetooth.md](../hardware/bluetooth.md)
* `docs/device-recovery.md` (Echo Mini recovery); it uses the official `HIFIEC39.IMG` as the way back to stock and
  publishes the SHA-256 of `HIFIEC37.IMG`, which matches the official file [WEB + EM].
* Hardware knowledge credited to ReChord [WEB].

## Echo Mini: RECHO

**What it is.** [RECHO](https://recho.atzkey.workers.dev/): a closed-source from-scratch firmware for the Echo Mini,
version 0.10.1 (2026-10-23), file `HIFIEC90.IMG`. FLAC and MP3 decoded on core B "with its hardware accelerators", WAV,
a 10-band EQ; source "will be published after the project matures"; no licence stated [WEB].

**What we found in its file** [AP30, read only]: same RKnanoFW container (valid CRC and header copy), 5,242,884
bytes, header vendor "RECHO", model "2d11bdcd", 91 section slots with code in 9 of them and one core-B module, three
font blobs and no string table or image resources. The AP30 ignores it by file name. Details:
[../overview/firmware_releases.md](../overview/firmware_releases.md#the-non-hidizs-file-hifiec90img-recho).

## Echo Mini: echo-mini-opus

[berettavexee/echo-mini-opus](https://github.com/berettavexee/echo-mini-opus): binary patching of the stock Echo Mini
firmware, with a write-up in `docs/REPORT.md` [WEB]. It shows the patch-in-place route (as opposed to replacement
firmware) on the same code base; nothing in it was needed for the AP30 analysis.

## Echo Mini: snowsky-echo-mini-recovery

[TheMVS/snowsky-echo-mini-recovery](https://github.com/TheMVS/snowsky-echo-mini-recovery): a recovery procedure for
the Echo Mini with rkdeveloptool [WEB]. The AP30 path differs in its entry (8 s Power long-press with D-pad Right and
USB, instead of the Echo Mini's pinhole) and in the tool behaviour (rkdeveloptool's `rl` hangs on the AP30's loader
4.16, so reads need small requests and a timeout-aware client) [AP30]. [../guides/recovery.md](../guides/recovery.md)

> **Warning**
> Echo Mini recovery guides are not AP30 guides. Never run `rkdeveloptool ef` and never download a loader (`db` /
> `ul`) to an AP30; never write physical sectors 0..0x1FFF. Use the AP30 procedure in
> [../guides/recovery.md](../guides/recovery.md).

## Echo Mini: theme and resource editors

* [BlackVllad/Echo-Mini-Customizer](https://github.com/BlackVllad/Echo-Mini-Customizer): theme and resource editing,
  Thumb instruction encoders and code caves for patches; includes "brick and fix" diagrams (not reviewed here). Nothing
  on the decoders or core B [WEB].
* [losses/flame-ocean-website](https://github.com/losses/flame-ocean-website): a browser-based firmware editor for
  fonts, image resources and theme patching (with a Thumb decoder to find colour references). Nothing on the decoders
  or core B [WEB].

Both target the Echo Mini's resource layout (320 × 170 images, 0x102-byte string records); the AP30 uses the same
formats with 296 × 240 images and, in V1.7.8, 0x112-byte string records [AP30].
[../formats/resources.md](../formats/resources.md), [../guides/modifying_resources.md](../guides/modifying_resources.md)

## Other references

* [hifioasis AP30 page](https://www.hifioasis.com/dap/hidizs-ap30-music-boy/): a spec summary (RKNanoD, CS43198 +
  RT6863, DSD64/128/256, WAV/FLAC 24/192, APE 24/96, 5-band EQ, "gapless yes", "potentially a track limit of 10,000
  tracks") [WEB]. Two points differ from the firmware: playback is **not gapless** (up to V1.7.8; V1.8.3 is gapless
  only for FLAC → FLAC of the same format), and the media library stops at **7,168 song records** [AP30].
* [Qiita: RKNanoD notes (eggman)](https://qiita.com/eggman/items/7822981acba166469e49): memory map from the system
  core's view and pointers to SDK trees [WEB].
* Rockchip's own open-source repositories (rkdeveloptool, rkbin, u-boot, kernel):
  [rockchip_rknano_family.md](rockchip_rknano_family.md#the-family-in-rockchips-open-source-tools).

## Open questions

* Whether the AP30's JieLi Bluetooth chip speaks the same UART protocol EchoPod documents for the Echo Mini's module
  [?].
* Why the game-emulator project's updates needed a format right before copying [?].
* Whether EchoPod's or ReChord's open decoders would run unchanged on the AP30's core B (same SoC, different board) [?].

## Sources

* [WEB] the repositories and pages linked above (read 2026-11-14 to 2026-11-18; README and study files read in full
  where cited).
* [AP30] our analysis of firmware V1.7.8 (and 5.0.0 / 0.0.0 where named), the boot loader 4.16, and recovery tests on a
  retail device.
* [EM] facts from the Echo Mini projects, not yet checked on the AP30 unless marked.
