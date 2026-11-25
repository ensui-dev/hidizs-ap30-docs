# Resource blobs: images, strings, fonts, character tables

Status: draft, 2026-11

Besides code, the AP30 update image carries five resource blobs: one image collection (`imageres`, 478 pictures in
RGB565), one string and menu table (`strtbl`, 21 languages), two bitmap fonts (12 px and 16 px, indexed by Unicode code
point) and one character-set table (`gbk`, code-page data plus a pinyin sort table). The firmware also has seven
code-page tables stored as data-only code sections. This page gives the byte layout of each, how they relate to
Rockchip's SDK tools, and what differs between firmware versions. Where each blob sits in the image:
[rknanofw_container.md](rknanofw_container.md).

## Contents
- [Images (imageres)](#images-imageres)
- [String and menu table (strtbl)](#string-and-menu-table-strtbl)
- [Fonts](#fonts)
- [GBK and code-page tables](#gbk-and-code-page-tables)
- [What changes between versions](#what-changes-between-versions)
- [Open questions](#open-questions)
- [Sources](#sources)

## Images (imageres)

V1.7.8: blob size 0x127A526, **478 images** [AP30].

| Blob offset | Field | Content |
|---|---|---|
| 0x0000 | `char magic[16]` | "ROCK26IMAGERES  " (14 letters + 2 spaces) |
| 0x0010 | `u32 count` | 478 |
| 0x0014 | 12 × 0x00 | |
| 0x0020 | count × image entry (16 bytes) | see below |
| 0x1E00 | zeros up to 0x2200 | table area reserved |
| 0x2200 | pixels | image after image, in index order, no gaps; format RGB565, BIG-endian (high byte first) |
| ... | count × name record (108 bytes) | see below |
| end−22 | trailer (22 bytes) | see below |

| Image entry (16 bytes) | Meaning |
|---|---|
| `u16 w, u16 h` | size in pixels |
| `u16 x, u16 y` | screen position where the UI draws it |
| `u32 size` | = w × h × 2 |
| `u32 offset` | of the pixels, from the start of the blob |

| Name record (108 bytes) | Meaning |
|---|---|
| `char name[96]` | original BMP file name, NUL-terminated; the bytes after the NUL are leftovers of the Windows builder's memory (not zeros) |
| `u32 offset, u32 w, u32 h` | duplicates of the table entry |

| Trailer (22 bytes) | Meaning |
|---|---|
| `u16 count` | |
| `u32` | total pixel bytes |
| `u8 hash[16]` | |
All [AP30].

* **Pixel format:** 16-bit RGB565 (5 bits red, 6 green, 5 blue), stored **big-endian**. The firmware reads images from
  the flash in 1 KiB chunks and swaps the bytes on the way to the display [AP30]. Images have no alpha; glyphs are drawn
  through a separate 1-bit path [AP30].
* **Names** keep the original BMP file names, e.g. `POWERON0_(0,0).BMP` (the boot screen) or `MAINMENU_MUSIC_(x,y).BMP`.
  The `(x,y)` part is the screen position, the same as the table entry [AP30].
* Image 0 is the boot screen (`POWERON0`), 296 × 240 = the full screen [AP30]. Screen size and display path:
  [../hardware/display.md](../hardware/display.md).
* **The 16-byte trailer hash** looks like an MD5 but matches no tested byte range, and the firmware contains no MD5 code
  (no MD5 constants anywhere). Nothing checks it: images modified without touching it display fine [AP30, device-proven].
  Keep it unchanged.
* The firmware draws an image by index: it reads the 16-byte entry, then blits `w × h` pixels at `(x, y)` (or at an
  offset from it) [AP30]. Firmware side: [../firmware/display_and_input.md](../firmware/display_and_input.md).
* **Changing an image's size** works in the container (offsets are recomputed), but the code may assume sizes and
  positions, so keep dimensions [AP30 advice]. A changed image must keep its index.
* The 478 images are byte-identical between the factory firmware (5.0.0) and V1.7.8 [AP30].

## String and menu table (strtbl)

V1.7.8: blob size 0x1AF4A4 = 2 + 21 × 4 + 21 × 307 × 0x112 [AP30].

| Blob offset | Field | Content |
|---|---|---|
| 0x0000 | `u16 nlang` | 21 |
| 0x0002 | `u32 block_offset[nlang]` | each block = nrec × rec_size bytes, blocks back to back |
| 0x0056 | block 0 … block 20 | |

| Record field (rec_size bytes) | Meaning |
|---|---|
| `u16 id` | record number (0, 1, 2, …) |
| `u16 parent` | menu parent record |
| `u16 index_in_parent` | |
| `u16 first_child` | |
| `u16 prev, next` | linked-list neighbours |
| `u16 function_index` | menu leaf number, 0xFFFF for non-leaves (see below) |
| `u16 n_children` | |
| `u16 children[C]` | 0xFFFF = empty slot |
| `u16 text[…]` | UTF-16LE, NUL-terminated, zero-padded to the end of the record |
All [AP30].

**The layout changes between firmware versions** [AP30]:

| Image | records per language | rec_size | child slots C | text area |
|---|---|---|---|---|
| V1.7.8 (8.0.0) | 307 | 0x112 (274 B) | 29 | 200 B = 100 UTF-16 units, so at most 99 characters + NUL |
| factory 5.0.0 | 289 | 0x102 (258 B) | 21 | 200 B, same |

The record count is also stored in the code stage's configuration block (+0x4C), next to the language count (+0x50)
([stage3_sections.md](stage3_sections.md#the-default-configuration-block)) [AP30]. A tool should detect the record size
from the block offsets and the record ids rather than hard-code it; the boundary between child slots and text is found
from where the `0xFFFF` padding ends [AP30 method; exact intended split [?]].

**Content** [AP30]:
* The 8-word headers and child lists are **identical in all 21 languages**; only the text differs.
* Records 0-123: plain UI strings in a linked list (Music, Radio, …, "Update Firmware?", "SD card inserted").
* Records 124-306: the **Settings menu tree** (124 = Settings root → 125 Music → 126 Play Order → 127 Order /
  128 Shuffle, …).
* `function_index`: the 155 leaves of the Settings tree (records 124-306) carry 0..154 in table order, without gaps;
  every other record carries 0xFFFF. The SDK's menu tool calls this the "Function Index" [AP30 + EVK].
* The firmware looks strings up by record id and language block [AP30]. English is block 2.

**Language order** (blocks 0-20) [AP30]:

| Block | Language | Block | Language | Block | Language |
|---|---|---|---|---|---|
| 0 | Chinese (simplified) | 7 | German | 14 | Danish |
| 1 | Chinese (traditional) | 8 | Italian | 15 | Dutch |
| 2 | English | 9 | Portuguese | 16 | Greek |
| 3 | Korean | 10 | Russian | 17 | Czech |
| 4 | Japanese | 11 | Swedish | 18 | Turkish |
| 5 | Spanish | 12 | Thai | 19 | Hebrew |
| 6 | French | 13 | Polish | 20 | Arabic |

This is exactly the column order of the 21-language menu spreadsheets in Rockchip's wireless-audio SDK [EVK]; the MP3
SDK's sheet has 19 languages (no Spanish, no Italian) [EVK].

**Origin** [EVK]: the SDK builds this table from an Excel sheet (one column per language, levels marked with `#`) with
its "GenMeu" tool, which writes the menu resource and a header of record ids. The SDK's own menu resource has the same
layout (u16 language count, u32 block offsets, 8-word record header).

## Fonts

Two fonts, both **indexed directly by Unicode code point U+0000-U+FFFF**, one fixed-size cell per code point [AP30]:

| Blob | Cell | Bitmap | Metrics byte | Total size |
|---|---|---|---|---|
| font[0], 12 px | 32 bytes × 65,536 | 12 rows × u16, bytes 0-23; MSB = leftmost pixel | byte 24 = `0x80 \| advance` | 0x201C06 |
| font[1], 16 px | 33 bytes × 65,536 | 16 rows × u16, bytes 0-31; MSB = leftmost pixel | byte 32 = `0x80 \| advance` | 0x211C06 |

* Glyph address = `code_point × cell_size` from the blob start [AP30].
* The metrics byte is `0x80 + width in pixels`; `0x80` alone is a space [AP30; EVK GUI manual].
* Both blobs end with the same **0x1C06-byte table** of unknown purpose (u16 pairs, starting `3c7e e372 3cd9 e316 …`)
  [AP30].
* The firmware uses a 16-bit glyph index, so characters beyond the Basic Multilingual Plane cannot be shown [AP30].
* **Origin:** both are Rockchip SDK font files (same sizes, same trailing table) with some glyphs redrawn [AP30, byte
  comparison with a public SDK copy]:
  * font[0]: 672 glyphs changed: Latin-1 U+00A1-00FF, Latin Extended-B U+01A0-01FF, Latin Extended Additional
    U+1E00-1E9B and U+1EA0-1EF9 (Vietnamese), Greek Extended U+1F00-1FFE (assigned code points), and U+2740.
  * font[1]: 123 glyphs changed: Vietnamese letters only (accented Latin-1 letters such as U+00C0/00E0, U+0102/0103,
    0110/0111, 0128/0129, 0168/0169, 01A0/01A1, 01AF/01B0, and U+1EA0-1EF9), plus U+2740.
  * The 16 px Chinese characters match the public HZK16 bitmap font [AP30, comparison].
* Both fonts are byte-identical between 5.0.0 and V1.7.8 [AP30].

## GBK and code-page tables

**gbk[0]** (0x1CA34A bytes) = Rockchip's SDK `GBK.bin` (0x1C0000 bytes, byte-identical) followed by a **0xA34A-byte
pinyin table** [AP30, byte comparison].

* `GBK.bin` is 14 code pages × 128 KiB, addressed as "table base + code page × 128 KiB" by the SDK's conversion code
  [EVK]. The layout inside a page is not decoded [?].
* The appended pinyin table (it ends in pinyin initials, `.P.W.P.Y.M…`) is what the firmware reads to sort Chinese titles
  in the media library [AP30].

**Code-page sections 63-69** (inside the code stage, not loaded into RAM; read in place from the flash) [AP30]:

| Section | Content |
|---|---|
| 63 | single-byte code-page → Unicode table |
| 64, 65, 66 | Shift-JIS (code page 932) tables: single-byte, main, extension |
| 67 | Big5 (code page 950) |
| 68, 69 | Korean (code page 949), two parts |

They are used to turn non-Unicode file names and tags into Unicode for display [AP30]. Table format details are not
documented here [?]. Character handling in the UI: [../firmware/ui_and_settings.md](../firmware/ui_and_settings.md).

## What changes between versions

Between the factory firmware (5.0.0) and V1.7.8, **fonts, GBK and all 478 images are identical**; only the code stage
and the string table differ (307 vs 289 records, different record size) [AP30].

## Open questions

* What the 16-byte image trailer hash is computed over (if anything).
* The 0x1C06-byte table at the end of both fonts.
* The page layout of `GBK.bin` and the exact format of the code-page sections.
* Whether the `(x,y)` in image names is ever used by the firmware, or only the table entry.
* The intended split between child slots and text in string records (the size is detected, not documented).

## Sources

* [AP30] analysis of firmware V1.7.8 and factory firmware 5.0.0 (byte-identical unpack/repack of every blob); a
  modified boot image tested on a device.
* [EVK] Rockchip RKNanoD SDK guide V1.3 (resource and menu tools), RKNanoD GUI user manual V1.0 (font format), SDK
  resource files and menu spreadsheets (RKNanoD MP3 SDK V1.3 and wireless-audio SDK V1.5).
* Related: [../guides/modifying_resources.md](../guides/modifying_resources.md), [rknanofw_container.md](rknanofw_container.md).
