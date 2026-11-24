# File and flash formats

Status: draft, 2026-11

This section describes, byte by byte, the formats used by the AP30's firmware: the update image (`HIFIYFnn.IMG`,
an "RKnanoFW" container), the code-section table inside it, the resource blobs (images, strings, fonts, character
tables) and the layout of the internal flash. Everything here was checked by unpacking and repacking official images
**byte-identically**: V1.7.8 (`HIFIYF18.IMG`) and the factory "11-Game" firmware (`HIFIYF05.IMG`) [AP30]. Numbers are
little-endian unless a page says otherwise.

## Pages

| Page | What it covers |
|---|---|
| [rknanofw_container.md](rknanofw_container.md) | the update image: 512-byte header, blob directory, padding, the header copy the loader checks, the updater's length rule, RKCRC32, a worked example with the V1.7.8 numbers |
| [stage3_sections.md](stage3_sections.md) | the code stage: base, section count, the 8-word section records, VA → file offset, the resident section 0, overlay windows, core-B modules at 0x01000000, the default-configuration block |
| [resources.md](resources.md) | images (`ROCK26IMAGERES`, RGB565 big-endian, BMP-name records, trailer), the string/menu table (21 languages × 307 records), the two bitmap fonts, the GBK / code-page tables |
| [idb_and_flash_layout.md](idb_and_flash_layout.md) | the measured map of the internal flash: hidden IDB area, FW1 and FW2 slots, the 200 MiB reserved partition, the user FAT32 volume, the three sector-numbering schemes |

## The image at a glance

```
HIFIYF18.IMG (29,360,132 bytes)
┌──────────┬─────────┬───────┬───────┬──────┬────────┬──────────┬──────┬────────┬──────┬───────┐
│ header   │ stage3  │ font0 │ font1 │ gbk0 │ strtbl │ imageres │ pad  │ header │ pad  │ CRC32 │
│ 0x200    │ code    │ 12 px │ 16 px │      │        │          │ →8K  │ copy   │ →1M  │ 4 B   │
└──────────┴─────────┴───────┴───────┴──────┴────────┴──────────┴──────┴────────┴──────┴───────┘
 0x0000000                                                         0x1b90000          0x1c00000
                                                                   = header.size      = written length
```

## Key facts

* **No signature, no encryption** in the update image [AP30]. The loader and the updater check only the `RKnanoFW`
  magic and that a copy of the header sits at `header.size` [AP30].
* The trailing **RKCRC32 is checked by nobody** on the device (neither loader nor updater) [AP30]; keep it correct
  anyway, other tools may check it.
* The images, fonts and GBK table are identical between the factory firmware and V1.7.8; only the code stage and the
  string table differ [AP30].
* The resource blobs come from Rockchip's RKNanoD SDK tool chain (fonts and GBK table are the SDK's files with some
  glyphs redrawn; the string table has the SDK's menu-resource layout) [AP30, byte comparison with a public SDK copy].
* The format is shared with the Snowsky Echo Mini, which runs the same code base [AP30; EM].

## Tools (generic)

* Rockbox's `utils/rknanoutils` (`rkboottool`, GPL) parses the RKnanoFW container,
  <https://github.com/Rockbox/rockbox>. Its ELF export places segments at the **file** VAs, not the run addresses, so it
  is not suitable for code analysis [AP30].
* Community editors for the same format on the Echo Mini: flame-ocean-website (browser editor for fonts, images,
  themes), <https://github.com/losses/flame-ocean-website>; Echo-Mini-Customizer, <https://github.com/BlackVllad/Echo-Mini-Customizer>.
  An AP30 pack/unpack script ships with <https://github.com/nkahoang/hidizs-ap30-game-emu>. Compatibility of the Echo
  Mini tools with AP30 images not checked [?].
* How to change resources safely: [../guides/modifying_resources.md](../guides/modifying_resources.md).

## Sources

* [AP30] analysis of firmware V1.7.8 and of the factory firmware 5.0.0 (byte-identical round trip); measured on a
  device (flash dump).
* [EVK] Rockchip RKNanoD SDK guide V1.3 and tools (origin of the format).
* [WEB] Rockbox [`rknanoutils`](https://github.com/Rockbox/rockbox/tree/master/utils/rknanoutils); community projects linked above.
