# Firmware update process

Status: draft, 2026-11

How the stock firmware installs an update file. At every boot it looks on the internal user volume for
`ECHOMINI.IMG` or any `HIFIYF00.IMG` … `HIFIYF89.IMG`. If one is there, it checks only the container's magic and that
the header copy matches the header (**no CRC check, no version check, no date check**), writes the image into the
second firmware slot (FW2) with the header written last, copies FW2 over FW1 the same way, deletes the file and
reboots through the watchdog. Downgrades and custom images install exactly like official ones. A date-based "newest
copy wins" routine exists in the image, but nothing calls it in V1.7.8. The image format itself is on
[formats/rknanofw_container.md](../formats/rknanofw_container.md); step-by-step instructions are on
[guides/installing_firmware.md](../guides/installing_firmware.md).

## Contents

- [Summary](#summary)
- [1. Boot scan and accepted names](#1-boot-scan-and-accepted-names)
- [2. What the user sees](#2-what-the-user-sees)
- [3. Checks](#3-checks)
- [4. Writing: FW2 first, header last, then FW1](#4-writing-fw2-first-header-last-then-fw1)
- [5. The unused date check and sync](#5-the-unused-date-check-and-sync)
- [6. Consequences](#6-consequences)
- [7. Related paths](#7-related-paths)
- [Bugs in this area](#bugs-in-this-area)
- [Open questions](#open-questions)
- [Sources](#sources)

## Summary

```
boot ── overlay 1: mount the user volume (format on failure)
          ├─ ECHOMINI.IMG present?            → file number 0xF5, message 0x192
          └─ else HIFIYF00 … HIFIYF89.IMG     → file number nn (last one found wins), message 0x192
main menu (overlay 21) sees message 0x192
          ├─ pass 1: draw the "updating" screen, mark the library dirty, re-queue 0x192
          └─ pass 2: load overlay 8 → updater
updater (overlay 8)
          ├─ open the file, check magic "RKnanoFW" + header == header copy   (no CRC, no version)
          ├─ FW2 slot: invalidate first 8 KiB → write the rest → write the first 8 KiB (header) last
          │            every block read back and compared
          ├─ copy FW2 → FW1 the same way (FW1 header invalidated first, written last)
          └─ delete the file → save settings → watchdog reboot
next boot ── FW1 == FW2 == new image
```

All of it [AP30], traced in V1.7.8 and confirmed on a device (official install of V1.7.8 over the factory 5.0.0, a
custom image installed and booted, and a downgrade back to the official image).

## 1. Boot scan and accepted names

[AP30]

* Runs once per boot, early, in overlay 1 (main initialisation), after the internal user volume is mounted. If the
  volume cannot be mounted it is formatted first.
* **Order of the scan**: `ECHOMINI.IMG` first. If it exists, the file number is set to 0xF5 and the scan stops.
  Otherwise the firmware tries `HIFIYF00.IMG` to `HIFIYF89.IMG` in order and keeps the **last one it finds**. The
  file number goes to configuration block +0x2df (the previous one is kept at +0x2de).
* **No version or date check**: any of these names starts an update, newer or older.
* `ECHOMINI.IMG` is a name from the **Snowsky Echo Mini** updater: the AP30 firmware is built from the same code base
  ([related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md)) [AP30 + EM].
* Official file names so far: `HIFIYF26.IMG` (0.0.0, 2026-07-23), `HIFIYF05.IMG` (5.0.0, the "11-Game" firmware and
  the factory image), `HIFIYF18.IMG` (V1.7.8, 8.0.0, 29 games) [AP30 + WEB]. See
  [overview/firmware_releases.md](../overview/firmware_releases.md).
* The scan looks at the internal user volume, which is what Hidizs' instructions say ("copy to internal storage root,
  eject, reboot") [WEB]. One reviewer reported that the update only worked after formatting the microSD card on the
  device and copying the file again [WEB]; the code reading does not explain that, and which volume the scan opens if
  the internal one fails to mount is not checked [?].

## 2. What the user sees

[AP30 unless tagged]

1. Boot logo, then (instead of the main menu) a full-screen "updating" image: one image for Chinese, another for the
   other languages. The string table also has "Upgrading firmware…" and "Restoring firmware…" texts.
2. The write of two 28 MiB slots, each block read back; no progress percentage is computed by the updater [?: progress
   display not traced].
3. The file disappears from the user volume.
4. The player reboots (by the watchdog), shows the boot logo, and because the library was marked dirty it rebuilds
   the media library ("Updating Library…") before the main menu.
5. Settings → About shows the new image's header date (month-day) under the software version [AP30, device-verified
   with a custom image dated 2026-11-17]. The version text itself is hard-coded in V1.7.8 (see
   [known_bugs.md](known_bugs.md)).
6. The USB vendor "info" command reports the new header version (5.0.0 → 8.0.0 after the official V1.7.8 install)
   [AP30, device-verified].

## 3. Checks

[AP30]

| Check | Done? |
|---|---|
| magic `RKnanoFW` in the header (offset 0x1f8) | yes |
| header (0x200 bytes) == the header copy at `header.size` | yes |
| CRC-32 at the end of the file | **no** (the file carries one, nothing checks it) |
| firmware version or header date vs the installed one | **no** |
| model / vendor field | no |
| file name number vs anything | no |

The length written is `(header.size + 0x104000) & ~0xFFFFF`, i.e. the image plus the header copy rounded up to the
next MiB with margin; for V1.7.8 that is 0x1c00000 = 28 MiB [AP30].

The boot loader applies the same two checks (magic + header copy) when it boots a slot; it does not check the CRC
either ([boot_loader.md](boot_loader.md)) [AP30].

## 4. Writing: FW2 first, header last, then FW1

```
flash (loader LBA)          step 1                  step 2                   step 3
0x00000  FW1  [hdr|data]    old                     old                      [FFFF…|data…] → [hdr|new]
0x0f000  FW2  [hdr|data]    [FFFF…|old] → [FFFF…|new] → [hdr|new]            [hdr|new]
                            invalidate header,      write header last        copy FW2 → FW1 the same way
                            write data
```

[AP30]

* The firmware area of the internal storage is **write-locked** in the storage driver; the updater sets a software
  key ("NAND", 0x444e414e) around its writes and clears it afterwards.
* FW2's position comes from the boot-loader area (system-zone size / 2; 0xf000 on the unit examined) and is not
  re-derived by the updater.
* **FW2**: the first 8 KiB (containing the header) are first set to 0xFF, then the data after them are written, and
  the first 8 KiB last. Every block is read back in 16-sector chunks and compared.
* **FW1**: the FW2 contents are copied over FW1 the same way: FW1's first block invalidated first, the rest copied,
  the header block last.
* The update file is deleted, the settings saved (clean marker cleared), the "success, reboot" message logged
  (debug output is compiled out), then the watchdog timeout is set to its minimum and the CPU spins: the watchdog
  reboots the player.
* A power cut during the update leaves at most one slot without a valid header: while FW2 is written, FW1 is the old
  valid image; while FW1 is written, FW2 is the new valid image. The boot loader boots FW1 and falls back to FW2 only
  when FW1 fails its check ([boot_loader.md](boot_loader.md)).

## 5. The unused date check and sync

Two routines in V1.7.8 are **never called** (no direct branch, no stored pointer, their trigger message is never
sent) [AP30]:

* **Date check** (overlay 1): would validate both slots, search FW2 from the end of FW1 in 1 MiB steps (stopping at
  the first magic), and prefer the copy with the **newer header date**, reading every overlay from that copy. On the
  unit examined it would have hit a stale old header left between the slots (at loader LBA 0xe000) and treated FW2 as
  invalid: harmless only because nothing calls it.
* **Sync** (overlay 8): copy the newer slot over the older one, then delete the update file. Only reachable through
  message 0x191, which is checked in three places but never sent.

So in V1.7.8 the header date decides nothing: the running firmware always reads its overlays, images, fonts and
strings from FW1 [AP30]. Custom images can keep a newer date anyway; it is harmless, and the check could be active in
other builds of the code base (for example Echo Mini firmware) [?].

## 6. Consequences

* **Downgrade works**: copy an older official image (for example `HIFIYF05.IMG` or `HIFIYF18.IMG`) and reboot; both
  slots are overwritten [AP30, device-verified: a custom image dated 2026-11-17 was replaced by the official V1.7.8
  image dated 2026-10-19].
* **Custom images install like official ones**: any valid container (magic + matching header copy) named
  `ECHOMINI.IMG` or `HIFIYFnn.IMG` is installed [AP30, device-verified with a colour-inverted boot screen].
* **No fallback copy survives an install**: the updater itself writes the same image into both slots. If an installed
  image crashes at boot every time, the loader keeps booting it, and the way back is the boot loader's USB mode
  (D-pad Right + Power with the cable in) and a write of a known-good image: [guides/recovery.md](../guides/recovery.md).
* The FW2 fallback of the boot loader cannot rescue a damaged FW1 in V1.7.8 anyway: even when the loader boots FW2,
  the running firmware reads everything after the first three sections from FW1 [AP30 + loader code].

> **Warning:** an update writes both firmware slots. Before installing an image you built or modified, make sure the
> boot loader USB mode works on your player (D-pad Right + Power with USB connected → `2207:262d`) and keep a known-good
> official image. Never write outside the FW1 / FW2 slots, never write the IDB area (physical sectors 0..0x1FFF),
> never run `rkdeveloptool ef`, and never download random loaders. Recovery path:
> [guides/recovery.md](../guides/recovery.md); safe image building: [guides/modifying_resources.md](../guides/modifying_resources.md).

## 7. Related paths

* **`FWUP` tag** in the boot area: makes the next boot load factory defaults (and possibly format the user disk);
  see [ui_and_settings.md](ui_and_settings.md#where-and-when-it-is-stored).
* **Firmware recovery display**: a message for a "firmware recovery" screen exists; from the main menu its call lands
  in the middle of unrelated code because two overlays share the window (see [known_bugs.md](known_bugs.md)) [AP30].
* **MaskROM / loader reboot** from a PC: [usb_modes.md](usb_modes.md#rockchip-vendor-commands).
* **Writing the slots from a PC** in loader USB mode: [guides/installing_firmware.md](../guides/installing_firmware.md).

## Bugs in this area

* The firmware-recovery display call from the main menu jumps into unrelated code [AP30].
* The unused date check would mis-handle a stale header between the slots [AP30].
* Debug traces left in the library rebuild that follows an update (output disabled) [AP30].

Details: [known_bugs.md](known_bugs.md#boot-system-and-update).

## Open questions

* Which volume the boot scan opens when the internal volume cannot be mounted, and whether a microSD copy is ever
  considered.
* Whether a progress display is drawn during the write.
* Whether the date check is called in other builds (0.0.0, 5.0.0, Echo Mini releases).

## Sources

* [AP30] analysis of firmware V1.7.8: overlay 1 (boot scan, date check), overlay 8 (updater), overlay 21 (main menu
  update flow), section 0 (storage write lock); device tests (official V1.7.8 install, custom image install, downgrade,
  slot headers read in loader USB mode).
* [WEB] [Hidizs Download Center](https://www.hidizs.net/pages/download-center) and its update instructions;
  [QuietlyAmused, mobileaudiophile](https://mobileaudiophile.com/daps/hidizs-ap30-musicboy-review-you-win-little-you-lose-some-more/)
  (update via SD card report).
* [EM] Snowsky Echo Mini updater file names.
