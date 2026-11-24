# hidizs-ap30-docs

Unofficial, open documentation of the **Hidizs AP30**: hardware, firmware, formats, recovery.

Everything known about the **Hidizs AP30 "Music Boy"** digital audio player: its hardware, the chips on its board,
the vendor ("HidizsOS") firmware, its file formats, its boot and recovery paths, its bugs, and related devices and
projects. It is the result of independent analysis of the official firmware images and of the device itself,
cross-checked against public datasheets, the SoC technical reference manual and community research.

This collection is **self-contained**: every link points either to another page in this collection or to a public
web source. Nothing here depends on files outside it.

> **Status:** first edition, being written (2026-11). Pages marked *draft* may still change.

## How to navigate

| If you want to… | Start here |
|---|---|
| know what the AP30 is and which versions exist | [overview/device.md](overview/device.md), [overview/firmware_releases.md](overview/firmware_releases.md) |
| understand the hardware | [hardware/README.md](hardware/README.md) |
| understand how the stock firmware works | [firmware/README.md](firmware/README.md) |
| read or build the firmware image format | [formats/README.md](formats/README.md) |
| recover a player that won't boot, back it up, or install firmware | [guides/README.md](guides/README.md) |
| see the known firmware bugs and what users complain about | [firmware/known_bugs.md](firmware/known_bugs.md), [community/user_feedback.md](community/user_feedback.md) |
| compare with the Snowsky Echo Mini and other projects on the same chip | [related/README.md](related/README.md) |
| look up a term or a source | [overview/glossary.md](overview/glossary.md), [overview/sources.md](overview/sources.md) |

## Layout

```
README.md                    this page
overview/
  device.md                  the product: specs, SKUs, board photos summary, chip list, timeline
  firmware_releases.md       every known firmware file: dates, versions, hashes, changes between releases
  glossary.md                terms and abbreviations
  sources.md                 every external source (datasheets, TRM, community projects, reviews), with links
  conventions.md             tags, number formats, register notation, how pages are structured
hardware/
  README.md                  block diagram and index
  soc_rknanod.md             Rockchip RKNanoD: cores, memory map, buses, clocks, interrupts, peripherals overview
  soc_peripherals.md         per-peripheral register-level notes (CRU, GRF, PMU, timers, WDT, GPIO, ADC, PWM, DMA, I2C, I2S, UART, SD/MMC, VOP, USB, mailbox)
  dual_core.md               the two Cortex-M3 cores, core-B start/stop, mailbox, shared RAM, accelerators
  board_ap30.md              the AP30 board: pin assignment table, power tree, battery, test pads, chip markings
  photos.md                  teardown photos: annotated board overviews and a close-up of every part
  audio_dac_cs43198.md       Cirrus Logic CS43198: interface, init, registers, filters, gain, volume
  audio_amp_rt6863.md        Richtek RT6863 and the output stage, headphone jacks
  display.md                 panel, controller, init sequence, VOP interface, backlight
  input.md                   key ladder, volume wheel, power key, timing
  storage.md                 internal SD-NAND, microSD slot, flash layout
  usb.md                     USB-C: RKNanoD OTG, the Realtek USB-audio chip, mode switching, charging
  bluetooth.md               JieLi Bluetooth chip and its UART protocol
  rtc.md                     real-time clock
  power.md                   power key hardware, power hold, battery measurement, charging, long-press reset
firmware/
  README.md                  architecture overview and index
  architecture.md            SDK lineage, sections and overlays, tasks/windows/messages, memory use
  boot_loader.md             the boot loader in the IDB area: boot flow, markers, button check, FW1/FW2 choice, loader USB mode
  startup.md                 from reset to the main menu
  audio_playback.md          player flow, decoder selection, track change, gapless behaviour, EQ, fade, DSD
  core_b_codecs.md           the core-B runtime, the mailbox protocol, each codec module
  storage_and_filesystems.md drivers, FAT/exFAT, the media library database and its limits, favourites, bookmarks
  ui_and_settings.md         windows, menus, the settings tree, the configuration block, languages
  display_and_input.md       screen driver, screen-off modes, key handling
  power_management.md        power-off, battery, backlight, watchdog, clock policy
  usb_modes.md               mass storage, vendor SCSI commands, USB DAC hand-over
  bluetooth.md               Bluetooth control from the firmware side
  update_process.md          how HIFIYFnn.IMG updates work, checks, FW1/FW2 writes
  games.md                   the built-in games, including hidden ones
  third_party_components.md  libraries and code the firmware contains, and their licences
  known_bugs.md              firmware bugs found by analysis, with impact and workarounds
formats/
  README.md                  index
  rknanofw_container.md      the update image: header, blobs, header copy, padding, CRC
  stage3_sections.md         the code/data section table and overlays
  resources.md               images, fonts, string tables, code-page tables
  idb_and_flash_layout.md    the on-flash layout: IDB area, FW1/FW2, partitions
guides/
  README.md                  index + safety rules
  recovery.md                loader USB mode, button and software entry, restoring firmware
  backup.md                  full read-only flash backup
  installing_firmware.md     official update, downgrade, custom images
  modifying_resources.md     changing images/strings safely
related/
  README.md                  index
  snowsky_echo_mini.md       the sister device on the same SoC and code base; its firmware history
  rockchip_rknano_family.md  RKNanoC vs RKNanoD, the RKnano SDK, other players on the chip
  community_projects.md      other projects on the AP30 / Echo Mini, what each found
community/
  user_feedback.md           what owners report: pain points and wishes, counted per source
images/                      teardown photos used by the pages (board/, parts/, other/)
```

