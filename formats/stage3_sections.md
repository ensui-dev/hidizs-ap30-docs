# The code stage (stage3) and its section table

Status: draft, 2026-11

The code blob of the update image ("stage[3]") holds all the firmware code and initialised data of the AP30, for both
CPU cores. It starts with a small table: a base address, a section count, and one 8-word record per section giving
where the section's code, data and bss come from in the blob and where they go in RAM. Section 0 is resident; the boot
loader also loads sections 1 and 2; everything else is an **overlay** that the firmware copies into shared RAM windows
on demand. The core-B audio decoders are sections linked at 0x01000000. This page describes the table, the address
rule, the layout of the blob, the overlay windows and the default-configuration block that follows the table.

## Contents
- [Header and records](#header-and-records)
- [VA and PA: the address rule](#va-and-pa-the-address-rule)
- [Layout of the stage3 blob (V1.7.8)](#layout-of-the-stage3-blob-v178)
- [Section 0 (resident) and the vector tables](#section-0-resident-and-the-vector-tables)
- [What the loader loads, what the firmware loads](#what-the-loader-loads-what-the-firmware-loads)
- [Overlay windows](#overlay-windows)
- [Data-only sections: code-page tables](#data-only-sections-code-page-tables)
- [Core-B modules at 0x01000000](#core-b-modules-at-0x01000000)
- [The default-configuration block](#the-default-configuration-block)
- [Differences between versions](#differences-between-versions)
- [Open questions](#open-questions)
- [Sources](#sources)

## Header and records

```
stage3 offset
0x0000  u32 base          0x03050000
0x0004  u32 count         113 (V1.7.8)
0x0008  count × section record (32 bytes each):
          +0x00 u32 code_va    position of the code bytes in the blob (as base + offset)
          +0x04 u32 code_pa    run address of the code
          +0x08 u32 code_sz    code size in bytes
          +0x0C u32 data_va    position of the initialised data in the blob
          +0x10 u32 data_pa    run address of the data
          +0x14 u32 data_sz    data size
          +0x18 u32 bss_pa     run address of the zero-initialised area
          +0x1C u32 bss_sz     bss size
8 + 32 × count:  default-configuration block, 0x224 bytes (see below)
```
All [AP30]. In V1.7.8, 92 of the 113 records are non-empty [AP30]. Record numbers are the "section" or "overlay"
numbers used everywhere in this collection (ov 1, ov 8, …).

## VA and PA: the address rule

* A `*_va` field is **a position inside the stage3 blob**, written as an address: `stage3 offset = va − base`.
  Add the blob's offset in the image (0x200 in official images) to get the file offset [AP30].
* A `*_pa` field is **where the bytes run** (the load address) [AP30].
* The two are different for every section. Example, section 0: code_va 0x0307988C (stage3 offset 0x2988C), code_pa
  0x03050000 [AP30].
* Rockbox's `rkboottool` ELF export places segments at the VAs, so its output is not usable for code analysis; map
  every section at its PA instead [AP30].

## Layout of the stage3 blob (V1.7.8)

Total size 0x188714 bytes [AP30].

| stage3 offset | Content |
|---|---|
| 0x000000 | base, count, 113 records (0xE20 bytes) |
| 0x000E28 | default-configuration block (0x224 bytes) |
| 0x00104C | sections 63-69: code-page tables (data, read in place) |
| 0x02988C | section 0 code (0x2E300 bytes) |
| 0x057B8C | 16 KiB of zeros (0x57B8C..0x5BB8C), not covered by any section |
| 0x05BB8C | section 0 data (0x1A8A bytes) |
| 0x05D618 | section 4, then section 1, then the other system overlays, the games, the codec front-ends |
| 0x0EF088 | sections 71-80: core-B decoder modules (code + data each) |
| 0x188714 | end (section 80's data ends exactly here) |

The order of sections in the blob is not their numeric order [AP30].

## Section 0 (resident) and the vector tables

| Part | Run range | Size | Tag |
|---|---|---|---|
| code | 0x03050000-0x0307E2FF | 0x2E300 (185 KiB) | [AP30] |
| data | 0x03004000-0x03005A89 | 0x1A8A | [AP30] |
| bss | 0x03005A8C-0x03023B43 | 0x1E0B8 (120 KiB) | [AP30] |
| stack (not a section) | 0x03000000-0x03003FFF, initial SP 0x03004000 | 16 KiB | [AP30] |

**Two vector tables** [AP30]:
* **Section 0 data starts with the boot vector table** at 0x03004000: SP 0x03004000, reset 0x030563B9, 38 more vectors
  all pointing to 0x03066F4F. The loader sets VTOR to this table and jumps through it.
* The reset entry is a trampoline: it clears SHCSR, stops SysTick, disables all NVIC lines, zeroes section 0's bss,
  sets VTOR to **the second table at the start of section 0 code (0x03050000)**: SP 0x03004000, reset 0x030631D7 (the
  firmware's main initialisation), handlers 0x03061275; then it loads SP and PC from that table.
* Later the RAM table at 0x03004000 is rebuilt as the live 57-entry vector table (16 system + 41 interrupt lines) and
  VTOR moves back to it when the first handler is registered.

So an image must keep **its vector table as the first thing in section 0's data**, and section 0's data must load at
0x03004000 [AP30 loader behaviour]. Start-up in detail: [../firmware/startup.md](../firmware/startup.md).

## What the loader loads, what the firmware loads

* **The boot loader** copies code and data and zeroes bss for **records 0, 1 and 2 only**, then jumps [AP30]. In V1.7.8
  record 1 is the boot overlay (code at 0x030815C4, 0x16A4 bytes; data at 0x03023B48) and record 2 is empty. The highest
  byte the loader writes is 0x03082C67, below the loader's own RAM at 0x03088000 [AP30]. Loader details:
  [../firmware/boot_loader.md](../firmware/boot_loader.md).
* **The firmware** loads every other section itself with an overlay routine at 0x030683DE (usually called through a
  wrapper at 0x030684E4, about 40 call sites). It takes a section number and a flag word: bit 0 = copy code, bit 1 =
  copy data, bit 2 = zero bss; most calls pass 7 [AP30]. It reads the record from the firmware area of the flash and
  copies from there, with interrupts disabled during the copy [AP30].
* The firmware reads overlays from **FW1** in V1.7.8, even if the loader booted FW2 (the slot-selection variable is only
  set by a routine nothing calls) [AP30].

## Overlay windows

Overlays that share a run address replace each other; only one of each group is in RAM at a time [AP30]. Code
windows in V1.7.8:

| Code window (PA) | Sections | What they are |
|---|---|---|
| 0x03080E9C | 3 (empty), 4 | LCD panel driver (chosen through the configuration block) |
| **0x030815C4** (main window) | 1, 5, 6, 10, 17, 21, 22, 23, 27, 30, 31, 32, 81-112 | 1 boot init (file system, update scan, LCD, fonts, settings); 5 library-build screen; 10 USB device control; 17 picture viewer; 21 main menu; 22/23 library menus and list browser; 27 now-playing and lyrics; 31 file browser; 32 settings; 81 game launcher; 82-112 games |
| 0x03081924 | 7, 37, 39 | 37 CUE sheets; 39 large tables (0x1DEA8 bytes, mostly data) |
| 0x03082028 | 8 | firmware updater |
| 0x03082400 | 38 | media-library scan |
| 0x03082928 | 11 | USB audio (present, never selected in V1.7.8) |
| 0x03083030 | 24-26 | media library |
| 0x03083610 | 12 | USB mass storage / SCSI |
| 0x03084590 | 9 | USB connection menu |
| 0x03084664 | 18 | thumbnails |
| 0x03089654 | 19, 20 | (picture / decoder helpers [?]) |
| 0x0308BF84 | 33 | playback control |
| 0x0308F724 | 34-36 | playback control (35 is data only) |
| 0x0308FFBC | 40, 41, 42, 50-57 | codec front-ends on core A: 41 MP3, 42 WMA, 50 AAC, 51 WAV, 52 OGG, 53 FLAC, 54 ALAC, 55 APE, 56 DSDIFF, 57 DSF |
| — (not loaded) | 63-69 | code-page tables |
| 0x01000000 | 71-80 | core-B decoder modules |

Data windows: most main-window overlays put their data at 0x03023B48 (the first word after section 0's bss is used by
section 4); the playback engine uses 0x030360E8-0x03048B50; the codec front-ends use 0x0304B380 [AP30]. The overlay
code windows run past the end of the 256 KiB system RAM bank at 0x03050000 into PMU SRAM (up to 0x0309F7CC) [AP30].
Section 35 holds only data (0xC834 bytes); its nominal load range would overlap resident code, so it is not loaded as
a whole; how it is used is not documented here [?].

Per-overlay descriptions: [../firmware/architecture.md](../firmware/architecture.md); games:
[../firmware/games.md](../firmware/games.md).

## Data-only sections: code-page tables

Sections 63-69 have a load address of 0 and contain no code. They are character-set tables (`u16` arrays) that the
firmware reads in place from the flash when it converts file names and tags to Unicode: 63 a single-byte code-page
table, 64-66 Shift-JIS (code page 932) tables, 67 Big5 (950), 68-69 Korean (949) [AP30]. Their record has code_sz set
and code_pa 0 [AP30]. More in [resources.md](resources.md#gbk-and-code-page-tables).

## Core-B modules at 0x01000000

Sections 71-80 are the audio decoders that run on the second Cortex-M3 core ("core B"), one module per format:
71 MP3, 72 WMA, 73 AAC, 74 WAV, 75 OGG Vorbis, 76 FLAC, 77 ALAC, 78 APE, 79 DSDIFF, 80 DSF [AP30].

* Code is linked at **0x01000000** (HIGHRAM bank 0) and starts with the module's own vector table (0x8C bytes);
  data loads at **0x01020000** (HIGHRAM bank 1). Core B's initial stack pointer and RAM vector table are at 0x01022000
  [AP30].
* Code sizes range from 0x5978 (APE) to 0x1626C (WMA) bytes [AP30].
* Core A loads one module at a time into HIGHRAM before it releases core B from reset [AP30]. Protocol and codec details:
  [../firmware/core_b_codecs.md](../firmware/core_b_codecs.md), [../hardware/dual_core.md](../hardware/dual_core.md).
* On the Snowsky Echo Mini the same modules sit two section numbers higher (73-82) [EM].

## The default-configuration block

The 0x224 bytes right after the record table (stage3 offset `8 + 32 × count`: 0xE28 in V1.7.8, 0xBA8 in 5.0.0) are not
covered by any section. They are the **factory default settings** and board configuration [AP30]:

| Offset | Value (V1.7.8) | Meaning |
|---|---|---|
| +0x10 | 0x1E (30) | default volume [?] |
| +0x4C | 0x133 (307); 0x121 (289) in 5.0.0 | number of string records per language |
| +0x50 | 21 | number of languages |
| +0x1A4 | 1 | index of the LCD driver to use |
| +0x1A8 | 2 | number of LCD drivers |
| +0x1AC | 2 × 15 function pointers | LCD driver operation tables (begin write, panel init, write data, set window, clear, DMA blit, standby, wake-up, …); 12 of the 15 slots point into section 4, the rest are null or no-ops |

The settings area on the flash (the start of the reserved partition, see [idb_and_flash_layout.md](idb_and_flash_layout.md))
holds the same structure with the user's changed values [AP30, measured: 387 of 548 bytes equal on a used device].
Settings in detail: [../firmware/ui_and_settings.md](../firmware/ui_and_settings.md).

## Differences between versions

| Image | count | config block at | string records |
|---|---|---|---|
| V1.7.8 (8.0.0) | 113 | 0xE28 | 307 |
| factory 5.0.0 | 93 (from the block position) | 0xBA8 | 289 |

The factory image has fewer sections (fewer games) [AP30]. Between 5.0.0 and V1.7.8 the code shifts by varying amounts,
so addresses in this collection apply to V1.7.8 only [AP30; WEB nkahoang/hidizs-ap30-game-emu found shifts of
0x280-0x678 between the two].

## Open questions

* Records 2 and 3 are empty; whether the loader handles a count below 3 is not verified.
* The 16 KiB of zeros after section 0 code (purpose unknown).
* How section 35's data is accessed.
* The meaning of most fields of the configuration block.

## Sources

* [AP30] analysis of firmware V1.7.8 (section table, loader and overlay routines) and of factory firmware 5.0.0;
  measured on a device (settings area).
* [EM] Snowsky Echo Mini study (`ETUDE.md`), <https://github.com/berettavexee/echo-mini-newfw>.
* [WEB] <https://github.com/nkahoang/hidizs-ap30-game-emu/blob/main/docs/FINDINGS.md>: independent agreement on the module
  table (113 × 8 words, base 0x03050000) and the overlay map.
* Related: [rknanofw_container.md](rknanofw_container.md), [../firmware/architecture.md](../firmware/architecture.md),
  [../hardware/soc_rknanod.md](../hardware/soc_rknanod.md).
