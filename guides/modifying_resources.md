# Modifying images and strings

Status: draft, 2026-11

The AP30's update image is not signed or encrypted, so its pictures and texts can be changed on a PC and the result
installed with the normal update method. The work is: unpack the container, convert the images to an editable format
(and the strings to text), edit, convert back, repack the container with correct offsets, padding, header copy and CRC,
then install. A first modified image (the boot screen colour-inverted) was built this way and installed on a device,
and the official firmware was put back afterwards. This page explains the steps in tool-neutral terms and lists the
constraints that make or break an image.

## Contents
- [Overview](#overview)
- [Step 1: unpack](#step-1-unpack)
- [Step 2: edit images](#step-2-edit-images)
- [Step 3: edit strings](#step-3-edit-strings)
- [Step 4: repack](#step-4-repack)
- [Step 5: check before installing](#step-5-check-before-installing)
- [Step 6: install and test](#step-6-install-and-test)
- [Proof on a device: the inverted boot screen](#proof-on-a-device-the-inverted-boot-screen)
- [Constraints](#constraints)
- [Fonts](#fonts)
- [Tools](#tools)
- [Open questions](#open-questions)
- [Sources](#sources)

## Overview

```
HIFIYF18.IMG ──unpack──► header fields + stage3 + font0 + font1 + gbk + strtbl + imageres
                                                              │           │
                                         strings ⇄ text (UTF-16)    images ⇄ PNG (RGB565 BE)
                                                              │           │
             ◄──repack── new blobs back to back, new offsets/sizes, 8 KiB pad, header copy, pad, RKCRC32
ECHOMINI.IMG ──copy to internal disk, restart──► stock updater installs it
```

**Start with a round trip:** unpack an official image and repack it without changes. The result must be
**byte-identical** to the original (same SHA-256). Only a tool that passes this test on your source image should be
trusted with edits [AP30: two official images round-trip byte-identically].

## Step 1: unpack

Read the 512-byte header and cut out each blob from its `{offset, size}` entry
([../formats/rknanofw_container.md](../formats/rknanofw_container.md)). Keep the header fields (date, version, the six
unknown bytes, vendor, model, the "unknown" group) so they can be written back unchanged.

## Step 2: edit images

Image blob layout: [../formats/resources.md](../formats/resources.md#images-imageres).

1. For each of the 478 table entries read `w, h, x, y, size, offset`, take `w × h × 2` bytes at `offset`, and convert
   **big-endian RGB565** to 24-bit RGB (expand 5/6/5 bits to 8 bits). Save as PNG, keeping the index and original name.
2. Edit in any image editor. **Keep the width and height.** Avoid alpha; the format has none.
3. Convert back: 8-bit channels to 5/6/5 bits, write high byte first. Converting an unchanged pixel PNG → RGB565 → PNG is
   lossless as long as the expansion is done consistently (the low bits carry no extra information) [AP30].
4. Write the pixels back into the blob in index order with no gaps, update the table offsets if any size changed, and
   keep the name records and the 22-byte trailer.

Notes [AP30]:
* The name records contain leftover bytes after each name's NUL; copy them unchanged to stay byte-identical.
* The 16-byte trailer hash is not checked by anything. Keep it unchanged; a modified image displays fine with the old
  hash.
* Image 0 (`POWERON0`) is the full-screen boot logo, 296 × 240.

## Step 3: edit strings

String table layout: [../formats/resources.md](../formats/resources.md#string-and-menu-table-strtbl).

1. Detect the record size (V1.7.8: 307 records × 0x112 bytes; factory 5.0.0: 289 × 0x102) instead of hard-coding it.
2. For each of the 21 language blocks and each record, keep the 8-word header and child slots unchanged and decode the
   UTF-16LE text up to the NUL.
3. Edit the text. **Limit: 99 UTF-16 code units** per string in both known layouts (a 200-byte text area including the
   NUL terminator). Characters outside the Basic Multilingual Plane (e.g. emoji above U+FFFF) cannot be displayed.
4. Re-encode: header words + text + zero padding to the record size. The header words must be **identical in every
   language block** [AP30].
5. Do not reorder, add or remove records: the firmware looks strings up by record number, and the Settings tree is
   encoded in the headers (records 124-306) [AP30]. The record count is also stored in the code stage's configuration
   block (+0x4C).
6. Every glyph you use must exist in the fonts (see [Fonts](#fonts)).

## Step 4: repack

1. Blobs in the original order (stage3, font0, font1, gbk, strtbl, imageres), back to back, no alignment, after a 0x200
   header area.
2. Update each group's `{offset, size}` in the header.
3. Zero-pad to the next **8 KiB** boundary; store that length as `size` at header +0x1F4.
4. Optionally set a **newer date** (BCD, +0x00..+0x03) so the image is recognisable in Settings → About; leave the
   version alone if unsure. Nothing checks either field [AP30].
5. Append an **exact copy of the final header** at offset `size`.
6. Zero-pad to `L = (size + 0x104000) & ~0xFFFFF`.
7. Append the RKCRC32 (poly 0x04C10DB7, init 0, MSB-first, no reflection, no final XOR) of bytes 0..L−1, little-endian.

## Step 5: check before installing

| Check | Why |
|---|---|
| `RKnanoFW` at 0x1F8 | the updater and the loader refuse anything else |
| bytes `size .. size+0x1FF` == bytes `0 .. 0x1FF` | the one structural check both make; a stale copy (for example after changing the date in only one place) gets the image rejected |
| file length = L + 4 and L follows the rule | the updater writes exactly L bytes; a shorter file makes the last file read fail |
| CRC recomputed | unchecked on the device, but other tools may check it |
| diff against the original | only the bytes you meant to change, plus the two date fields and the CRC, should differ |
| stage3 untouched | resource edits never need code changes |

## Step 6: install and test

> **Warning**
> * Installing writes both firmware slots. A resource-only change cannot stop the loader from booting the image, but an
>   image that crashes when it draws a changed resource would need the loader-mode recovery.
> * Before the first custom install: make a full [backup](backup.md) and practise the loader entry (D-pad Right + Power
>   with USB) from [recovery.md](recovery.md). Keep the cable at hand.
> * The update path never writes the boot loader area (physical sectors 0..0x1FFF). Do not use any other tool to write
>   there, never run `rkdeveloptool ef`, never download a loader.

1. Name the file `ECHOMINI.IMG` (scanned first, easy to recognise) or `HIFIYFnn.IMG`.
2. Copy it to the root of the internal disk, eject, restart ([installing_firmware.md](installing_firmware.md)).
3. To undo, copy an official `HIFIYFnn.IMG` the same way.

## Proof on a device: the inverted boot screen

Done in November 2026 [AP30]:

| Item | Value |
|---|---|
| Base | official V1.7.8 (`HIFIYF18.IMG`) |
| Change | image 0 (boot screen `POWERON0`, 296 × 240) colour-inverted; nothing else |
| Header date | 2026-11-17 (newer than V1.7.8's 2026-10-19); version left at 8.0.0 |
| File name | `ECHOMINI.IMG` |
| Diff vs the official file | 142,088 bytes differ, **all** inside image 0's pixels, the two date fields (header and header copy) and the CRC |
| Result | the update ran; the boot screen showed a dark background with the logo in inverted colours; Settings → About showed the date 11-17 |
| Undo | official `HIFIYF18.IMG` copied over it: normal boot screen and original date back |

This proves on hardware that: images can be replaced; the image trailer hash is not checked; the CRC is not needed to
match anything on the device (it was recomputed anyway); the `ECHOMINI.IMG` name works; and there is no date check in
either direction [AP30].

## Constraints

| Constraint | Reason | Tag |
|---|---|---|
| Keep image dimensions and indices | code addresses images by index and may assume sizes and positions | [AP30] |
| Keep the record count and headers of the string table | lookups by record number; the Settings tree lives in the headers | [AP30] |
| Text ≤ 99 UTF-16 units, BMP only | fixed text area; 16-bit glyph index | [AP30] |
| Glyphs must exist in the 12 px and 16 px fonts | the UI draws from the font cells; an empty cell draws nothing | [AP30] |
| Header copy must match | checked by updater and loader | [AP30] |
| `size` on an 8 KiB boundary, length L by the rule | the updater's write length and block size | [AP30] |
| Blob order and back-to-back packing | matches the official images; other orders untested | [AP30; ?] |
| Total image ≤ 28 MiB (L ≤ 0x1C00000 keeps the current slot use; slots are 30 MiB) | FW2 starts 30 MiB after FW1; an image longer than the slot would overwrite FW2 | [AP30] |
| Fonts, images and GBK are identical between 5.0.0 and V1.7.8, the string table is not | do not mix a string table from one version with code from another | [AP30] |

## Fonts

Fonts are plain cell arrays indexed by code point
([../formats/resources.md](../formats/resources.md#fonts)): 12 px cells of 32 bytes (12 rows × 16 bits + a metrics byte
`0x80 | advance`), 16 px cells of 33 bytes. Redrawing a glyph means rewriting its cell; the blob size stays the same.
Hidizs did exactly this to Rockchip's SDK fonts for Vietnamese and Greek glyphs [AP30]. Font changes are untested on the
device [?].

## Tools

No specific tool is required; the formats are fully described in this collection. Public tools that handle the same
container family:
* Rockbox `utils/rknanoutils` (`rkboottool`): container parsing, <https://github.com/Rockbox/rockbox>.
* flame-ocean-website: a browser firmware editor for the Snowsky Echo Mini (fonts, images, themes),
  <https://github.com/losses/flame-ocean-website>.
* Echo-Mini-Customizer (themes and resources, Echo Mini), <https://github.com/BlackVllad/Echo-Mini-Customizer>.
* An unpack/pack script for the AP30 in <https://github.com/nkahoang/hidizs-ap30-game-emu>.

Whether the Echo Mini tools handle AP30 images correctly is not checked [?]; always do the byte-identical round-trip
test first.

## Open questions

* Can images change size safely if the code never assumes it (per image)?
* Can strings be added (new records) without code changes? Probably not [?].
* Font edits on the device.

## Sources

* [AP30] analysis of firmware V1.7.8 and 5.0.0 (byte-identical round trips); the inverted-boot-screen image built,
  installed and reverted on a device.
* [WEB] Rockbox; flame-ocean-website; Echo-Mini-Customizer; nkahoang/hidizs-ap30-game-emu (links above).
* Related: [../formats/README.md](../formats/README.md), [installing_firmware.md](installing_firmware.md).
