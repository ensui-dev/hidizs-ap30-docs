# Storage, file systems and the media library

Status: draft, 2026-11

The firmware has one storage stack for both the internal flash and the microSD card: an SD/MMC host driver, a card
layer that speaks SD or MMC, a small device layer that maps numbered "storage devices" onto partitions, and the
Rockchip SDK's FAT layer (**FAT16, FAT32 and exFAT**, with VFAT long names). Only **one volume is mounted at a time**.
The internal flash holds the boot loader, two firmware slots, a **200 MiB data partition** (settings, e-book
bookmarks, favourites, the media-library database) and the user's FAT32 volume. The **media library** is built by a
three-stage scan into the data partition and is limited to **7,168 songs**. Favourites are stored per disk as
physical locations, which is why they **vanish after a microSD swap**. All facts are from V1.7.8 [AP30] unless
tagged otherwise.

## Contents

- [The stack](#the-stack)
- [Host and card drivers](#host-and-card-drivers)
- [Storage devices](#storage-devices)
- [The internal flash from the firmware's side](#the-internal-flash-from-the-firmwares-side)
- [The data partition (part 1)](#the-data-partition-part-1)
- [File systems](#file-systems)
- [Directory scans and folder depth](#directory-scans-and-folder-depth)
- [microSD handling](#microsd-handling)
- [The media library](#the-media-library)
- [Building the library](#building-the-library)
- [Rebuild triggers](#rebuild-triggers)
- [Favourites](#favourites)
- [Why favourites vanish after a microSD swap](#why-favourites-vanish-after-a-microsd-swap)
- [E-book bookmarks](#e-book-bookmarks)
- [The clean-shutdown mark](#the-clean-shutdown-mark)
- [Playback I/O](#playback-io)
- [Open questions](#open-questions)
- [Sources](#sources)

## The stack

```
 media library (records in part 1)            file browser · player · e-book · pictures · USB disk
          │                                            │ files opened by (directory cluster, entry index),
          │                                            │ fixed files by 8.3 name
          ▼                                            ▼
 FAT layer: FAT16 / FAT32 / exFAT, VFAT long names, exFAT entry sets, 8 file handles, ONE mounted volume
          │   one-sector FAT cache (write-back), one-sector directory cache, no data cache
          ▼
 storage devices: 0x30000 firmware area · 0x30001 data partition · 0x30002 user volume · 0x40000 microSD
          │   byte-granular reader for the firmware area and part 1 (3-sector cache for part 1)
          │   every call made with the deferred audio interrupts held off
          ▼
 card layer: identify SD or MMC, CMD17/18 read, CMD24/25 write, byte or block addressing
          ▼
 host driver: DesignWare-style SD/MMC host, PIO (CPU copies the FIFO), two instances
     SDMMC 0x60020000 (microSD, IRQ 4)        EMMC 0x60030000 (internal flash, IRQ 3)
```

[AP30, analysis of firmware V1.7.8.] The hardware (controllers, the internal chip, the slot) is described in
[../hardware/storage.md](../hardware/storage.md).

## Host and card drivers

- **Host**: the same SD/MMC host IP twice; the driver handles the command engine, FIFO, clock (from the system PLL
  through a divider), power and pins. Data moves by PIO in the interrupt; no DMA [AP30].
- **Identification**: the internal flash is identified in **auto-detect** mode: CMD0, CMD8 (pattern 0x1AA) and further
  probes decide SD or MMC. A forced-MMC mode exists but has no caller [AP30]. The internal chip is very likely an
  **SD-NAND** speaking the SD protocol (an 8-pad package; the board has an unused footprint for a BGA eMMC) [?, high
  confidence]; see [../hardware/storage.md](../hardware/storage.md).
- **SD path**: 1-bit at 400 kHz, CMD0, CMD8, ACMD41 with HCS until ready, CMD2, CMD3 (card's RCA), CSD capacity (v1
  formula or v2 `(C_SIZE + 1) × 1024` sectors), CMD7, CMD16 512, ACMD42 (DAT3 pull-up off), SCR, **4-bit** if allowed,
  CMD6 to **High Speed (50 MHz)** if accepted. Block addressing when the card reports high capacity [AP30].
- **MMC path** (not used on this board as far as can be seen): CMD1, CMD2, CMD3 with a host RCA, 48 MHz, EXT_CSD,
  high-speed timing if allowed, bus test for 4 then 8 bits [AP30].
- **Reads and writes**: CMD17 / CMD18 + CMD12, CMD24 / CMD25; a multi-sector request is one CMD18 for the whole run
  [AP30].
- **Power**: the internal flash's bus clock is gated around each access; an idle SD card is powered down by its
  shutdown hook [AP30].
- **Firmware-area write lock**: writes into the firmware partition (part 0) are refused unless a software key
  (0x444e414e, "NAND") is set; only the updater sets it around its own writes [AP30].

## Storage devices

| Device id | What | Notes |
|---|---|---|
| 0x30000 | firmware area (part 0: FW1 + FW2) | overlays, images, fonts and strings are read here; FW1 starts at its sector 0 |
| 0x30001 | data partition (part 1) | settings, bookmarks, favourites, library database |
| 0x30002 | internal user volume (part 2) | "disk 2" (also 3) in the UI code; USB LUN 0 |
| 0x40000 | microSD card | "disk 4"; USB LUN 1 |

Each device has a driver table of nine operations: init, read, write, info, poll, re-identify, shutdown, write key,
reserved read (tables at 0x0306f480 for the internal flash and 0x0306f4a8 for the SD card) [AP30].

## The internal flash from the firmware's side

Physical sectors of 512 bytes. "Loader LBA" = physical − 0x2000, the numbering the boot loader's USB mode uses.

```
physical            loader LBA        size      content
0x000000-0x00003F   (hidden)          32 KiB    unknown, not read by the firmware [?]
0x000040-0x0017FF   (hidden)          ~3 MiB    boot area: IDB copies 0-4 (boot loader), identity sector;
                                                the firmware reads/writes IDB copy 0 sectors 1-2 (FWUP tag)
0x001800-0x001BFF   (hidden)          512 KiB   a small reserved area with its own read/write routines
0x001C00-0x001FFF   (hidden)          512 KiB   unknown [?]
0x002000-0x010FFF   0x00000-0x0EFFF   30 MiB    part 0, FW1 slot
0x011000-0x01FFFF   0x0F000-0x1DFFF   30 MiB    part 0, FW2 slot (offset = half of part 0)
0x020000-0x083FFF   0x1E000-0x81FFF   200 MiB   part 1, data partition
0x084000-end        0x82000-0xEDFFF   216 MiB   part 2, user volume: MBR, FAT32 at +0x40
```

[AP30, measured on a device with a 983,040-sector (480 MiB) chip.] The size of part 0 ("system zone", 60 MiB here)
and the FW2 offset come from IDB sector 1; the size of part 1 is a **constant 200 MiB** set during boot in V1.7.8;
part 2 is the rest [AP30]. A stale MBR + FAT32 found inside part 1 fits an older layout with a 166 MiB part 1 [?]: if a
future firmware changes that constant, the user volume moves and would be reformatted.

Byte-level layout of the slots and the IDB: [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md).

> **Warning**: never write physical sectors 0x0000-0x1FFF (the IDB / boot loader area). Losing it loses the
> D-pad Right loader mode, the recovery path. Never use `rkdeveloptool ef` and never download random loaders. Writing
> firmware slots and recovery: [../guides/recovery.md](../guides/recovery.md).

## The data partition (part 1)

Part 1 is addressed in blocks of 0x400 sectors (512 KiB) [AP30]:

| Part-1 offset (sectors) | Loader LBA | Content | Written by |
|---|---|---|---|
| block 0 (0x0000) | 0x1E000 | settings: the configuration block (0x2f5 bytes) in a 0x800-byte block with "SAVE"/"INFO" magics and a CRC-8 | every boot (clean mark cleared), settings changes, power-off |
| block 1 (0x0400) | 0x1E400 | e-book bookmarks, 0x188-byte records | e-book reader |
| block 2 (0x0800) | 0x1E800 | favourites of the internal disk (0x1000 bytes) | favourites popup, library rebuild |
| block 3 (0x0C00) | 0x1EC00 | favourites of the microSD (same format) | same |
| block 4 (0x1000) | 0x1F000 | unused? [?] | |
| 0x1400 + 0 | 0x1F400 | library: song records, 0x800 bytes each, written two at a time (8 sectors) | library scan |
| 0x1400 + 0x10000 | 0x2F400 | library: folder records (0x800 bytes) | library scan |
| 0x1400 + 0x40000 … | 0x5F400 … | library: 16-byte tree/index entries; a 0x20-sector directory map at +0x42000; group and sort tables at +0x44000 / +0x50000 / +0x51000 / +0x54000 (sort lists, favourites header area) | scan, sort, record delete |
| byte offsets 0xA600000 / 0xA800000 | | u16 sort-order index per category | sort |

[AP30; the data found in a device dump falls on these offsets.] The library database begins after the first five
blocks [AP30]. There is **one library at a time**: it describes the disk that was scanned last. Writing part 1 is
"safe" in the sense that bad data costs settings or the library, nothing worse [AP30].

## File systems

| Type | Support | Notes |
|---|---|---|
| FAT16 | read / write | |
| FAT32 | read / write | the format the firmware creates |
| exFAT | read / write | allocation bitmap, entry sets, up-case table and name hash; files flagged "no FAT chain" are read as contiguous without touching the FAT |

[AP30.] Behaviour:

- **Mount**: sector 0 → MBR (0x55AA) → partition → boot sector; exFAT recognised by its OEM name, FAT by BPB checks.
  The formatter writes an MBR with one partition at sector 0x40 (the stock user-volume layout) [AP30].
- **Format**: if mounting the internal volume fails at boot, the firmware formats it; an invalid settings block makes
  the boot probe the volume and format it if the probe fails ([startup.md](startup.md#settings-load-and-the-boot-area-tag))
  [AP30].
- **One volume at a time**: switching between internal (disk 2) and microSD (disk 4) remounts and resets the FS state;
  playing from the card while browsing the internal disk means remounts [AP30].
- **Cluster chains**: walked through the single cached FAT sector (128 entries per sector for FAT32/exFAT) [AP30].
- **Reads**: runs of consecutive clusters are read with one multi-sector command when the buffer is word-aligned and
  the position cluster-aligned; unaligned heads and tails go through a one-sector bounce buffer [AP30].
- **Seeks**: forward seeks walk from the current cluster; a backward seek walks again from the first cluster. There
  is no extent cache except for two special seek helpers [AP30].
- **Names**: VFAT long names (13 UTF-16 units per entry) and exFAT names (15 per entry). Names in legacy encodings
  (tags and 8.3 names) are converted with the code-page tables in overlays 63-69 (single-byte, Shift-JIS, Big5,
  Korean) and a GBK table resource [AP30].
- **File size**: sizes are 32-bit; WMA files of 2 GB or more hang the WMA decoder ([known_bugs.md](known_bugs.md)).
- **Card size**: SDSC, SDHC and SDXC by protocol (sector count up to 2 TiB); no UHS-I modes [AP30]. Cards above
  256 GB are not refused; a 512 GB card working fits the code [WEB report].
- **exFAT writes are risky**: several exFAT write paths are wrong (bitmap updates that lose earlier sectors, a bitmap
  assumed to start at cluster 2, a wrong end-of-chain mark, a bad volume-label write, wrong free-space maths). Reading
  exFAT works [AP30]; details in [known_bugs.md](known_bugs.md).

## Directory scans and folder depth

- Directory traversal is depth-first with an explicit stack of **at most 8 levels**: music deeper than 8 folders is
  not found by the scans [AP30].
- Extension filters are lists of 3-letter extensions: music `MP1 MP2 MP3 WMA WAV APE FLA AAC M4A OGG MP4 3GP DFF DSF`,
  plus CUE for the library [AP30].
- Folder-order playback finds "the N-th matching file" by walking folders from the root or the folder start each
  time, so it slows down with folder size [AP30].
- The file browser (overlay 31) filters by type (music, TXT, JPG/JPE/BMP …), shows "Internal" and "SD Card" as roots,
  and can delete files (FAT chain freed + entry deleted, or the exFAT entry set); a delete triggers a library rebuild
  [AP30].

## microSD handling

- **Card detect**: GPIO0_11, active low, **polled** (no interrupt; the host's own detect pin is not muxed) [AP30].
- A latch compares the pin with its last state and raises a "changed" flag that the media layer reads; the USB
  mass-storage code uses it to report a medium change on LUN 1 [AP30].
- **At boot**: if the microSD was the last-used disk and a card is present, it becomes the current disk; if no card is
  present, the internal disk is used and the library is marked dirty [AP30].
- **Removed while playing from it**: the player's stop path switches to the internal disk and posts a "disk changed"
  message [AP30].
- A card change seen by the library menu marks the library dirty, and the rebuild runs on the newly selected disk
  [AP30]. That rebuild is what loses favourites (below).

## The media library

The library menu (overlay 22) offers Now playing, All Music, Artist, Album, Genre, Directory List and Favorites; the
list browser (overlay 23) reads categories, sub-lists and songs from the database in part 1 [AP30].

| Limit | Value | Source |
|---|---|---|
| Song records | **7,168** (the scan stops once its counter passes 0x1BFF) | [AP30] |
| Total entries (files + folders) | 28,672 (loop bound 0x7001) | [AP30] |
| Folder depth | 8 levels | [AP30] |
| Favourites | 500 per disk | [AP30] |
| Name length stored | 128 UTF-16 units (longer names truncated) | [AP30] |
| CUE titles | read with half the field length (64 characters) | [AP30] |

At a typical CD-quality FLAC size of about 35 MB per track, 7,168 tracks are about 250 GB, very likely the origin of
the "256 GB library" figure in the marketing [?].

**Tags read** by the scan and by the player (section 0 tag readers, overlay 37 for ASF) [AP30]:

| Format | Tags |
|---|---|
| MP1 / MP2 / MP3 / AAC | ID3v2 and ID3v1 |
| WAV | RIFF `id3 ` chunk, LIST/INFO |
| APE | APEv2 |
| FLAC, OGG | Vorbis comments |
| M4A / MP4 / 3GP | `ftyp` / `moov` atoms |
| WMA | ASF content description and extended content description |
| DFF, DSF | none |
| CUE | sheets expand to tracks (TITLE, PERFORMER; a track without its own tags takes another track's) |

The tag result has fields for year, title, artist, album and genre (UTF-16) [AP30]. Which field the song lists sort by
and display (title tag or file name) is not traced yet [?].

## Building the library

Task 13 (overlay 5) shows the progress screen "Updating Library…" and runs three overlays [AP30]:

| Stage | Overlay | Work |
|---|---|---|
| 1 scan | 38 | walks every folder of the **current disk**; opens each audio file by location, reads its tags (CUE sheets expand to tracks), takes the long file name, and writes 2 KiB records two at a time; also **rebuilds the favourites list** of the current disk |
| 2 sort | 39 | sorts All Music, Artist, Album and Genre with GBK pinyin keys in chunks, writes index and group tables, fills the library counters in the configuration block (+0x2e … +0x38) |
| 3 finish | 40 | resets the favourites header area |

The library-dirty flag is cleared when the build starts; at the end the settings are saved with the clean-shutdown
mark cleared, and message 0x18d is sent [AP30].
The library-build overlays use a 127 KiB data window that overlaps the playback engine's, so **playback stops** for a
rebuild [AP30].

**Speed**: per file the scan opens the file, parses tags (ID3v2 frames sequentially; large embedded art is skipped by
seeking, and seeks walk the FAT through a one-sector cache), reads the long name and does a synchronous 4 KiB write
every two records. 8-120 ms per file is consistent with those costs [estimate]. Reviewers report 40 s to 10 minutes for
about 5,000 songs or a full 256 GB card, longer with heavy cover art [WEB]; a small library took about 480 ms on a test
unit [measured on a device].

## Rebuild triggers

The library-dirty flag (configuration block +0x42) is set by [AP30]:

| Trigger | Where |
|---|---|
| boot with the clean-shutdown mark ≠ 0x55aa (any unclean stop) | settings load, overlay 1 |
| microSD missing at boot while it was the last disk | main init |
| a disk format | FAT layer |
| a USB File Transfer session in which the host wrote | USB mass storage (overlay 12) |
| a file deleted in the file browser | overlay 31 |
| a disk change seen by the library menu or the main menu | overlays 21, 22 |
| a failed firmware update | main menu |
| two paths in the settings overlay (which menu items exactly is not traced) [?] | overlay 32 |

The main menu checks the flag on every pass and starts task 13 when it is set ([startup.md](startup.md#the-library-rebuild)).

## Favourites

- Stored **per disk**: block 2 of part 1 for the internal disk, block 3 for the microSD; 0x1000 bytes each [AP30].
- Format: up to **500 entries** of `{u32 directory cluster, u32 entry index}`, then a count and the magic 0x55aa55aa
  [AP30]. A favourite is therefore a **physical location** on the volume, not a path.
- The library item popup (overlay 25) offers "Add to favorites"; the favourites popup (overlay 26) offers "Delete
  file", "Clear favorites" and "Exit". Its "Delete file" only removes the entry, it does not delete the file (unlike
  the file browser's) [AP30].
- The list of the current disk is loaded at boot (during the file-system init) [AP30].
- The favourites code is Hidizs' own: it is absent from every Echo Mini release, although the Echo Mini fixed similar
  symptoms in its own code [AP30 + EM].
- Moving files or defragmenting the volume changes their locations and so breaks favourites [?].

## Why favourites vanish after a microSD swap

Observed on a device: favourites disappear after the microSD card is removed and re-inserted, but survive a hard
power cut with the card left in [measured on a device]. The code explains it [AP30]:

```
RAM list = favourites of the disk that was current at boot (say: microSD, from block 3)

card removed  ─► current disk switches to internal ─► library rebuild of the INTERNAL disk
                 scan keeps only RAM entries found on the internal disk  ─► none match (they are SD locations)
                 ─► empty list saved to block 2 (internal)               ─► RAM list now empty

card inserted ─► current disk switches to microSD   ─► library rebuild of the SD
                 scan keeps only RAM entries found on the SD             ─► RAM list is empty
                 ─► empty list saved to block 3 (microSD)                ─► SD favourites gone for good
```

The bug: every rebuild filters **the list currently in RAM** against the disk it scans and saves the result to **that
disk's** block, but the card-change paths switch disk and trigger a rebuild **without loading the new disk's list**
first. A hard power cut with the card in keeps the favourites because the boot loads the SD list and the rebuild then
scans the same disk [AP30]. Workaround: keep the card in; avoid swapping cards while favourites matter. Bug entry:
[known_bugs.md](known_bugs.md).

## E-book bookmarks

The e-book reader (overlay 30, TXT only: code page or UTF-16, line wrap by glyph width) has a bookmark popup with
"Save", "Load" and "Delete bookmark". Bookmarks are 0x188-byte records in block 1 of part 1 [AP30]. The reader's UI:
[ui_and_settings.md](ui_and_settings.md).

## The clean-shutdown mark

- Field +0x2e9 of the configuration block (u32). **0x55aa** = the last power-off was clean [AP30].
- Every clean power-off path saves the settings with the mark set to 0x55aa (power key held 2 s, low battery, sleep
  and idle timers) [AP30].
- Every boot reads the mark: if it is not 0x55aa, the library is marked dirty; then the mark is cleared and the block
  is written back immediately [AP30].
- The end of every library rebuild also clears and saves it [AP30].
- Effect: any stop that does not go through the power-off path (the ~8 s hardware reset, a crash with watchdog reset,
  an empty battery that cuts power) causes a rebuild at the next boot. The full story: [startup.md](startup.md#unclean-shutdown-and-the-library-rebuild).

## Playback I/O

1. Core B asks for data with a mailbox channel 2 message (read 0x6b {buffer in core-B RAM, size, handle}, seek 0x69,
   close 0x73) [AP30 + EM].
2. Core A serves it **inside the channel 2 mailbox interrupt**: it reads straight into core-B RAM, writes back the new
   position and replies [AP30].
3. Core B keeps two input buffers and refills one **synchronously** when the other is used up; it decodes nothing
   meanwhile [AP30]. Buffer sizes per codec: [core_b_codecs.md](core_b_codecs.md#the-core-b-runtime).
4. At a track end the player closes everything and opens the next file: from the library record (a direct
   location) or, in folder modes, by the N-th-file walk [AP30].

Steady-state bandwidth is ample: the heaviest streams (DSD256 about 2.8 MB/s, 24/192 PCM about 1.15 MB/s) are well
below the 10-15 MB/s a 4-bit 50 MHz bus can deliver with PIO [estimate]. The storage share of the track-change gap is
about 15-70 ms, mostly the core-B module reload and per-track tag parsing, more in folder mode with big folders
[estimate]. The whole gap: [audio_playback.md](audio_playback.md#track-change-and-the-gap).

Weak points for real-time audio: refills are synchronous, reads run in an interrupt with other audio work held off
(UI reads such as cover art can delay refills and the other way round), there is no read-ahead beyond the two buffers
and no next-file prefetch [AP30].

## Open questions

- Is the internal chip SD-NAND or eMMC (SD protocol confirmed)? The loader's flash-info reports "Samsung eMMC", which
  is probably a default value [?].
- What is in physical sectors 0x00-0x3F and 0x1C00-0x1FFF [?]; what the small reserved area at 0x1800 holds [?].
- Was part 1 ever 166 MiB (the stale MBR inside part 1)? Compare the part-1 constant in the 0.0.0 and 5.0.0 images.
- Which record field the song lists display and sort (title tag or file name) [?].
- Does the player write to flash at each track change (resume info)? [?]
- Real read latency and throughput of the internal chip and typical microSD cards (benchmark).
- Debounce of the card-detect pin and how often it is polled [?].

## Sources

- [AP30] analysis of firmware V1.7.8 (section 0 storage stack, overlay 1 settings and boot, overlays 5, 22-26, 30, 31,
  37-40), and a full read-only dump of a device's internal flash (layout only).
- Measured on a device: favourites lost after a microSD swap and kept after a hard power cut; library screen duration.
- [EM] official Echo Mini firmware comparison (favourites code absent; FiiO changelog entries about favourites);
  [berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw) `ETUDE.md` (file-service protocol).
- [WEB] Titan Micro TM3F SD-NAND family data sheet (part-number match for the internal chip; see
  [../hardware/storage.md](../hardware/storage.md)).
- [WEB] library scan times and the 512 GB card report: reviews collected in
  [../community/user_feedback.md](../community/user_feedback.md).
