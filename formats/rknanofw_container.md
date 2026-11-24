# The RKnanoFW container (update image)

Status: draft, 2026-11

The AP30 firmware update file (`HIFIYFnn.IMG`, or `ECHOMINI.IMG`) is a Rockchip "RKnanoFW" container: a 512-byte
header with a directory of blobs, the blobs packed back to back, zero padding to an 8 KiB boundary, **a byte-for-byte
copy of the header**, more zero padding up to the length the updater writes, and a 4-byte RKCRC32. The same bytes
(without the final CRC) are what ends up in each firmware slot on the flash. This page gives every field, the padding
rules and a worked example with the numbers of V1.7.8.

## Contents
- [Overall layout](#overall-layout)
- [Header (0x200 bytes)](#header-0x200-bytes)
- [Blobs](#blobs)
- [Padding and the header copy](#padding-and-the-header-copy)
- [The updater's length rule](#the-updaters-length-rule)
- [RKCRC32](#rkcrc32)
- [Who checks what](#who-checks-what)
- [Worked example: V1.7.8](#worked-example-v178)
- [Building a valid image](#building-a-valid-image)
- [How the SDK makes this file](#how-the-sdk-makes-this-file)
- [Open questions](#open-questions)
- [Sources](#sources)

## Overall layout

```
offset
0          ┌──────────────────────────────┐
           │ header (0x200)               │
0x200      ├──────────────────────────────┤
           │ blobs, back to back,         │  stage[3] (code), font[0], font[1], gbk[0],
           │ no alignment                 │  strtbl[0], imageres[0]
end        ├──────────────────────────────┤
           │ zeros up to an 8 KiB boundary│
size       ├──────────────────────────────┤  size = u32 at header +0x1F4
           │ copy of the header (0x200)   │  must equal the header byte for byte
size+0x200 ├──────────────────────────────┤
           │ zeros                        │
L          ├──────────────────────────────┤  L = (size + 0x104000) & ~0xFFFFF
           │ RKCRC32, u32 little-endian   │
L+4        └──────────────────────────────┘  = file length
```
All [AP30].

## Header (0x200 bytes)

The layout matches `struct rknano_header_t` in Rockbox's `rkboottool` [WEB], confirmed on the AP30 images [AP30].

| Offset | Type | Field | V1.7.8 value | Notes |
|---|---|---|---|---|
| 0x000 | u16 | year (BCD) | `0x2026` | stored LE: bytes `26 20` |
| 0x002 | u8 | day of month (BCD) | `0x19` | |
| 0x003 | u8 | month (BCD) | `0x10` | → 2026-10-19. Shown in Settings → About as month-day [AP30, device] |
| 0x004 | u16 | major (BCD) | 8 | "8.0.0" |
| 0x006 | u16 | minor (BCD) | 0 | |
| 0x008 | u16 | revision (BCD) | 0 | |
| 0x00A | u8[6] | unknown | `00 00 10 32 54 76` | constant in all AP30 images seen [?] |
| 0x010 | char[32] | vendor | "Rockchip" | the RECHO Echo Mini community image uses "RECHO" here [AP30 comparison] |
| 0x030 | char[32] | model | "RKnano SDK 1.0" | |
| 0x050 | u32 + 4 × {u32 offset, u32 size} | stage group | entries 0-2: offset 0x200, size 0; entry 3: the code | **stage[3].offset is at 0x06C**, its size at 0x070 |
| 0x074 | u32 + 10 × {offset, size} | font group | 2 fonts | |
| 0x0C8 | u32 + 5 × {offset, size} | gbk group | 1 table | |
| 0x0F4 | u32 + 10 × {offset, size} | strtbl group | 1 table | |
| 0x148 | u32 + 10 × {offset, size} | imageres group | 1 blob | |
| 0x19C | u32 + 10 × {offset, size} | unknown group | count 1, entry (0, 0) | |
| 0x1F0 | u32 | pad | 0 | |
| 0x1F4 | u32 | **size** | `0x01B90000` | offset of the header copy = length of header + blobs + padding |
| 0x1F8 | char[8] | **magic** | `RKnanoFW` | checked by the loader and the updater |

Each group is a `u32 count` followed by a fixed number of `{u32 offset, u32 size}` entries (4, 10, 5, 10, 10, 10).
Offsets are from the start of the file. Unused entries are zero [AP30].

**Stages 0-2 are empty** (offset 0x200, size 0): the update image carries no boot loader. The loader lives in the
flash's IDB area and is never written by an update [AP30]. See [../firmware/boot_loader.md](../firmware/boot_loader.md).

## Blobs

| Blob | Content | Page |
|---|---|---|
| stage[3] | code stage: section table + all code and data sections | [stage3_sections.md](stage3_sections.md) |
| font[0], font[1] | 12 px and 16 px bitmap fonts | [resources.md](resources.md#fonts) |
| gbk[0] | code-page tables + pinyin sort table | [resources.md](resources.md#gbk-and-code-page-tables) |
| strtbl[0] | string and menu table, 21 languages | [resources.md](resources.md#string-and-menu-table-strtbl) |
| imageres[0] | all UI images | [resources.md](resources.md#images-imageres) |

Blobs are packed back to back with **no alignment** (V1.7.8's font[0] starts at the odd-looking offset 0x188914)
[AP30]. The order above is the order in both official images.

## Padding and the header copy

* After the last blob: zeros up to a multiple of **8 KiB**. The two official images fit 4, 8 or 16 KiB alignment
  equally; 64 KiB does not fit the factory image. 8 KiB matches the updater's write block size, so it is the safe
  choice [AP30; the generator's real rule [?]].
* `header.size` (+0x1F4) = that padded length.
* At offset `size`: **a copy of the 512-byte header**, identical byte for byte (date fields included).
* Then zeros up to the updater length `L`.

## The updater's length rule

The stock updater writes exactly

```
L = (size + 0x104000) & ~0xFFFFF
```

bytes from the file into each slot: `size` plus at least the header copy, rounded to a 1 MiB boundary with about
1 MiB of slack [AP30, traced in the updater]. Official images are padded with zeros to exactly `L` before the CRC, so
the CRC sits at offset `L` and the file is `L + 4` bytes long [AP30].

## RKCRC32

| Parameter | Value |
|---|---|
| Polynomial | `0x04C10DB7` (note: not the common `0x04C11DB7`) |
| Initial value | 0 |
| Bit order | MSB first, no input or output reflection |
| Final XOR | none |
| Coverage | every byte before the last 4 (offsets 0 .. L−1) |
| Storage | u32 little-endian at offset L |

All [AP30], verified on both official images.

## Who checks what

| Check | Loader | Stock updater (V1.7.8) |
|---|---|---|
| `RKnanoFW` magic at +0x1F8 | yes | yes |
| header == copy at `size` | yes | yes |
| RKCRC32 | **no** | **no** |
| date / version | no | **no** (a date-comparing routine exists but nothing calls it) |
| vendor / model strings | no | no |
| signature | none exists | none exists |

All [AP30]. A Rockchip SDK sample image (inside a factory-tool package) ends exactly at its aligned length with no
CRC at all, a third sign that the CRC is never verified [EVK]. Update behaviour in full:
[../firmware/update_process.md](../firmware/update_process.md).

## Worked example: V1.7.8

`HIFIYF18.IMG`, 29,360,132 bytes, SHA-256 `c7601873cb3be8d1320225c69669e504576f7bcb1126595a9040492338e79840` [AP30].

| Item | Offset | Size | End |
|---|---|---|---|
| header | 0x0000000 | 0x200 | 0x0000200 |
| stage[3] (code) | 0x0000200 | 0x188714 | 0x0188914 |
| font[0] (12 px) | 0x0188914 | 0x201C06 | 0x038A51A |
| font[1] (16 px) | 0x038A51A | 0x211C06 | 0x059C120 |
| gbk[0] | 0x059C120 | 0x1CA34A | 0x076646A |
| strtbl[0] | 0x076646A | 0x1AF4A4 | 0x091590E |
| imageres[0] | 0x091590E | 0x127A526 | 0x1B8FE34 |
| zero padding (8 KiB) | 0x1B8FE34 | 0x1CC | 0x1B90000 |
| header copy | **0x1B90000** (= `size`) | 0x200 | 0x1B90200 |
| zero padding | 0x1B90200 | 0x6FE00 | 0x1C00000 |
| RKCRC32 | **0x1C00000** (= L) | 4 | 0x1C00004 |

Check of the length rule: `(0x1B90000 + 0x104000) & ~0xFFFFF = 0x1C94000 & ~0xFFFFF = 0x1C00000`, and
`0x1C00004` = 29,360,132 bytes [AP30].

So each firmware slot on the flash receives 0x1C00000 bytes = 28 MiB = 0xE000 sectors [AP30]. On a device running
V1.7.8, both slots read back with the same SHA-256 as the official file's first 0x1C00000 bytes
(`1c5db427…dc4912473`) [AP30, measured].

First header bytes: `26 20 19 10 08 00 00 00 00 00` = 2026-10-19, version 8.0.0 [AP30].

The other official images use the same container. Their dates and versions:
[../overview/firmware_releases.md](../overview/firmware_releases.md).

## Building a valid image

1. Write the blobs back to back after a 0x200 header area; fill in each group's count, offsets and sizes.
2. Pad with zeros to the next 8 KiB boundary; that length is `size`; store it at +0x1F4.
3. Fill in date, version, vendor, model, magic.
4. Append a copy of the finished header.
5. Pad with zeros to `L = (size + 0x104000) & ~0xFFFFF`.
6. Append the RKCRC32 of bytes 0..L−1.

If anything in the header changes (a date, a blob size), **both** the header and its copy must change, and the CRC must
be recomputed. An image whose copy does not match is rejected by the updater and, if it ever got into a slot, by the
loader [AP30].

## How the SDK makes this file

In Rockchip's SDK, a Windows tool ("RKnanoTool") packs system code, menu and images into `Firmware.img`; a batch file
then runs `GenUFw.exe Firmware.img RKNANOFW.IMG 64 1` [EVK, SDK guide V1.3 p.42-43]. The user copies `RKNANOFW.IMG` to
the disk root and the device updates itself, reboots and deletes the file [EVK]. The AP30 renamed the file to
`ECHOMINI.IMG` / `HIFIYFnn.IMG` [AP30]. The meaning of the `64 1` arguments, and whether `GenUFw` appends the CRC, is not
known [?].

## Open questions

* The six bytes at +0x0A (`00 00 10 32 54 76`).
* The "unknown" group at +0x19C (one empty entry).
* The real alignment rule of the generator (4, 8 or 16 KiB all fit the official images).
* Whether any tool ever checks the RKCRC32.

## Sources

* [AP30] analysis of firmware V1.7.8 and 5.0.0 (byte-identical unpack/repack); measured on a device (slot reads).
* [WEB] Rockbox `utils/rknanoutils/rkboottool`, <https://github.com/Rockbox/rockbox/tree/master/utils/rknanoutils/rkboottool>.
* [EVK] Rockchip RKNanoD SDK guide V1.3; SDK factory-tool sample image.
* Related: [stage3_sections.md](stage3_sections.md), [idb_and_flash_layout.md](idb_and_flash_layout.md),
  [../guides/installing_firmware.md](../guides/installing_firmware.md).
