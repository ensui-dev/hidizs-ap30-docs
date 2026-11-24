# Internal flash layout

Status: draft, 2026-11

The AP30's internal storage is a 480 MiB flash chip (983,040 sectors of 512 bytes) on the SoC's EMMC controller. It
holds, in order: a hidden 4 MiB area with five copies of the boot loader (the "IDB area"), two 30 MiB firmware slots
(FW1 and FW2), a 200 MiB reserved partition (settings, favourites, bookmarks, media-library database), and the 216 MiB
FAT32 user volume that a computer sees in File Transfer mode. This page gives the measured map, the three different
sector-numbering schemes in use, and what may and may not be written.

## Contents
- [The chip](#the-chip)
- [Three ways to number sectors](#three-ways-to-number-sectors)
- [The map](#the-map)
- [Hidden area (physical 0x0000-0x1FFF)](#hidden-area-physical-0x0000-0x1fff)
- [Firmware slots FW1 and FW2](#firmware-slots-fw1-and-fw2)
- [Reserved partition (part 1)](#reserved-partition-part-1)
- [User volume (part 2)](#user-volume-part-2)
- [Write rules](#write-rules)
- [How this was measured](#how-this-was-measured)
- [Open questions](#open-questions)
- [Sources](#sources)

## The chip

| Item | Value | Tag |
|---|---|---|
| Size | 983,040 sectors × 512 B = 480 MiB | [AP30, loader flash info] |
| Loader report | "Samsung eMMC", block 512 KiB, page 8 KiB | [AP30]; vendor field probably a default [?] |
| Part on the board | an 8-pad LGA package marked as a Titan Micro TM3F-series SD-NAND (4 Gbit), next to an empty BGA eMMC footprint | [AP30 board inspection; WEB datasheet match only, ?] |
| Protocol | the firmware auto-detects SD vs MMC; SD protocol, 4-bit, up to 50 MHz is most likely | [AP30; ?] |

Hardware details: [../hardware/storage.md](../hardware/storage.md). Erased space reads as 0xFF [AP30].

## Three ways to number sectors

| Scheme | Sector 0 is | Relation | Used by |
|---|---|---|---|
| **physical** | the first sector of the chip | — | the stock firmware's raw boot-area code; this page |
| **loader LBA** | physical 0x2000 (the FW1 header) | loader LBA = physical − 0x2000 | Rockusb READ_LBA / WRITE_LBA (rkdeveloptool `rl`/`wl`); the firmware's firmware-area device |
| **op 0x04 address** | physical 0x40 (IDB copy 0 header) | address = physical − 64 | Rockusb READ_SECTOR (0x04); the firmware's "boot area" sector numbers |

All [AP30]. Proofs: loader LBA 0 returns a sector with `RKnanoFW` at +0x1F8 (the FW1 header); op 0x04 addresses
0x1FC0..0x1FFF are byte-identical to loader LBA 0..0x3F [AP30, measured]. Physical sectors 0..63 are reachable with
neither command.

## The map

```
physical   loader LBA  size     content
0x000000   —           32 KiB   unknown, unreadable over USB                                [?]
0x000040   —           ~3 MiB   "boot area": IDB copies 0-4 at physical 0x40 + 0x400·i,
                                each ~60 sectors (loader 4.16), rest erased; FAT16 leftover
0x001800   —           512 KiB  "reserved area" the firmware can access raw (read as 0xFF)
0x001C00   —           512 KiB  unknown (read as 0xFF)                                     [?]
0x002000   0x00000     28 MiB   FW1: RKnanoFW image + header copy (0xE000 sectors written)
0x010000   0x0E000     2 MiB    rest of the FW1 slot: leftover data (an older header)
0x011000   0x0F000     28 MiB   FW2: same image (the stock updater writes both)
0x01F000   0x1D000     2 MiB    rest of the FW2 slot
           └── part 0 = "system zone", 60 MiB (0x1E000 sectors), size taken from the IDB ──┘
0x020000   0x1E000     200 MiB  part 1: reserved partition (settings, favourites, bookmarks,
                                media-library database)
0x084000   0x82000     216 MiB  part 2: user volume = MBR + FAT32 at +64 sectors (USB LUN 0)
0x0F0000   0xEE000     end      (983,040 sectors)
```
All [AP30, measured from a full read of loader LBA 0..0xEDFFF plus the op 0x04 view, and computed from the firmware's
partition code; the two agree exactly].

## Hidden area (physical 0x0000-0x1FFF)

* **Never written by firmware updates** [AP30]. Not part of the loader's LBA space, so `wl`-style writes cannot reach it
  by accident with a correct client [AP30].
* **IDB copies:** five identical copies at physical 0x40, 0x440, 0x840, 0xC40, 0x1040. Each copy: header (RC4), sector 1
  (`NANO` tag, system-zone size), sector 2 (chip ID "C262"), sector 3 (device identity: serial, UID, Bluetooth/Wi-Fi MAC
  fields), stage A, stage B, stage C (the main loader), a trailer [AP30]. Full description, scrambling and loader
  behaviour: [../firmware/boot_loader.md](../firmware/boot_loader.md).
* **FAT16 leftover** at physical 0x1F0 (a boot sector "MSDOS5.0" / "NO NAME" whose hidden-sector field is 496 = its own
  position, plus two empty FATs): most likely left by a factory format [AP30; origin ?].
* **Firmware access:** the stock firmware has raw functions for physical 0x40 + n (limit 0x1800, the "boot area") and for
  physical 0x1800-0x1BFF (the "reserved area"). The only write seen in use clears a `FWUP` tag in sectors 1-2 of IDB
  copy 0 [AP30].
* **IDB sector 1 values the firmware uses:** +0x02 = system-zone size in MiB (60); the firmware converts it to sectors
  (× 2048 = 0x1E000) and takes half of it (0xF000) as the FW2 slot offset; +0x0A = `NANO` tag (checked); +0x20 = another
  value, role unknown [AP30].

## Firmware slots FW1 and FW2

| Item | FW1 | FW2 |
|---|---|---|
| Physical start | 0x2000 | 0x11000 |
| Loader LBA | 0 | 0xF000 (= half the system zone) |
| Slot size | 30 MiB (0xF000 sectors) | 30 MiB |
| Bytes written by the updater (V1.7.8) | 0x1C00000 = 28 MiB = 0xE000 sectors | same |
| Header copy (V1.7.8) | loader LBA 0xDC80 | loader LBA 0x1CC80 |

All [AP30].

* The slot content is the update file without its final 4-byte CRC: header, blobs, padding, header copy, padding
  ([rknanofw_container.md](rknanofw_container.md)) [AP30].
* The loader boots FW1 and tries FW2 only if FW1 fails its magic / header-copy check [AP30].
* The stock updater writes FW2 first (header block last), then copies FW2 over FW1 the same way; after any official
  install both slots hold the same image [AP30, verified by reading both headers].
* **Leftovers:** loader LBA 0xE000-0xEFFF (after FW1's 28 MiB) holds a copy of an older image's first 2 MiB, including
  a stale header. It is inert in V1.7.8 (the routine that would scan for FW2 by headers is never called), and nothing
  needs it removed [AP30].
* The firmware locks the system zone against writes unless a software key (the ASCII bytes "NAND", 0x444E414E) is set
  around the updater's writes [AP30].
* On the Snowsky Echo Mini, FW2 was described as sitting at half the start of the user zone ("R = P/2") [EM]. On the
  AP30 that does not hold: FW2 is at half the 60 MiB system zone (0xF000), while the user zone starts at 0x82000 [AP30].

## Reserved partition (part 1)

Loader LBA 0x1E000-0x81FFF (200 MiB; the size is a constant in V1.7.8's partition code) [AP30]. Blocks of 0x400
sectors (512 KiB):

| Loader LBA | Content | Written by |
|---|---|---|
| 0x1E000 | settings: "SAVE" / "INFO" magics, firmware date/version, the settings structure (same layout as the default block in the code stage), CRC-8 | boot, settings changes, power-off |
| 0x1E400 | e-book bookmarks (0x188-byte records) | e-book reader |
| 0x1E800 | favourites for the internal disk: 500 × {u32 directory cluster, u32 entry index}, count, magic 0x55AA55AA | favourites, library rebuild |
| 0x1EC00 | favourites for the microSD card (same format) | same |
| 0x1F000 | unused? | [?] |
| 0x1F400 | media library: song records (0x800 bytes each) | library rebuild |
| 0x2F400 | media library: folder records | library rebuild |
| 0x5F400.. | media library: index entries, directory map, group and sort tables | library rebuild and browsing |

All [AP30, firmware analysis matched against the occupied areas of a flash dump]. Settings CRC-8: polynomial 0x1D,
initial value 0x0F [AP30]. Only one library exists at a time: it describes the disk scanned last [AP30]. Details:
[../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md),
[../firmware/ui_and_settings.md](../firmware/ui_and_settings.md).

Wrong data here costs settings, favourites or the library, nothing worse; the firmware rebuilds or resets them [AP30].

## User volume (part 2)

* Loader LBA 0x82000 (physical 0x84000) to the end: 442,368 sectors = 216 MiB [AP30].
* Starts with an MBR; the FAT32 file system begins 64 sectors later [AP30].
* This is what File Transfer mode exposes as LUN 0 ("HIFI MP3 / USB MP3"), and where update files are copied [AP30].
* The firmware formats it if mounting fails at boot [AP30].
* **Stale layout:** a second MBR + FAT32 at loader LBA 0x71000 (511,936 sectors) with older files was found in a dump.
  It fits an older layout with a smaller part 1 (166 MiB) [AP30 measured; interpretation ?]. If a future firmware
  changes the part-1 size, the user volume moves and is reformatted [?].

## Write rules

> **Warning**
> * **Never write physical sectors 0x0000-0x1FFF.** They hold the boot loader, its five copies and the device identity.
>   Losing them removes loader USB mode, the only proven recovery path; what remains is untested mask-ROM work.
> * Never run `rkdeveloptool ef` (erase flash), and never download or upgrade a loader (`db`, `ul`).
> * Write firmware only into FW1 (loader LBA 0) or FW2 (loader LBA 0xF000), with a client that reads every chunk back.
>   Keep a full backup first ([../guides/backup.md](../guides/backup.md)).
> * Recovery path if a written image does not boot: [../guides/recovery.md](../guides/recovery.md).

Good practice for slot writes, as the stock updater does: invalidate the destination header first, write the body,
write the header block last, read back each block [AP30].

## How this was measured

1. The player was put into loader USB mode (D-pad Right + Power with USB connected) [AP30].
2. A Rockusb client read loader LBA 0..0xEDFFF (974,848 sectors, 476 MiB) with READ_LBA in 16-sector commands, at
   about 1.18 MiB/s; larger reads (128 sectors) wedged the loader [AP30].
3. The hidden area was read with READ_SECTOR (0x04), one sector per command, 528 bytes per reply, addresses 0..0x1FFF;
   three dumps were identical [AP30].
4. The dump was mapped: firmware headers found by the `RKnanoFW` magic and header copies, MBRs and FAT boot sectors
   located, occupied vs erased (0xFF) regions listed [AP30].
5. The factory update file was found as a deleted file on the user volume, its data intact; extracted, it is
   byte-identical to Hidizs' public "11-Game" download, which shows the whole read path is exact [AP30].
6. The partition sizes were then traced in the firmware (system zone from IDB sector 1, part 1 = 200 MiB constant) and
   matched the dump exactly [AP30].

Procedure for your own device: [../guides/backup.md](../guides/backup.md).

## Open questions

* Physical sectors 0..63 (unreadable over USB).
* Physical 0x1C00-0x1FFF, and whether the firmware ever writes its "reserved area" 0x1800-0x1BFF.
* Loader LBA 0x1F000 (block 4 of part 1).
* The real chip type (SD-NAND vs eMMC) and whether other production runs use the eMMC footprint.
* The origin of the FAT16 leftover in the hidden area.

## Sources

* [AP30] measured on a device (full read of the loader LBA space and the hidden area, Rockusb flash info); analysis of
  firmware V1.7.8 (partition, updater and raw boot-area code).
* [EM] Snowsky Echo Mini study (`ETUDE.md`), <https://github.com/iamcheyan/echo-mini-newfw>.
* [WEB] Titan Micro TM3F SD-NAND datasheet (part-number match only).
* Related: [../firmware/boot_loader.md](../firmware/boot_loader.md), [rknanofw_container.md](rknanofw_container.md),
  [../hardware/storage.md](../hardware/storage.md).
