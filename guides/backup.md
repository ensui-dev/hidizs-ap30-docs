# Full flash backup (read-only)

Status: draft, 2026-11

Before writing anything to an AP30, make a complete copy of its internal flash. The procedure below only **reads**:
it puts the player into loader USB mode and copies the loader-visible flash (476 MiB, both firmware slots, settings,
library and the user volume) with Rockusb READ_LBA, then the hidden boot-loader area with READ_SECTOR. Both parts are
read twice and compared. On the device this took about 7 minutes for the main part and gave an exact copy: the
factory update file recovered from it was byte-identical to the official download.

## Contents
- [What you get](#what-you-get)
- [Before you start](#before-you-start)
- [Step 1: enter loader USB mode](#step-1-enter-loader-usb-mode)
- [Step 2: identify the device](#step-2-identify-the-device)
- [Step 3: read the loader LBA space](#step-3-read-the-loader-lba-space)
- [Step 4: read the hidden area](#step-4-read-the-hidden-area)
- [Step 5: verify](#step-5-verify)
- [Step 6: store it safely](#step-6-store-it-safely)
- [Using the backup](#using-the-backup)
- [Open questions](#open-questions)
- [Sources](#sources)

## What you get

| Part | Command | Range | Size | Content |
|---|---|---|---|---|
| main dump | READ_LBA (0x14) | loader LBA 0 .. 0xEDFFF (974,848 sectors) | 476 MiB | FW1, FW2, reserved partition (settings, favourites, library), user volume |
| hidden area | READ_SECTOR (0x04) | op 0x04 addresses 0 .. 0x1FFF (physical 64 .. 0x203F) | 4 MiB of data (+16 spare bytes per sector) | five boot-loader copies, device identity sector, leftovers; the last 64 addresses overlap FW1's first 64 sectors |

Not reachable over USB: physical sectors 0..63 [AP30]. Map of what is where:
[../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md).

## Before you start

* A Rockusb client that can read LBAs with **per-command timeouts**, at most **16 sectors per command**, and READ_SECTOR
  with **528-byte replies, one sector per command**, ideally resumable. rkdeveloptool's `rl` is not suitable on this
  loader: it uses infinite timeouts and hung once [AP30].
* Linux: disable USB autosuspend (`echo -1 | sudo tee /sys/module/usbcore/parameters/autosuspend`) before plugging in
  [AP30].
* ~500 MiB free disk space for each copy.
* Nothing in this guide writes to the player. The only state change is the boot marker left by the button entry (one
  extra loader-mode boot after the first reset), which is harmless [AP30].

> **Note:** this procedure is read-only and needs no recovery path. Do not add any write command to it. If your tool
> offers erase, write, "upgrade" or loader download, do not use them here. See the global rules in
> [README.md](README.md#global-safety-rules).

## Step 1: enter loader USB mode

Cable in, hold D-pad Right, add Power, release Power after the ~8 s reset, keep D-pad Right until a high-speed
`2207:262d` appears. Full description: [recovery.md](recovery.md#enter-loader-usb-mode-with-the-buttons).

## Step 2: identify the device

Read-only queries; record the answers [AP30 values]:

| Query | Expected on an AP30 |
|---|---|
| TEST_UNIT_READY | status 0 |
| READ_FLASH_ID | `EMMC` |
| READ_CHIP_INFO | `C262` … `USBC` |
| READ_FLASH_INFO | 983,040 sectors (480 MiB), block 512 KiB, page 8 KiB |
| READ_LBA 0, 1 sector | `RKnanoFW` at offset 0x1F8; first bytes = the installed firmware's date and version in BCD (V1.7.8: `26 20 19 10 08 00 00 00 00 00`) |
| READ_LBA 0xF000, 1 sector | the same header (FW2) after an official install |

If the sector count differs from 983,040, stop and adjust the ranges below to your device; do not guess.

## Step 3: read the loader LBA space

1. Read loader LBA **0 .. 0xEDFFF** (974,848 sectors = total − 0x2000 hidden sectors) in 16-sector (8 KiB) commands.
   Expect about **1.2 MiB/s**, i.e. 6-7 minutes [AP30: 1.18 MiB/s].
2. Larger reads are not faster in practice and 128-sector reads **wedged the loader** (no data, then no more commands);
   recover from that with the ~8 s Power long press and a new button entry [AP30].
3. A good client retries a garbled transfer once after draining the endpoint, and can resume from the last good chunk.

## Step 4: read the hidden area

1. Read op 0x04 addresses **0 .. 0x1FFF**, one sector per command, 528 bytes per reply [AP30].
2. Each reply = 512 data bytes + 16 spare bytes. On the AP30 the spare bytes are the same constant on every sector
   (filler); keep them in a separate file if your client separates them [AP30].
3. Sanity checks [AP30]:
   * address 0 is not readable text: it is the RC4-scrambled IDB header. Descrambled with Rockchip's standard IDB RC4 key
     (fresh keystream per sector) it begins `55 AA F0 0F` (see
     [../firmware/boot_loader.md](../firmware/boot_loader.md#scrambling)).
   * addresses 0x400, 0x800, 0xC00, 0x1000 start identical copies of addresses 0..0x3F.
   * addresses **0x1FC0 .. 0x1FFF equal loader LBA 0 .. 0x3F** of the main dump. This ties the two dumps together.

## Step 5: verify

1. **Read everything twice** and compare the two copies (`cmp`, or compare SHA-256). On the device, three hidden-area
   dumps were identical [AP30].
2. **Compare the firmware slots with the official file** for the version installed. The updater writes the first
   0x1C00000 bytes (for V1.7.8) of the update file into each slot [AP30]:
   * FW1 = loader LBA 0 .. 0xDFFF, FW2 = loader LBA 0xF000 .. 0x1CFFF.
   * For V1.7.8, both slot ranges hash to `1c5db427…dc4912473`, the SHA-256 of the first 0x1C00000 bytes of the
     official `HIFIYF18.IMG` [AP30].
   * The header date/version tells you which official file to compare with
     ([../overview/firmware_releases.md](../overview/firmware_releases.md)).
3. **Check the user volume**: loader LBA 0x82000 holds an MBR, and the FAT32 boot sector follows 64 sectors later. A
   loop-mounted copy of that range should show your files [AP30].
4. Optional end-to-end check: deleted update files often survive on the user volume. On the device examined, the
   factory update file `HIFIYF05.IMG` was found as a deleted directory entry with its data intact; extracted from the
   dump it was byte-identical to Hidizs' official download (SHA-256 `d69ca501…c9cfc3`), which proves the read path exact
   [AP30].

## Step 6: store it safely

* Keep the dump and its hashes on at least one other machine or medium.
* **A backup is personal data.** It contains your files, your settings and library, and the IDB identity sector (serial
  number / UID / Bluetooth and Wi-Fi MAC fields, if the factory filled them). Do not publish it or share it; share only
  hashes or the official parts.
* Leave loader mode afterwards: DEVICE_RESET twice, or Power ~8 s ([recovery.md](recovery.md#leave-loader-usb-mode)).

## Using the backup

* **Restore a slot:** write the FW1 range back to loader LBA 0 ([recovery.md](recovery.md#restore-fw1)).
* **Extract an installable image:** the FW1 range up to `header.size + 0x200` is the image; pad to the updater length and
  append the RKCRC32 to get a file the stock updater accepts
  ([../formats/rknanofw_container.md](../formats/rknanofw_container.md#building-a-valid-image)).
* **Restore settings or the library** is possible in principle (part 1 is ordinary sectors) but has not been tested;
  the firmware rebuilds the library by itself [?].
* **Never restore the hidden area.** Even with a perfect dump, writing physical 0..0x1FFF is the one action that can
  make the player unrecoverable. The dump is for analysis and for a last-resort repair that has not been designed.

## Open questions

* Physical sectors 0..63 cannot be read; their content is unknown.
* Whether a mask-ROM rebuild of the IDB from a dump is possible (not designed, not tested).

## Sources

* [AP30] measured on a device (full read at 16 sectors per command, three hidden-area dumps, slot hashes, recovery of
  the factory file from the user volume).
* [WEB] rkdeveloptool, <https://github.com/rockchip-linux/rkdeveloptool>; IDB RC4 key in Rockchip u-boot
  `tools/rockchip/rkcommon.c`, <https://github.com/rockchip-linux/u-boot>.
* Related: [recovery.md](recovery.md), [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md).