## Rules for this collection

1. **Self-contained.** Link only to pages in this collection or to public URLs. Never refer to files, scripts or
   folders outside it.
2. **One topic per page, one home per fact.** A fact is written in full in one place; other pages link to it.
   Every page starts with a one-paragraph summary and a "Contents" list when longer than a screen.
3. **Provenance on every claim:**
   * **[AP30]** confirmed in the AP30 firmware (V1.7.8 unless another version is named) or on the device;
   * **[TRM]** RKNanoD technical reference manual V1.0; **[DS]** a chip datasheet (named);
   * **[EM]** from the Snowsky Echo Mini, not yet checked on the AP30;
   * **[EVK]** Rockchip reference-board / SDK documentation (schematics, guides), not checked on the AP30;
   * **[WEB]** a public web source (linked); **[?]** a guess or an unconfirmed reading.
   Measured values say how they were measured.
4. **Own words only.** Describe behaviour, interfaces, registers, sequences and data layouts in prose and tables.
   No decompiled or disassembled vendor code, no copied SDK source, no vendor images, fonts or text dumps.
   Register/command sequences may be given as data tables.
5. **No personal data.** No owner names, e-mail addresses, serial numbers of a specific unit, personal photos, or
   contents of anyone's backup. Community sources are cited by public URL and public handle only.
6. **Safety first.** Any procedure that writes to the device carries a warning box, the recovery path, and what
   must never be written.
7. **Scope.** The AP30 and everything connected to it. Work on new open-source firmware is documented elsewhere.

## Licence

The documentation is open so that information about this device stays freely accessible and credited.

* **Text, diagrams and page structure:** [CC BY 4.0](LICENSES/CC-BY-4.0.txt). Reuse, translate, adapt and share,
  including commercially, as long as you credit "hidizs-ap30-docs, the hidizs-ap30-docs contributors", link the source and say if you changed it.
* **Data tables and code snippets** (register, pin, command, format and measurement tables, example code):
  [CC0 1.0](LICENSES/CC0-1.0.txt), so they can go straight into any code under any licence.
* Facts themselves are not copyrightable. Product names belong to their owners; this project is not affiliated with
  Hidizs or any chip vendor. See [LICENSE](LICENSE).

