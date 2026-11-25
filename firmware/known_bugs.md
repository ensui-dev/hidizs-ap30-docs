# Known firmware bugs

Status: draft, 2026-11

Every bug, flaw and oddity found so far in the stock AP30 firmware (V1.7.8 unless another version is named), in the
Rockchip SDK code it is built on, and in the codec and helper libraries it contains, found by analysing the code and,
where marked, confirmed on a device. They are grouped by subsystem. Each entry has a short title, what happens, the
impact and what triggers it, a workaround where one exists, the origin of the code and a tag. User reports (what
owners notice) are collected separately on [community/user_feedback.md](../community/user_feedback.md).

**How to read the tables**

* **Origin**: *Hidizs* = code Hidizs wrote or changed; *SDK* = Rockchip's RKNanoD SDK source as shipped to vendors;
  *library* = a Rockchip-built codec or helper library (most derived from open-source projects, see
  [third_party_components.md](third_party_components.md)); *C library* = Arm's micro-library.
* **Tag**: **[AP30]** = confirmed in the firmware code (or on a device where it says so); **[AP30, ?]** = the code
  looks wrong but the intent or the effect is not proven. "Harmless" means no visible effect in the shipped image.
* **Workaround**: "–" = none known, or not needed.
* Addresses (section/overlay and address) are given where they help others find the code.

## Contents

