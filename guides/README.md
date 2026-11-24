# Guides

Status: draft, 2026-11

Step-by-step procedures for AP30 owners and tinkerers: getting into the boot loader's USB mode, backing up the internal
flash, installing official or custom firmware, changing images and strings, and recovering a player that will not
boot. Every procedure here has been done on a real AP30 unless it says otherwise. Read the safety rules below before
any procedure that writes to the device.

## Pages

| Guide | Writes to the device? | What it is for |
|---|---|---|
| [recovery.md](recovery.md) | yes (FW1 slot) | enter loader USB mode with buttons or software, restore a working firmware with Rockusb write-LBA, the proven hang-and-recover test |
| [backup.md](backup.md) | **no** (read-only) | a complete, verified copy of the internal flash, including the hidden boot-loader area |
| [installing_firmware.md](installing_firmware.md) | yes (through the stock updater) | the official copy-a-file update, downgrades, installing a custom image |
| [modifying_resources.md](modifying_resources.md) | only when you install the result | changing images and strings in an update image and repacking it correctly |

Suggested order for anyone who wants to experiment: read [recovery.md](recovery.md) → do [backup.md](backup.md) →
try [modifying_resources.md](modifying_resources.md) with a small change → install it with
[installing_firmware.md](installing_firmware.md).

## Global safety rules

> **Warning: read before writing anything to an AP30**
>
> 1. **Never write physical sectors 0x0000-0x1FFF** of the internal flash (the hidden IDB area). It holds the boot
>    loader and its copies. As long as it is intact, the player can always be recovered through loader USB mode. If it
>    is destroyed, only untested mask-ROM methods remain. Normal Rockusb LBA commands start at physical 0x2000 and
>    cannot reach it; do not use tools or options that address it.
> 2. **Never run `rkdeveloptool ef`** (erase flash), and **never download or upgrade a loader** (`rkdeveloptool db`,
>    `ul`, or the equivalent buttons of Windows tools such as RKDevTool). Loader blobs for other Rockchip chips do not
>    fit this SoC, and an upgrade writes the IDB area. You do not need a loader download: the AP30's own loader already
>    speaks Rockusb.
> 3. **Make a full backup first** ([backup.md](backup.md)) and keep a copy on another machine.
> 4. **Know the way back before you write:** practise entering loader USB mode (D-pad Right + Power with the USB cable
>    in) on a working player ([recovery.md](recovery.md)). Keep the USB cable connected during any test of a custom
>    image: the button recovery needs USB power.
> 5. Write firmware only to **FW1 (loader LBA 0)** or **FW2 (loader LBA 0xF000)**, with a client that reads every chunk
>    back and compares it.
> 6. Charge the battery first (≥ 60 % is a sensible minimum), use a direct USB port rather than a hub, and do not unplug
>    during a write.
> 7. Do not use Rockusb DEVICE_RESET sub-codes other than 0 (sub-code 3 resets into mask ROM) and do not send the
>    "reboot to mask ROM" vendor command: mask-ROM mode needs a loader download, which rule 2 forbids.

## What can go wrong, and what each case costs

| Failure | Fixed by an official update file? | Fixed through loader USB mode? |
|---|---|---|
| A custom image boots, but images or strings look wrong | yes | yes |
| A custom firmware boots but has no updater | no | yes, button entry |
| A custom firmware crashes or hangs at every boot | no | **yes, button entry with USB connected: proven on a device** |
| The hidden IDB area is overwritten | no | **no**: mask ROM only (needs a matching loader blob or board-level work; untested on the AP30) |

All [AP30]. Why the loader is safe from updates: [../firmware/boot_loader.md](../firmware/boot_loader.md).

## Tools mentioned in the guides

| Tool | What it is | Notes |
|---|---|---|
| rkdeveloptool | Rockchip's open-source Rockusb command-line tool, <https://github.com/rockchip-linux/rkdeveloptool> | `ld` (list), `rci`, `rfi` work on the AP30 loader (root needed for most commands). Its `rl` hung once on this loader (it uses infinite USB timeouts). Writes with it were not tested on the AP30 [?] |
| a Rockusb client with read/write LBA and timeouts | any small program that sends Rockusb CBWs over libusb (e.g. a Python script using pyusb) | what was used for the backup and restore on the device; needs: per-command timeouts, at most 16 sectors per read, read-back after each write chunk, 528-byte replies for READ_SECTOR |
| a SCSI pass-through tool | e.g. `sg_raw` from sg3_utils on Linux | to send the vendor command that reboots the stock firmware into loader mode (untested path) |
| RKDevTool (Windows) | Rockchip's Windows GUI; contains an RKNano device class and knows PID 262D | not tested on the AP30; never use its erase, "upgrade firmware" or loader-download functions |
| Rockbox `rknanoutils` (`rkboottool`) | parses the RKnanoFW container, <https://github.com/Rockbox/rockbox> | for reading image files on a PC |

Background on Rockusb: <https://opensource.rock-chips.com/wiki_Rockusb>.

## Sources

* [AP30] procedures done on a device (loader entry, full backup, slot rewrites, hang-and-recover test, official and
  custom installs, downgrade).
* [WEB] rkdeveloptool, Rockusb wiki, Rockbox.