- [Most visible bugs](#most-visible-bugs)
- [Boot, system and update](#boot-system-and-update)
- [Power, battery and clocks](#power-battery-and-clocks)
- [Drivers: I2C, SPI, I2S, DAC, storage controller](#drivers-i2c-spi-i2s-dac-storage-controller)
- [Display, text and input](#display-text-and-input)
- [File system (FAT / exFAT)](#file-system-fat--exfat)
- [Media library, favourites, tags and CUE sheets](#media-library-favourites-tags-and-cue-sheets)
- [Playback engine, EQ and now-playing screen](#playback-engine-eq-and-now-playing-screen)
- [Settings, browser, e-book and other UI](#settings-browser-e-book-and-other-ui)
- [USB](#usb)
- [Bluetooth](#bluetooth)
- [Image viewer decoders (JPEG, BMP)](#image-viewer-decoders-jpeg-bmp)
- [Core-B codec modules, general](#core-b-codec-modules-general)
- [MP3 decoder](#mp3-decoder)
- [AAC decoder](#aac-decoder)
- [WAV decoder](#wav-decoder)
- [OGG Vorbis decoder](#ogg-vorbis-decoder)
- [FLAC decoder](#flac-decoder)
- [ALAC and APE decoders](#alac-and-ape-decoders)
- [DSD decoders (DSF, DSDIFF)](#dsd-decoders-dsf-dsdiff)
- [WMA decoder and DRM](#wma-decoder-and-drm)
- [C library](#c-library)
- [Games](#games)
- [Fixed by Hidizs](#fixed-by-hidizs)
- [Limitations documented by Rockchip](#limitations-documented-by-rockchip)
- [Errors in Rockchip documentation](#errors-in-rockchip-documentation)
- [Errors in public reference material](#errors-in-public-reference-material)
- [Compliance](#compliance)
- [Open questions](#open-questions)
- [Sources](#sources)

## Most visible bugs

The ones an owner is most likely to notice, with links to the full entries:

| Bug | Section |
|---|---|
| Favourites lost after a microSD card swap (device-confirmed) | [media library](#media-library-favourites-tags-and-cue-sheets) |
| Every track fades out at the end and leaves a gap, gapless albums included (V1.8.3: except FLAC → FLAC of the same format) | [playback](#playback-engine-eq-and-now-playing-screen) |
| Shuffle never picks the last file of the list | [playback](#playback-engine-eq-and-now-playing-screen) |
| EQ presets Metal, Pop, Jazz, Unique play the wrong curves | [playback](#playback-engine-eq-and-now-playing-screen) |
| EQ / effects skipped for 192 kHz, DSD and ≥ 24-bit playback | [playback](#playback-engine-eq-and-now-playing-screen) |
| DSD512 (and any other unusual DSD rate) shown as "DSD64" | [playback](#playback-engine-eq-and-now-playing-screen) |
| APE track numbers ignored in the library | [media library](#media-library-favourites-tags-and-cue-sheets) |
| Wrong free space for exFAT cards | [file system](#file-system-fat--exfat) |
| Fast wheel turns lose volume steps | [input](#display-text-and-input) |
| Play/pause refused with the screen off in "Prev/Next" mode | [input](#display-text-and-input) |
| About page shows a hard-coded version | [UI](#settings-browser-e-book-and-other-ui) |
| Ogg files with more than 8 comments (or a long comment) corrupt memory | [OGG](#ogg-vorbis-decoder) |
| Long FLAC files (over ~1.7 h at 44.1 kHz) get a wrong length | [FLAC](#flac-decoder) |
| Box Pusher levels 12, 24, 33, 41, 45 can be solved with a target uncovered | [games](#games) |

## Boot, system and update

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Firmware-recovery screen call jumps into unrelated code | The main menu's "firmware recovery" message handler calls a display routine that lives in the library-rebuild overlay. Both overlays share one code window, so from the main menu the call lands in the middle of the main menu's own service routine (overlay 21, call at 0x0308175e to 0x030816c6); in the rebuild overlay that address is an empty return. | Only if the recovery message is ever raised in the main menu; undefined behaviour. | – | SDK / Hidizs | [AP30] |
| Unused "newest copy wins" check would mis-handle a stale header | The never-called date check (overlay 1) searches FW2 from the end of FW1 in 1 MiB steps and stops at the first magic; on a unit with an old header left between the slots it would treat FW2 as invalid. | None in V1.7.8 (not called). Matters if a future build calls it. | – | Hidizs / SDK | [AP30] |
| RTC reset writes a garbage weekday | When the RTC time is invalid (first boot, RTC failure) the boot code writes 2026-08-19 09:00, but the day counter used to compute the weekday is never initialised (section 0, loop at 0x030634ec). | Wrong weekday in the RTC after a reset; the UI does not show a weekday as far as known. | Set the date in Settings → Date/Time [?: whether the editor rewrites the weekday is not checked] | Hidizs | [AP30] |
| Software clock: month lengths shifted by one | The software calendar indexes its month-length table with month 1-12 instead of 0-11: each month gets the next month's length, December reads past the table, the leap day lands in March (section 0, 0x03066b7c, read at 0x03066d64). | Wrong date rollover where this clock is used. | Re-set the date [?] | Hidizs | [AP30] |
| USB attach check returns garbage | When USB power appears while the player runs, the attach-detection routine returns without setting its result (0x030665ae-0x030665b2); the caller may read it as a failure. | Occasional wrong handling of a USB plug-in [?]. | Re-plug | Hidizs | [AP30] |
| Interrupt priority stored as 0x3FF8 | The NVIC priority table at 0x03082B84 stores 0x3FF8 for "lowest"; it works as 0xF8 only because the spill into the next byte is overwritten. | Harmless. | – | Hidizs | [AP30] |
| Barrier intrinsic stronger than asked | The memory-barrier helper executes a DSB instead of a DMB (both cores). | Harmless. | – | SDK | [AP30] |
| SysTick reference-clock check tests the wrong bit | Tests the "skew" bit (30) instead of "no reference" (31), so it duplicates the calibration check. | Harmless (result unused). | – | SDK | [AP30] |
| Dead countdown helpers | Two countdown start / stop routines (0x03053d80 / 0x03053d98) have no callers. | Harmless. | – | Hidizs | [AP30, ?] |
| UART2 gated at boot | The boot clock setup gates UART2's clocks where the SDK left them on (consistent with its reset being held). | Harmless; relevant for custom firmware. | – | Hidizs | [AP30] |

## Power, battery and clocks

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Power-off request repeated while Power is held | Once Power is held past 200 key steps, the power-off message is resent every 12 steps (the SDK's "already handled" guard is gone). | Repeated power-off requests during the ~2 s → off sequence; no known visible harm. | – | Hidizs | [AP30] |
| Out-of-range sleep-timer value survives loading | The settings loader's range check for the sleep timer (> 5) writes back the same unchecked value (overlay 1, 0x0308241a); the timer then indexes a 6-entry table with it. | Only with a corrupted settings block; random sleep-timer period. | Factory reset | Hidizs | [AP30] |
| VDD-core adjust is a stub | The core-voltage adjust routine returns the last level without switching anything (the SDK switched 1.2 / 1.0 V on a GPIO); the charge-state / current functions are stubs too. | None known; the voltage is fixed. | – | Hidizs | [AP30, ?] |
| Dead word in the charge-full check | A new data word is cleared on every check and never read. | Harmless. | – | Hidizs | [AP30, ?] |
| Unused backlight mode table | An SDK backlight-mode table is still in the image, unreferenced. | Harmless. | – | Hidizs | [AP30, ?] |

## Drivers: I2C, SPI, I2S, DAC, storage controller

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| I2C close sets the wrong GPIO bank | On close, the pins of I2C0 port C and I2C1 port B get their direction set on GPIO bank 2 instead of their own bank (copy-paste from the SDK, kept by Hidizs for those two ports). | Stray direction changes on GPIO2 pins when those buses are closed. | – | SDK | [AP30] |
| I2C2 port A muxes only SCL | The pin setup for I2C2 port A muxes the clock pin but not the data pin. | Unused port on the AP30 [?]. | – | Hidizs | [AP30, ?] |
| I2C NAK message reads past the buffer | NAK diagnostics print the 5th byte of the buffer even for shorter writes (output is disabled in this release). | Harmless read. | – | Hidizs | [AP30, ?] |
| 96 kHz MCLK divider looks inconsistent | 96 kHz gets divider 4 while 64 / 88.2 / 128 / 176.4 / 192 kHz get 2. | Possibly wrong clocking at 96 kHz [?]. | – | Hidizs | [AP30, ?] |
| I2S1 pins muxed twice | The new I2S pin helper sets port A's pins twice. | Harmless. | – | Hidizs | [AP30, ?] |
| I2S1 clock table entry for 64 kHz does not fit | The divider for 64 kHz does not match the master clock it gets. The Echo Mini community measured 11.025 / 22.05 / 64 / 128 kHz broken and 176.4 kHz 0.28 % off with the same tables [EM]. | Wrong pitch or failure for those rates [?]. | Convert files to 44.1 / 48 kHz families | SDK | [AP30, ?] |
| Playback stop resets the wrong I2S block | The stop path stops and resets I2S0 while playback runs on I2S1 (the start path resets I2S1). | Possibly I2S1 left running after stop [?]. | – | Hidizs | [AP30, ?] |
| CS43198 "low gain" writes a reserved value | Low gain writes 0x10 to register 0x080000, a value the CS43198 data sheet marks reserved (high gain 0x31 is documented). | Undefined DAC behaviour in low gain [?]. | – | Hidizs | [AP30, ?] |
| CS43198 crystal setting does not match the board | The firmware selects the 22.5792 MHz crystal setting and a crystal bias that does not match the data sheet, while the board's crystal is 24.576 MHz. | Possibly sub-optimal clocking [?]. | – | Hidizs | [AP30, ?] |
| eMMC clocked above spec | The storage is clocked at 48 MHz right after identification in legacy mode, and also when the card only reports 26 MHz high-speed (SDK: 25 MHz); both above the JEDEC 26 MHz limits (0x03060478, 0x030605c6). | Works on the fitted part; risk with other parts. | – | Hidizs | [AP30, ?] |
| ALC5633 driver compiled in | A complete driver for a Realtek ALC5633 codec (from Rockchip's old reference board) is in the image; nothing calls it. | Harmless. | – | Hidizs | [AP30, ?] |

## Display, text and input

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Fast wheel turns lose steps | The wheel step backlog is capped at one and the UI takes one step per request. | Spinning the wheel quickly changes the volume by fewer steps than turned. | Turn slowly | Hidizs | [AP30] |
| Play/pause refused with the screen off in mode 0 | In Screen-Off Button mode 0 ("Prev/Next Enabled") the right pill is not accepted; only mode 3 accepts play/pause. | Pocket play/pause does not work in the default-looking mode [?: from code, untested]. | Use "All Buttons Enabled" | Hidizs | [AP30, ?] |
| Ladder gaps mean "no key" | ADC values between key ranges (70-99, 184-199, 310-319, 430-441, 680-699) are ignored instead of snapping to the nearest key; A sits 5 codes from its range edge on one measured unit. | A button whose resistor drifts (age, temperature) can stop working. | – | Hidizs | [AP30, ?] |
| Fill-rectangle ignores its colour | The panel driver's fill function (overlay 4) always writes 0. | Fills come out black where another colour was asked [?]. | – | Hidizs | [AP30, ?] |
| Popup backdrop dimming uses wrong colour maths | The "80 %" backdrop (0x03065472) scales 5/6-bit components as if they were 8-bit: red and blue end at ~10 %, green ~20 %. | The area behind popups looks dark and greenish instead of slightly dimmed. | – | Hidizs | [AP30, ?] |
| Window clamp off by one | In one orientation mode the window end is checked with `>` height instead of height − 1. | Harmless with the shipped coordinates. | – | SDK | [AP30] |
| Display DMA without a free-channel check | The DMA transfer routines start DMA without checking that a channel was free (channel 0xff possible). | Only if all channels are busy [?]. | – | Hidizs | [AP30, ?] |
| Second frame-buffer piece not offset | A blend helper's lower-buffer branch does not subtract the 190-row offset; the 100 × 100 area that uses it cannot reach those rows. | Unreachable. | – | Hidizs | [AP30, ?] |
| Marquee scrolls past the end | The scrolling-text routine compares before incrementing and can scroll two characters past the limit. | Cosmetic. | – | Hidizs | [AP30, ?] |
| One extra text line in a rectangle | Text-in-rectangle uses `>` instead of `>=` for the last line. | Cosmetic. | – | Hidizs | [AP30, ?] |
| Message box ignores its hold time | Always closes after 1 s; portrait and landscape branches identical. | Cosmetic. | – | Hidizs | [AP30, ?] |
| Picture viewer decodes ahead into the visible buffer | "Decode next image in advance" is on with only one frame buffer; requests for other layers are refused, so the decoded-ahead image goes into the buffer on screen. | Possible flashes or artefacts in the picture viewer. | – | Hidizs | [AP30, ?] |

## File system (FAT / exFAT)

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| **Wrong free space for exFAT cards** | The exFAT free-space counter (overlay 7, 0x03081924) (a) adds the boot-sector value into a shift count (operator precedence), so every bitmap sector after the first is read from a wrong address; (b) assumes the bitmap is contiguous; (c) counts only the first 256 bytes of each 512-byte sector; (d) above 5 % use replaces the count by a percentage estimate. | Settings → About and other places show wrong free space on exFAT media. | Format the card FAT32 [?: FAT32 path not checked for errors] | Hidizs | [AP30] |
| exFAT "already exists" test reads the wrong bytes | The exFAT branch of the directory-entry search compares against the stack copy of a pointer instead of the entry it points to. | Possible duplicate or failed file creation on exFAT [?]. | – | Hidizs | [AP30] |
| exFAT bitmap update loses changes across sectors | The bitmap writer reads each sector into one buffer but writes back only the last; a run crossing a sector boundary loses the earlier changes (0x0305b1be). | Latent: all current callers change one cluster at a time. | – | Hidizs | [AP30] |
| exFAT bitmap position assumed | The bitmap sector is computed as if the allocation bitmap starts at cluster 2 instead of reading its real first cluster. | exFAT volumes laid out differently could be corrupted on write. | Format the card in the player | Hidizs | [AP30, ?] |
| exFAT label write can write garbage | Writing a volume label on exFAT when no label entry exists writes an uninitialised entry instead of the label entry (0x0305e7d4 → 0x0305e800). | Garbage directory entry. | – | Hidizs | [AP30] |
| Invalid exFAT end-of-chain mark | When a contiguous file is converted to a FAT chain, the end mark is written as 0x7FFFFFFF in one place (0x0305e514) instead of 0xFFFFFFFF. | Possible exFAT corruption when a contiguous file is extended. | – | Hidizs | [AP30] |
| Hidden files not hidden on exFAT; raw 8.3 names | File creation on exFAT ignores the attribute (always 0x20) and stores the raw 11-byte 8.3 name with spaces and no dot. | Files the firmware creates on exFAT look odd on a PC. | – | Hidizs | [AP30] |
| Long-name copy copies 10 bytes of stack | A directory-chain read copies 0x2a bytes from a 0x20-byte buffer (0x0305b376 / 0x0305b37e). | Stack garbage in a structure. | – | Hidizs | [AP30] |
| CUE file search overruns 2 bytes | Three 0x100-byte reads into buffers spaced 0xfe apart; the last overruns 2 bytes past 0x030489d8. | Memory corruption with CUE files [?: effect]. | – | Hidizs | [AP30] |
| exFAT name length uninitialised | When the second entry of a set is not a stream entry, the name length is used uninitialised (0x0305c2f2-0x0305c306) and the name loop can overflow. | Crafted or corrupt exFAT directory. | – | Hidizs | [AP30] |
| File write returns nothing on a bad handle | Returns no value when the handle number is out of range. | Garbage result [?]. | – | SDK | [AP30] |
| Library-tree file counts 0 on exFAT | The database-mode file counters walk without counting and return no value, and are called on exFAT whatever the mode. | Directory counts in database views are 0 on exFAT [?]. | – | Hidizs | [AP30, ?] |
| Directory change copies uninitialised values | In database mode two locals are never set but copied into the saved directory chain. | Unknown [?]. | – | Hidizs | [AP30] |
| Saved non-root directory followed as a FAT chain | Restoring a saved directory keeps only its start cluster; for a contiguous exFAT directory the stale flag makes it be followed as a FAT chain. | Wrong directory contents after returning to a folder on exFAT [?]. | – | Hidizs | [AP30, ?] |
| Name buffers half-cleared, wrong entry type skipped | Two counters clear only 0x100 of a 0x400-byte name buffer, skip an entry type that does not exist in exFAT, and one copies the name twice. | Minor. | – | Hidizs | [AP30, ?] |
| exFAT size check can never fail | The 64-bit total-sector count is cut to 32 bits before the "more than 2^32 sectors" check (~0x030583c6). | Volumes above 2 TiB keep a truncated size. | – | Hidizs | [AP30, ?] |
| exFAT close writes size twice | On close the file size is written to both "valid data length" and "data length" (fine for sequential writes); an unused long-name buffer is built. | Harmless for normal use. | – | Hidizs | [AP30, ?] |
| Dead second file-system probe; empty format branches | A second probe routine (0x0305892c) has no caller; the formatter keeps empty branches where the SDK created folders. | Harmless. | – | Hidizs | [AP30] |

## Media library, favourites, tags and CUE sheets

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| **Favourites lost after a microSD swap** | Favourites are stored per disk as {directory cluster, entry index}. Every library rebuild keeps only the entries of the list *currently in RAM* that it meets on the scanned disk and saves the result to the *current* disk's block. Card-change paths switch disk and rebuild without reloading that disk's list. Removing the card rebuilds internal storage with the card's list in RAM (no matches → empty); reinserting rebuilds the card with that empty list and overwrites its saved favourites (overlay 38). | **Device-confirmed.** Removing and reinserting the card clears favourites. A hard power cut with the card in keeps them. | Don't swap cards if favourites matter | Hidizs | [AP30, device] |
| Adding an artist / album / genre adds one song | The "add group to favourites" routine ignores the item count (overlay 25, 0x030833c8). | Only one song of the group is added. | Add songs one by one | Hidizs | [AP30] |
| "Add to favorites" on a top-level group reads a wrong sector | Passes a RAM address (0x03023b9c) as a sector number to the summary reader (overlay 25, 0x03083186-0x030831ac). | Wrong base song and count for the group. | – | SDK + Hidizs | [AP30] |
| Deleting / clearing favourites while playing from them | The checks that would stop the player are discarded; some cases newly set a "save resume" flag. | Player keeps playing a removed list [?]. | Stop playback first | Hidizs | [AP30, ?] |
| APE track numbers ignored | APE tag track numbers go to a field the library scan does not read. | APE files sort without track numbers. | Use another container / tag format | Hidizs | [AP30] |
| WAV LIST/INFO fallback reads at the wrong offset | The WAV tag reader passes the chunk size as both size and file offset (0x0306ab02); the size variable is uninitialised unless a "data" chunk was seen. | WAV INFO tags often not found [?]; tags at the end of the file still work. | – | Hidizs | [AP30] |
| WAV INFO parser counter reuse | The scan counter is reused as a padding counter after the track tag, the routine always returns failure, entry sizes are read from one byte, and text starts one byte early (0x0306a924). | WAV INFO tags garbled or missed. | – | Hidizs | [AP30] |
| Tag fields overrun by 2 bytes | Several readers copy 0x100 bytes into 0xfe-byte fields; the last one clobbers the album-artist field's first character. | Harmless in practice. | – | Hidizs | [AP30] |
| WMA tag reader overflows | Title / author copies take up to 0x100 bytes into 0x80-byte fields; a track-number value can be written up to 0x80 bytes past a stack buffer; a zero-length value writes its terminator into the previous field (overlay 37, 0x03081f96 / 0x030821a4). | A crafted WMA file can overflow the stack; long titles bleed into album / genre. | Avoid untrusted WMA files | Hidizs | [AP30] |
| WMA tag refill reads 0 bytes | When the position passes 512 it resets to 0 and reads nothing. | Harmless. | – | Hidizs | [AP30] |
| CUE tracks inherit track 1's title / performer | A CUE track without its own TITLE / PERFORMER takes the first track's (or the album performer); an album field checked first is never filled. | Wrong titles / artists for CUE tracks. | Give every CUE track TITLE and PERFORMER | Hidizs | [AP30] |
| CUE pregaps ignored | INDEX 00 no longer ends the previous track; only the next INDEX 01 does. | Pregaps are played as part of the previous track. | – | Hidizs | [AP30] |
| CUE parser returns garbage | A plain `return` in an integer function on one path. | Garbage result [?]. | – | SDK | [AP30] |
| CUE track IDs mix performer and digits | The track ID gets two performer characters followed by the track digits. | Odd sort keys [?]. | – | Hidizs | [AP30, ?] |
| CUE flag not reset | After a CUE file, later plain files keep the CUE flag until a directory change. | Plain files treated as CUE tracks [?]. | – | Hidizs | [AP30, ?] |
| CUE de-duplication stops after 40 sheets | Disabled once 40 CUE names are stored. | Duplicate entries with many CUE sheets. | – | Hidizs | [AP30] |
| CUE title truncated | The title is read with a 64-character limit although the field holds 128. | Long CUE titles cut. | – | SDK | [AP30] |
| Favourites shift loops copy one entry too many | Remove / add-when-full copy the count / magic word into the last entry, then overwrite it. | Harmless. | – | Hidizs | [AP30] |
| Copy of a 14-byte string copies 20 bytes | A "play all albums" label copy reads 4 bytes of following code. | Harmless. | – | Hidizs | [AP30] |
| Uninitialised result for play lists | A result variable is uninitialised for one sort type and the default case. | Unknown [?]. | – | SDK | [AP30] |
| Debug traces left in the rebuild | "save okrrrr…"-style printf traces remain in the library rebuild (output disabled). | Cosmetic. | – | Hidizs | [AP30] |
| Dead volume handlers in the library menu | Volume up / down routines with no callers. | Harmless. | – | Hidizs | [AP30] |

Library limits (7,168 songs, 28,672 entries, 8 folder levels, 500 favourites) are design limits, described on
[storage_and_filesystems.md](storage_and_filesystems.md).

## Playback engine, EQ and now-playing screen

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| **Every track fades out and leaves a gap** | Each track is faded out over its last ~250 ms (from ~300 ms before the end), gapless albums included. V1.8.3 removes both for FLAC → FLAC with the same rate, bit depth and channels (device-confirmed) and keeps them for every other transition; then I2S stops, core B restarts with a module reload, and a fixed 80 ms wait follows. | ~100-280 ms of silence and a fade at every track change (estimate). | – | Hidizs | [AP30] |
| **Shuffle never picks the last file** | Shuffle picks `tick % total` (0 … N−1) as a 1-based file number (0x0305e982): 0 can be chosen (an invalid id) and the last file is never chosen. | One track per list never plays in shuffle; occasional invalid pick. | – | Hidizs | [AP30] |
| Shuffle seed loop never advances | The seed loop never increments its counter; it ends only when the seed differs from the old seed and the current file. | Harmless in practice. | – | SDK | [AP30] |
| **EQ presets use the wrong curves** | Hidizs renumbered the EQ modes (Normal 0, Bass 1, Metal 2, Pop 3, Jazz 4, Unique 5, Custom 6, …) but the gain table still has the SDK's 4 rows (overlay 33, 0x030481e8): Metal and Pop get the SDK's Jazz / Unique curves, Jazz and Unique read the bass-boost and "use EQ" rows, two more modes read past the table. | Audible: Metal, Pop, Jazz and Unique do not sound as named. | Use Normal, Bass or Custom EQ | Hidizs | [AP30] |
| EQ / effects skipped for hi-res | V1.7.8 skips the per-block EQ / effect call at 192 kHz, for DSD, or when a stream field (bit depth [?]) is ≥ 24; 5.0.0 gated it on the preset only. | Custom EQ and presets probably have no effect on hi-res playback [?]; likely a CPU-budget (stutter) fix. | – | Hidizs | [AP30, ?] |
| "All-zero custom EQ" check reads past the array | Loops over 31 entries of a 5-entry gain array. | The "flat custom EQ → normal" shortcut almost never fires. | – | SDK | [AP30] |
| EQ coefficient function declares the rate as short | 44.1 / 48 kHz cases only work because the caller has no prototype; one coefficient is truncated to 8 bits in some cases; a Chinese debug print on every load (output disabled). | Works by accident. | – | library | [AP30] |
| Fade divide by zero / no return | The fade init divides by the length (0 → no fade movement); the finish function returns nothing. | Edge cases only. | – | library | [AP30, ?] |
| Dead EQ code | Several filter helpers (416 bytes resident) and the EQ state-clear routine have no callers (so the EQ filter state may never be cleared [?]). | Possibly a click when EQ changes [?]. | – | library | [AP30] |
| Resume saves an uninitialised file number | If the current file number is 0 and the lookup also returns 0, an uninitialised register is saved as the resume file (overlay 34, 0x0308ff4c-0x0308ff70). | Resume jumps to a random track [?]. | – | Hidizs | [AP30] |
| **DSD512 shown as "DSD64"** | Any DSD rate other than DSD64/128/256 falls back to the text "64". | Wrong label. | – | Hidizs | [AP30] |
| 8-bit PCM shown as DSD | The DSD / PCM label depends only on bits per sample < 10. | 8-bit PCM labelled "DSD". | – | Hidizs | [AP30, ?] |
| Backward step seek uses forward values; double step | The backward step seek sets the forward state values, and both step seeks send the seek command twice. | Possibly two steps per press. | – | Hidizs | [AP30] |
| File name scrolls over the wrong background | The scrolling name uses one background image while the line uses another. | Possible visual glitch. | – | Hidizs | [AP30, ?] |
| Lyrics: uninitialised times | Previous / next lyric times can be uninitialised when no tag qualifies. | Wrong lyric timing [?]. | – | SDK | [AP30] |
| Lyrics: buffer overflow on long lines | The lyric buffer has no bounds check, and the AP30's second pass (translation line) appends to the 2 KB buffer. | Very long lyric lines overflow. | Keep .lrc lines short | SDK / Hidizs | [AP30] |
| Lyrics UTF-8 decoder writes 32 bits per character | Stores 4 bytes into a 2-byte slot (0x03054e22). | 2-byte overrun at the buffer end. | – | Hidizs | [AP30] |
| Lyrics UTF-8 check too permissive | Accepts invalid 5-7 byte lead bytes, checks only the first 20 characters of long buffers, can read past the end (0x03054bd2). | Mis-detected encoding. | – | Hidizs | [AP30] |
| Lyrics: wasted reads, dead copy routine | Three flash reads whose result is unused; a byte-swap routine with a precedence bug and no callers. | Harmless. | – | Hidizs | [AP30] |
| OGG frequency profile falls into APE's | A range test in the clock-profile exit is always true and has no break. | Harmless. | – | SDK | [AP30] |
| File close returns garbage | Declared to return a value, returns nothing. | Harmless [?]. | – | SDK | [AP30] |
| DSF debug print on every buffer | A debug print per decoded DSF buffer (text says "dff"); empty traces in APE close; a copy-pasted error text (output disabled). | Cosmetic. | – | Hidizs | [AP30] |
| exFAT folder mode passes the wrong mode | The exFAT folder path calls the file counter with the file-system mode where the other path uses the library mode. | Unknown [?]. | – | Hidizs | [AP30, ?] |
| Dead branches and handlers | A WAV early return that is never taken; now-playing volume handlers with no callers. | Harmless. | – | Hidizs | [AP30] |
| Core-B file-service message reused | Message 0x74 means both "close result" and "stop"; a failing close would be read as a stop request. | Edge case [?]. | – | SDK | [AP30, ?] |
| **V1.8.3 gapless: elapsed time wrong after a seek** | After a seek or fast-forward inside a track that was entered gaplessly, the elapsed time (and the saved resume point and A-B points) is computed against the previous track's length: it shows 0:00 or a value one previous-track-length too small until the next gapless transition. | Wrong time display and resume point in gapless FLAC albums. | – | Hidizs | [AP30 V1.8.3, code; device check pending] |
| **V1.8.3 gapless: title switches early** | The title, tags and track time switch to the next track when the second core has read a few KiB into it, not when it is heard: estimated 0.1-0.5 s early, and the new track's clock starts ~0.1-0.3 s ahead. | Cosmetic. | – | Hidizs | [AP30 V1.8.3, code; size: ?] |
| **V1.8.3 gapless: seek near the end of a chained track** | Cancelling a prepared gapless transition (seek in the last ~1 s) resets the second core's limits even when the current track was itself entered gaplessly. | The track may end early. Rare. | – | Hidizs | [AP30 V1.8.3, code; ?] |
| **V1.8.3 gapless: audio interrupts held off during the next-file lookup** | The next file is found and opened with the audio refill and mailbox interrupts masked around each file-system call. | A slow directory walk (big folder, slow card) could cause a dropout ~1 s before the end of a FLAC track. | – | Hidizs | [AP30 V1.8.3, code; risk only] |
| **V1.8.3 gapless: limited cases** | Only FLAC → FLAC with the same rate, bit depth and channels, in sequential play or folder repeat; not shuffle, repeat one, CUE tracks, or a FLAC file that starts with an ID3v2 tag. A seek in the last ~128 KiB of a track disables it for that transition. No encoder-delay handling for MP3 / AAC (no gapless for them at all). | Limitation, not a crash. | – | Hidizs | [AP30 V1.8.3, code + device] |
| **V1.8.3: unused gapless switch** | Code to turn gapless on or off exists but nothing calls it and nothing stores the choice; there is no menu item. | None (gapless is always on). | – | Hidizs | [AP30 V1.8.3] |
## Settings, browser, e-book and other UI

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| About shows a hard-coded version | The About page reads the firmware version but displays a fixed "HDS_YXJ / Ver: 1.7.8". | The version line never changes with custom or future images (the date line does). | Read the version with the USB "info" command | Hidizs | [AP30] |
| Factory reset writes a garbage weekday | Same uninitialised day counter as the boot RTC reset (overlay 32, 0x030826d8). | Wrong weekday after a factory reset. | – | Hidizs | [AP30] |
| Start-volume-limit editor: wheel still works | With configuration flag +0x2c set, fast forward / rewind are blocked but the wheel still changes the value. | Possibly intended. | – | Hidizs | [AP30, ?] |
| Settings dialogs: doubled actions, uninitialised values | A message-box branch handles one message twice; the volume-wheel cases re-check a message right after sending it; the clock editor passes an uninitialised image id; the info page key handler returns an uninitialised value. | Harmless. | – | Hidizs / SDK | [AP30] |
| Browser exit returns garbage | The browser's exit handler has no return value in one case (made reachable by Hidizs), so the window returns a leftover value (overlay 31, 0x03081ede). | Unknown effect [?]. | – | SDK | [AP30] |
| Browser delete checks the wrong item | Before the delete dialog the item is looked up without subtracting the list's start index; the real delete uses the right index. | After single-line scrolling the pre-check looks at the wrong file. | – | SDK | [AP30] |
| Delete errors ignored | Both FAT and exFAT delete paths overwrite or ignore the result and report success. | A failed delete looks successful. | – | SDK / Hidizs | [AP30] |
| Play from browser always starts list position 0 | A computed library id is dropped on the Play press (same in the main menu). | Unknown visible effect [?]. | – | Hidizs | [AP30] |
| Browser always in plain-file mode | The "all files" (library) branch and the picture / video branches of the browser are dead. | Pictures and videos reach "not supported" from the browser. | Open pictures from the picture viewer | Hidizs | [AP30] |
| E-book: UTF-8 lines skipped | In UTF-8 mode the reader advances by the converter's byte count, not by what fits on the line. | Parts of long lines may be skipped in UTF-8 TXT files. | Save TXT files as UTF-16 or GBK | Hidizs | [AP30, ?] |
| E-book: bookmark record not fully written | 50 of 51 page-index entries are copied; the last 4 bytes of each record are never written. | Harmless. | – | Hidizs | [AP30] |
| E-book: half-cleared line buffer, missing return | A key handler clears half of a 16-bit buffer; the bookmark loader has no return on the empty path. | Minor. | – | SDK | [AP30] |
| FM radio task removed by hand | The radio window slot is 0 while the radio option stays defined. | Harmless. | – | Hidizs | [AP30] |

## USB

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Charging started even without a host | The USB class start sends "resume" and starts charging even when the host never connects (the SDK's failure branch is removed). | Harmless for charging. | – | Hidizs | [AP30] |
| Uninitialised task argument | Leaving the USB task switches to the charge screen with an uninitialised argument. | Harmless if the charge screen ignores it. | – | Hidizs | [AP30] |
| Mode menu leaves drawing state changed | After an aborted menu (USB power gone) the paint routine returns without restoring text mode, font and colours (overlay 9, 0x03084da8). | Possible wrong colours or font on the next screen. | – | Hidizs | [AP30] |
| Mass-storage compliance checks off | CBW / data-length case checks are compiled out. | Hosts that probe edge cases may misbehave [?]. | – | Hidizs | [AP30] |
| Unused USB audio class: mute and volume | In the never-selected built-in USB audio class, host mute is accepted but ignored, the volume query always answers 0x8080, the host volume scale is 0..60 vs 0..100 on the keys; a reset handler rewrites a register unchanged; a GPIO is set twice; flow-control and helper functions have no callers; the key forwarding to it never runs. | None on the AP30 (class never used). Relevant for custom firmware. | – | Hidizs | [AP30] |

## Bluetooth

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Reconnect retry always sends one variant | Inside a block that runs when the tick difference is exactly 500, a test for exactly 100 chooses the other frame variant: practically never true (overlay 112, 0x030824b4). | The retry always sends the `CH` frame, never `CL`. | – | Hidizs | [AP30] |
| Inconsistent "has address" test | One path checks only the first byte of the remembered address, another the sum of all six. | An address starting with 0x00 is treated as empty in one path. | – | Hidizs | [AP30, ?] |
| Scan de-duplication by byte sum | Repeated scan results are dropped by comparing the sum of the address bytes. | Two devices with the same sum: one is hidden. | – | Hidizs | [AP30] |
| Title copy reads past its source | 80 bytes are copied from a 20-byte literal (terminated at index 9). | Harmless. | – | Hidizs | [AP30] |
| Dead code | An uncalled module power-on routine, list-select and volume routines (copies of the main menu's). | Harmless. | – | Hidizs | [AP30] |

## Image viewer decoders (JPEG, BMP)

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| BMP header check tests height twice | The size check tests the height twice and never the width. | Over-wide BMPs are not rejected. | – | library | [AP30] |
| JPEG 4:1 horizontal chroma written overlapping | For one subsampling mode the chroma outputs advance by 1 instead of 2 (overlay 19, ~0x0308a7f8 + 0x37c). | Colour errors for that rare subsampling. | Re-save as 4:2:0 / 4:4:4 | library | [AP30, ?] |
| JPEG colour conversion biased | The YUV → RGB rounding adds 8 × the half-LSB. | Slight colour bias. | – | library | [AP30] |
| JPEG dead checks and zoom | A NULL test that can never be true, an odd bounds test, a bilinear zoom that is dead after the copy loops. | Harmless. | – | library | [AP30] |
| ASF cover-art parser was dead in the SDK | The AP30 enables it; a static-buffer NULL test can never be true. | Harmless. | – | SDK | [AP30] |

## Core-B codec modules, general

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Semihosting printf on decoder error paths | The OGG and WMA modules link the C library's `printf`, whose output is a semihosting breakpoint (`BKPT 0xAB`); without a debugger this faults core B. | A malformed Ogg or WMA file could hang playback [?: untested on a device]. | Avoid broken files | library | [AP30, ?] |
| No channel-count check in WAV, ALAC, APE | These modules do not refuse files with more than 2 channels (the others do). | Multichannel files play wrongly or noisily. | Down-mix to stereo | Hidizs | [AP30, ?] |
| No DSD256 limit in DSDIFF | The DSF module refuses rates above 22.58 Mbit/s, the DSDIFF module does not (an older build). | Heavy DSDIFF files may stutter [?]. | – | Hidizs | [AP30, ?] |
| Shorter message table in WMA and WAV modules | The message array is one word shorter in these modules (older message numbering). | Harmless. | – | Hidizs | [AP30] |
| DSF module links an unused FLAC helper | The FLAC filter-configuration helper is linked into the DSF module, uncalled. | Harmless. | – | Hidizs | [AP30] |

## MP3 decoder

Based on libmad 0.15.1b with Rockchip glue and accelerator code (overlay 71).

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Seek header scan has no bound | The seek routine scans for a valid frame header with no limit and runs past its 2,304-byte stack buffer (0x01003484). | Hang or crash when seeking into corrupt MP3 data. | – | library | [AP30] |
| Seek returns garbage | The seek routine returns no value. | Callers get a leftover register. | – | library | [AP30] |
| Mixed-block granules decoded the wrong way round | Mixed blocks send subbands 0-1 through the short IMDCT and the rest through the long one without a window; the standard asks for the opposite. | Audible artefacts on MP3s that use mixed blocks (a rare encoder choice). | Re-encode | library | [AP30] |
| Mixed path may race the IMDCT accelerator | A "finished" flag is not cleared before the accelerator pipeline (the long path clears it). | Possible glitches [?]. | – | library | [AP30, ?] |
| Accelerator left on the ARM side after an error | Decode errors return without switching the accelerator back. | Possible follow-up errors [?]. | – | library | [AP30] |
| Bad Huffman data no longer reported | A big-values overrun is clamped silently instead of flagged. | Corrupt frames decoded as noise instead of skipped. | – | library | [AP30] |
| Layer II mono bitrate check removed | Upstream's rejection of invalid mono streams above 192 kbps is gone. | Invalid streams accepted. | – | library | [AP30] |
| Several ID3 tags can overflow the input buffer | When a second ID3 tag follows the first, large tags make the header search read or copy past the 2,048-byte input buffer (0x010048f8, 0x0100492c). | Memory corruption with files carrying several ID3 tags. | Strip extra ID3 tags | library | [AP30, ?] |
| VBR header position can go negative | If the Xing / VBRI header is found in the first 36 bytes, the computed first-frame position is negative. | Negative seek [?]. | – | library | [AP30, ?] |
| Layer I frame-size table wrong | Several valid bitrate indexes hold 0 and many sizes are not multiples of 4 (0x01024674). | Layer I (MP1) files may fail to sync. | – | library | [AP30, ?] |
| Refill leaves stale bytes | After moving 4 bytes to the front, the header search reads 1,536 bytes; bytes 1540-2047 keep old data. | Possible false sync. | – | library | [AP30, ?] |
| Open: ignored first read, 1-frame start time | The first input result is ignored, the header search gives up after 1,024 tries, and the start time is set to one frame instead of 0. | Minor. | – | library | [AP30, ?] |
| Harmless leftovers | Inverted joint-stereo zeroing in Layer I (both rows end up zeroed anyway); a synthesis function called with 4 arguments but defined with 3; bit-cache shifts that drop unused bits; unused statics; debug typo "bitraate". | Harmless. | – | library | [AP30] |

## AAC decoder

Based on RealNetworks Helix fixed-point AAC (overlay 73), with Rockchip's MP4 parser.

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Intensity stereo not attenuated | In one branch Helix's scaling shift is missing (0x01008494 + 0x1e4…0x1fa). | Wrong right-channel level in intensity-stereo bands. | – | library | [AP30] |
| Mid-side overflow handling removed | Helix's halving on large values is gone. | Possible wrap-around clicks on full-scale input. | – | library | [AP30] |
| TNS coefficient shift order | Shifts before multiplying (Helix shifts the product). | Probably harmless with normal coefficients. | – | library | [AP30, ?] |
| Section data not bounded | Stale codebook entries on empty sections; no bound by max scale-factor band; an info-check failure is ignored (as in original Helix). | Corrupt streams can overrun tables. | – | library | [AP30, ?] |
| ADTS time init divides by zero | Without a sync word in the first 64 bytes it divides by a zero rate and frame count (0x010026e0). | Wrong duration for odd ADTS files [?]. | – | library | [AP30, ?] |
| CMMB mono loop runs twice too far | Processes 2,048 stereo pairs for a 1,024-sample frame. | Only in a broadcast mono mode. | – | library | [AP30] |
| Bad channel count stalls 10 s | On a bad channel count the decoder waits 10 s before returning an error; a related flag never takes effect; a down-mix path is unreachable. | 10-second stall on broken files. | – | library | [AP30] |
| MP4 "assert" macro broken | The macro lacks parentheses, so a NULL file pointer passes the check in many MP4 box readers. | Crash risk with broken MP4 / M4A files [?]. | – | library | [AP30] |
| M4A above 48 kHz gets wrong ADTS headers | The header builder fails for 64 / 88.2 / 96 kHz (and > 2 channels) and the caller copies a stale header. | AAC in M4A above 48 kHz may not play. | – | library | [AP30, ?] |
| Huge playback time on overrun | An error value is turned into a very large time. | Odd time display [?]. | – | library | [AP30, ?] |
| Files above 4 GB mis-parse | The high word of a 64-bit `mdat` size is ignored. | M4A files over 4 GB fail. | – | library | [AP30] |
| Harmless leftovers | Inverted debug messages, typos ("vidiosamplesum", "aac_frofile"), an unused static, a wrong buffer passed to an unused parameter, redundant checks. | Harmless. | – | library | [AP30] |

## WAV decoder

Overlay 74 (MS-ADPCM from libsndfile, IMA-ADPCM, PCM, noise suppression from Speex).

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| 32-bit float played as integer | IEEE float (format 3) is accepted without checks and decoded by the integer PCM path. | 32-bit float WAV plays as loud noise. | Convert to integer PCM | Hidizs | [AP30, ?] |
| 16-bit PCM with > 2 channels not output | The block is read but never converted into the output buffer. | Silence or stale audio [?]. | Down-mix to stereo | Hidizs | [AP30, ?] |
| Format 4 plays a stale buffer | The decode case only advances the time. | Garbage audio for that format [?]. | – | Hidizs | [AP30, ?] |
| DTS-in-WAV no longer rejected | The DTS check is not called any more. | DTS WAV files play as noise. | – | Hidizs | [AP30] |
| ADPCM width set by assignment | `if (width = 23)` forces width 23 for anything other than 15 (0x0100315e). | Encoder path only (recording, unused). | – | library | [AP30] |
| IMA-ADPCM refill and loop bounds | Refills only in one odd condition; the decode loop can read one block past the buffer. | Possible glitches in IMA-ADPCM files [?]. | – | library | [AP30, ?] |
| Encoder buffers stored as initialised data | ~10 KB of encoder buffers carry a code-section attribute and take image space. | Wasted space. | – | SDK | [AP30] |
| Harmless leftovers | A 52-byte copy from a 40-byte local, an INFO text read into a discarded local, a length read twice, a function with no return. | Harmless. | – | library | [AP30] |

## OGG Vorbis decoder

Overlay 75 (Xiph Tremor lowmem + libogg, Rockchip changes).

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| **Comment buffers overflow** | Fixed buffers for the vendor string (58 bytes) and 8 comments of 36 bytes, without bounds checks. | Any Ogg Vorbis file with more than 8 comments or a comment ≥ 36 bytes corrupts memory while opening. | Keep few, short Vorbis comments | library | [AP30] |
| Decode table written through NULL | For one codebook case Rockchip removed the table allocation, so the decode tree is written to core-B address 0 (0x0100302a). | Certain codebooks corrupt core-B memory. | – | library | [AP30] |
| Codebook map offset 4× too large | A byte count is used as an element count (0x0100463e). | Wrong values for that codebook type. | – | library | [AP30] |
| Fixed arrays overflow on large streams | Static / stack arrays for codebook values, residue and floor data have no bounds checks; the code prints a warning and overflows anyway. | Unusual encoder settings crash core B. | – | library | [AP30] |
| Floor counters never reset | Incremented per floor, never reset: possible out-of-bounds over later streams [?]. | Chained Ogg files [?]. | – | library | [AP30, ?] |
| **Page CRC check removed** | The page checksum is read but never verified (0x01007a2a). | Corrupt pages are decoded instead of skipped. | – | Hidizs | [AP30] |
| Page sequence check disabled | Holes in the stream are not reported (0x01007d8c). | Glitches instead of a clean resync. | – | Hidizs | [AP30] |
| Empty-body page returns "need more data" | A page-skip case returns without consuming the page. | Possible stall [?]. | – | Hidizs | [AP30, ?] |
| Oversized-page path returns odd offsets | Returns 0 or a 255 × n length that callers treat as a page offset. | Broken files misread. | – | Hidizs | [AP30, ?] |
| Only 2 header packets read | The setup header is not checked at open. | Relies on later checks. | – | Hidizs | [AP30, ?] |
| Header-error cleanup removed | Header errors leak references and leave the state unchanged; open no longer clears on failure. | Leaks on broken files. | – | library | [AP30] |
| Header test weaker | The codebook-header case tests only the rate, not the vendor string. | Minor. | – | Hidizs / library | [AP30, ?] |
| Harmless leftovers | Buffers only partly cleared (element counts passed as byte sizes), an inverted comment-query test (no callers), doubled assignments. | Harmless. | – | library | [AP30] |

## FLAC decoder

Overlay 76 (FFmpeg-derived, a newer Rockchip revision than any public SDK copy).

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| **Wrong length for long files** | The 36-bit total-sample count is shifted in 32 bits, losing the top bits (same expression as FFmpeg 0.8). | Files over 2^28 samples (~1.7 h at 44.1 kHz) show a wrong length. | Split very long files | SDK / library | [AP30] |
| Bitrate divide by zero | Divides by a duration that is 0 when the sample count is unknown or the file is under 8 ms, or the rate is 0. | Odd edge files. | – | SDK / library | [AP30, ?] |
| Seek reports success without a header | When no frame header is found the seek still moves and reports success. | Glitch after seeking in broken files. | – | Hidizs | [AP30, ?] |
| Reserved channel modes accepted; multichannel as stereo | Channel codes up to 12 are accepted (FLAC reserves 11-15); multichannel frames are decoded as independent stereo; modes 11-12 write nothing. | Multichannel FLAC plays wrongly. | Down-mix to stereo | Hidizs / library | [AP30] |
| Frame-header CRC not checked | The CRC-8 is computed and never compared. | Corrupt headers accepted. | – | Hidizs / library | [AP30] |

## ALAC and APE decoders

Overlays 77 (ALAC, FFmpeg n2.1-based) and 78 (APE, FFmpeg v0.6-based).

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Last sample written past the buffer | 24-bit ALAC and 16-bit APE output use 4-byte stores with a 3- / 2-byte stride. | 1-2 bytes past the output buffer. | – | library | [AP30] |
| Allocators return memory past the pool | On overflow the bump allocators print and still return a pointer past the buffer. | Memory corruption with large frames. | – | library | [AP30] |
| ALAC Rice decoder unbounded | FFmpeg's "bits left" check is removed. | Corrupt ALAC reads past its input. | – | library | [AP30] |
| ALAC: oversized 'alac' atom overflows | The atom is read with its size from the file into a 36-byte structure (0x01003abc). | A crafted .m4a overflows memory. | Avoid untrusted files | library | [AP30] |
| ALAC: version-1 `mdhd` always fails | A stray `;` makes the 64-bit branch return failure (0x0100464c). | ALAC files with a version-1 media header do not play. | Re-mux the file | library | [AP30] |
| Positions cut to 32 bits; "abnormal end" treated as success | APE frame positions are cut before seeking; the MP4 parser returns success with < 512 bytes left. | APE files over 4 GB; truncated M4A files. | – | library | [AP30] |
| Harmless leftovers | A refill path with no return, a call with one argument too few, an inverted free loop, wrong numbers in debug messages, typo "unkown". | Harmless. | – | library | [AP30] |

## DSD decoders (DSF, DSDIFF)

Overlays 79 (DSDIFF) and 80 (DSF).

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| DSDIFF open loops forever | A file with no "DSD " / "DST " chunk but successful reads never leaves the open loop. | Core B hangs on such a file. | – | library | [AP30] |
| No upper clip in the converter | The lower clip is a no-op and there is no upper clip. | Possible wrap-around on hot DSD material. | – | library | [AP30] |
| Fixed-point / float edge cases | The gain conversion uses the C library's soft-float routines, which have no overflow / NaN handling (see [C library](#c-library)). | Only at extreme gains. | – | C library | [AP30] |

## WMA decoder and DRM

Overlay 72 (a Microsoft-derived decoder with DRM code; names and behaviour reconstructed from the code only).

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Files ≥ 2 GB hang core B | The data callback loops forever when offset + size > 0x7fffffff (0x01003168). | A 2 GB+ WMA file or a corrupt header hangs playback. | – | Hidizs | [AP30] |
| Read results not checked | Returns the requested size without checking the read; refills on an exact boundary; seeks one handle but reads another. | Stale bytes near the end of the file. | – | Hidizs | [AP30, ?] |
| Wrong track length | The duration takes its high word from the *send* duration and its low word from the *play* duration (0x0100bfb6). | Wrong length for tracks over ~7 minutes when the two differ. | – | library | [AP30] |
| Uninitialised sample count | In some codec states the ready-sample count is reduced by a pointer value (0x01004822 → 0x0100486e). | Glitches or a stall [?]. | – | library | [AP30] |
| Decoder state machine can loop | In states 2 and 9 under one condition it loops back without changing state (0x010059f6). | Possible hang [?]. | – | library | [AP30, ?] |
| Assert compiled as an endless loop | A failed internal consistency check would hang core B. | Only if the check fails. | – | library | [AP30] |
| Quantiser steps 157-162 wrong | Large mantissas are tested as signed; steps above 162 overflow and the frame is dropped. | Loud passages at high quantiser steps [?]. | – | library | [AP30, ?] |
| Possible endless loops in band setup | Uninitialised bark index (version 3), zero-energy band normalisation, uninitialised shift arguments. | Version 3 is rejected earlier; the zero-band case needs unusual input. | – | library | [AP30, ?] |
| Malformed packet reaches semihosting printf | Multiple payloads with length type 0 hit a debug `printf` → breakpoint → fault. | A malformed WMA file could fault core B. | – | library | [AP30, ?] |
| DRM: MAC key, record loop, DES | A MAC key word uses `rand[0] + 12` where `rand[12]` was meant; the licence record loop never advances; DES rounds only run with one flag value; the DES tables are never initialised (read from address 0). | DRM-protected WMA cannot work [?]; protected files are rare. | – | library / Hidizs | [AP30, ?] |
| Packet parser accepts every length type | All four packet-length type values are accepted (the original kit is believed to reject some). | Malformed files parsed further than they should be [?]. | – | library | [AP30, ?] |
| Unreachable or harmless leftovers | Version-3 paths with uninitialised values (blocked by the format check), a retry loop of 1,000,001 attempts, a licence init that returns "DRM failed" for unprotected files (only called for protected ones), dead loops, dropped metadata results, a NULL test after use, a bound check that never triggers. | None (unreachable or harmless). | – | library | [AP30] |

One suspected overflow (two 10-entry stack arrays indexed by a noise-band count) was checked against every accepted
stream configuration and **cannot** overflow: at most 8 bands occur [AP30].

## C library

Arm's micro-library, statically linked into section 0 and every core-B module.

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| Soft float without overflow handling | Double → float, scale and multiply give garbage on overflow; underflow becomes 0; −0 becomes +0; x / 0 returns 0. | Relevant where core B converts gains (DSD). | – | C library (by design) | [AP30] |
| `pow` wrong for some negative bases | For x < 0 and odd integer y with 2^31 < \|y\| < 2^53 the result is wrong (signed x used where the reference uses \|x\|). | Not reached by the DSD gain code [?]. | – | C library | [AP30, ?] |
| printf / sqrt corner cases | `%#p` prints `@`, `%#o` adds 0 only for non-zero values, `%lln` stores a sign-extended count; square root returns +0 for negative input. | By design. | – | C library | [AP30] |

## Games

| Bug | Description | Impact / trigger | Workaround | Origin | Tag |
|---|---|---|---|---|---|
| **Box Pusher: invisible start target** | Level loading writes a player marker (5, or 6 on a target) that no other code handles; on levels 12, 24, 33, 41 and 45 the player starts on a target that is invisible and never counted. | Those levels can be solved with that target uncovered (level data checked). | – | Hidizs | [AP30] |
| Chinese Checkers: no win screens | Win states are never set: a human win jumps to the next level, an AI win silently restarts; "YOU WIN!", "AI WIN!", "stage clear!" never show; a move counter is only cleared. | No feedback on winning or losing. | – | Hidizs | [AP30] |
| Minesweeper: no restart from "Over" | Play in the lost state with ≤ 1 life sets lives to 0 and redraws; the state stays lost. | Only Back leaves the game-over screen. | Press Back | Hidizs | [AP30, ?] |
| Gomoku AI misses winning blocks | Scores are 16-bit: five in a row (100000) truncates; attack + defence wraps. | The AI can miss a move that both wins and blocks. | – | Hidizs | [AP30, ?] |
| Gomoku shows level 0 | The status shows the 0-based level ("Lv 00"). | Cosmetic. | – | Hidizs | [AP30] |
| Reversi: tie counts as a loss | A draw is scored as lost; the "DRAW" text is never used. | Wrong result on a tie. | – | Hidizs | [AP30] |
| Match 3: B does nothing | The B key is compared and then ignored. | Cannot deselect with B (unlike Pair Link). | – | Hidizs | [AP30] |
| Bubble Pop: 3-digit score | Scores ≥ 1000 show only the last 3 digits. | Cosmetic. | – | Hidizs | [AP30, ?] |
| Retro Block Puzzle: top row duplicated | After clearing a line, row 0 is cleared only when the cleared line was row 0; otherwise its contents are copied into row 1 (0x03081ec4). | A block in the top row is duplicated. | – | Hidizs | [AP30, ?] |
| Retro Block Puzzle: small flaws | Lifting a piece clears the wall bits of the floor rows (walls are checked on piece bits only); row 0 is cleared twice when the cleared row is row 0; a "lowest row" local is read uninitialised when a shape has no bits (never with the shipped shapes). | Harmless. | – | Hidizs | [AP30] |
| Retro Block Puzzle: "LOCK" but keys work | The hold check only runs while idle; during play "LOCK" shows but keys still work. | Cosmetic / confusing. | – | Hidizs | [AP30, ?] |
| Tank Battle: fireworks on game over | The all-clear fireworks play over GAME OVER; lives above 99 show 2 digits; spawn rows hard-coded. | Cosmetic. | – | Hidizs | [AP30, ?] |
| Sky Shooter: dead win path, unskippable banner | The "YOU WIN!" state is never set (stage clear after level 30 instead); during the "STAGE nn" banner every key including Back is ignored (~0.5 s); asymmetric spawn clamp. | Minor. | – | Hidizs | [AP30] |
| Jigsaw: score overwritten | Solving sets the score instead of adding to it; some states unreachable. | Score does not accumulate. | – | Hidizs | [AP30] |
| Block Shooter: no win state, lives unused when invaded | The win state is never set; a second explosion is never triggered; invaders reaching the ship end the game regardless of lives (possibly intended). | Minor. | – | Hidizs | [AP30] |
| Mole Hunt: burst drawn at hole 0 | When an unhit bomb times out, its burst is drawn at hole 0. | Cosmetic. | – | Hidizs | [AP30, ?] |
| Chinese Chess: move list can overflow | The move limit is only checked in the chariot / cannon loop. | Unlikely with normal material. | – | Hidizs | [AP30, ?] |
| Backlight timer left on in two games | Chinese Chess and the hidden Bomber game enable the backlight-off timer where the others hold it; Chinese Chess leaves text mode changed on exit. | Screen may switch off during play. | Press a key now and then | Hidizs | [AP30, ?] |
| Number Slide string buffer one short | Up to 4 digits + terminator in a 4-element buffer. | Latent (tiles only go to 24). | – | Hidizs | [AP30] |
| Harmless leftovers in many games | Clear loops that never run (end ≤ start; the overlay load zero-fills memory anyway) in Minesweeper, Maze, Memory Match, Sudoku, Reversi, Pair Link, Make 24, Match 3, Maze Chase; unused functions, unused strings and states (Sudoku's lives never change; Block Puzzle+ ignores its level; Make 24's undo does not restore one field; Snake re-places the food twice; Frog Crossing and Space Battle dead code; Dig Runner level 4 row 5 has 25 characters and no terminator). | Harmless. | – | Hidizs | [AP30] |

The games, including four hidden ones, are described on [games.md](games.md).

## Fixed by Hidizs

Bugs in Rockchip's code or libraries that the AP30 firmware no longer has [AP30]:

| Bug in the SDK / library | State in the AP30 |
|---|---|
| Interrupt priority read uses the wrong register for most interrupts | fixed (also on core B) |
| I2C channel 2 close resets and gates I2C1 instead of I2C2 | fixed |
| SPI chip-select enable deselects every other chip select | fixed (ORed in) |
| SPI interrupt clear commented out | re-enabled |
| Directory-entry extension truncates the new cluster number to 8 bits and clears the old cluster | fixed |
| ID3v1 check dereferences an uninitialised pointer; ID3v2.2 singer frame wrong | fixed |
| DSF decode returns no value; DSF init has no default rate | fixed (default DSD64 / 176.4 kHz) |
| E-book total-page counter overwrites a field | fixed |
| 5.0.0 opened APE above 96 kHz and DSF / DFF above ~DSD512, which cannot decode in real time | V1.7.8 rejects them ("open error"); a likely stutter source in 5.0.0 [?] |
| 5.0.0 used Simplified "游戏" in the Traditional Chinese table | V1.7.8 uses "遊戲" |

## Limitations documented by Rockchip

Rockchip's own SDK read-me lists these decoder limits; they are not checked separately on the AP30 [?]:

* HIFI APE decodes only up to 96 kHz (V1.7.8 enforces this, see above).
* No 16-bit APE and no 16-bit FLAC through the HIFI paths (they cannot be told apart from the HIFI variants).
* DSD64 / DSD128 / DSD256 supported, but DSD128 and DSD256 only from `.dsf` files, not `.dff`.

## Errors in Rockchip documentation

From Rockchip's RKNanoD SDK guide, reference-board guide and schematics, as found in SDK copies (these documents are about Rockchip's reference board, not the AP30; none of this is checked on the AP30):

* A key-ladder configuration file swaps the comments of the fast-forward and rewind keys relative to the reference
  schematic.
* The reference-board guide draws the LCD backlight on PWM2; the schematic (and the AP30) use PWM0.
* Maximum core clocks are given as 200 / 400 MHz in one guide and 250 / 500 MHz in another.
* The reference-board guide labels the PMU RAM "256 KB"; the data sheet, the TRM and the guide's other figures say
  64 KB.
* An early schematic's I2C address index mixes 8-bit and 7-bit addresses under a "7-bit" header.
* The SDK guide calls the serial-number field of the device information "unused on NanoD", but the SDK reads a serial
  from IDB sector 3 and the factory tool writes one.
* Heading typos in the SDK guide; the menu generator writes a wrong tool version into its output header.

## Errors in public reference material

Mistakes in public sources that someone comparing against them may trip over:

| Source | Problem |
|---|---|
| [RKNanoD TRM V1.0](../overview/sources.md) | Internal contradictions: remap bit in two different registers (chapter 2.1 vs the register chapter); "20 external interrupts" vs 41 lines in table 2-1; two meanings of the timer mode bit (the stock firmware follows the register table); "TIMER0~5" for 2 channels; UART0/2 DMA request numbers 5/6 in prose vs 8/9 in the table; RAM gated in 64 KB banks (ch. 1.1) vs 32 KB sub-blocks (ch. 12). |
| [iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw) `ETUDE.md` §1.4 | Reads the core-B ready wait as 200,000 × 1 ms; on the AP30 the delay unit is 1 µs, so the wait is ≥ 0.2 s. |
| [pschatzmann/arduino-libhelix](https://github.com/pschatzmann/arduino-libhelix) | Often used as "the Helix AAC source", but it is not plain Helix: PROGMEM, added bounds checks, commented-out clip macros, a changed counter type and clip constant 0x7fffffff (Rockchip's build has 0x3fffffff). |
| libsndfile upstream history | The public git history starts in 2007, after Rockchip's base of the MS-ADPCM / IMA code, so no exact upstream copy exists. |
| [brnomt/ReChord](https://github.com/brnomt/ReChord) | Its copy of Rockchip's interrupt source drops the SDK's UART fault dump, which can make that dump look like a Hidizs addition (it is stock SDK code). The repository carries a GPL-3.0 licence file while also vendoring Rockchip's SDK files with every codec library (described there as a "leaked/reference SDK"); those files carry no licence notices of their own. |
| Public RKNanoD MP3 SDK copy ([xinghuaman/RKNanoD_MP3_V1.3_20161102](https://github.com/xinghuaman/RKNanoD_MP3_V1.3_20161102)) | Two HIFI decoder headers are missing, and the APE header's version limit differs from the shipped library. |
| Public RKNanoC SDK copy | Its USB audio header has two command enumerations, one commented out; the AP30 uses the commented-out numbering. |
| FCC / ISED / Giteki filings for the AP80 PRO MAX (FCC ID 2A7ZP-AP80PROMAX) | Hidizs declares the AP30 (with other models) to share "the same PCB board, circuit, structure and internal" with the AP80 PRO MAX; the shipped AP30 shares none of it (RKNanoD + JieLi Bluetooth, no Wi-Fi, 1200 mAh, a different board). Do not use these exhibits as AP30 data (see [overview/device.md](../overview/device.md)). |

## Compliance

No AP30 image carries the licence notices, attributions or source offers that the open-source components' licences
ask for (GPL libmad, LGPL FFmpeg / libsndfile, BSD Tremor / Speex / kiss_fft, RPSL Helix) [AP30]. Facts and
component list: [third_party_components.md](third_party_components.md).

## Open questions

* Device tests still missing for many "possible" entries, in particular: play/pause with the screen off in mode 0,
  the hi-res EQ skip, the WAV float path, the semihosting faults, the I2S 64 kHz clock, the CS43198 low-gain value.
* Whether the software-clock month bug affects the date shown to the user.
* Whether Hidizs fixes any of these in a later release (compare with the next official image).

## Sources

* [AP30] analysis of firmware V1.7.8 (all sections and overlays), compared with the 0.0.0 and 5.0.0 images and with
  Rockchip's codec libraries from public SDK copies; device confirmation where marked (favourites after a card swap).
* [EM] Echo Mini community measurements of the I2S clock table.
* [WEB] the public sources linked in the last table; reviews and owner reports are on
  [community/user_feedback.md](../community/user_feedback.md).
