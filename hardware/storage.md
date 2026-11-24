# Storage: internal SD-NAND and microSD

Status: draft, 2026-11

The RKNanoD has two copies of the same DesignWare-style SD/MMC host controller: **SDMMC** (4-bit pins), wired to the
**microSD slot**, and **EMMC** (8-bit capable pins), wired to the **internal storage**. On the AP30 the internal
storage is not a BGA eMMC but an 8-pad LGA chip marked `TM3F4GUAI`, almost certainly an **SD-NAND** (SD protocol in
a solderable package, ~480 MiB usable); an empty eMMC BGA footprint sits next to it. The stock driver auto-detects SD
vs MMC, so it works with either. Data moves by CPU (interrupt-driven PIO), not DMA. The internal flash holds the
boot loader, two firmware slots, a reserved partition and the user's FAT32 volume. This page covers the hardware;
the byte-level flash layout is owned by
[../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md).

Tags: **[AP30]** firmware V1.7.8 or the device · **[TRM]** RKNanoD TRM V1.0 · **[DS]** a datasheet · **[EM]** Echo
Mini · **[WEB]** public source · **[?]** guess or estimate.

## Contents

- [Summary](#summary)
- [The two host controllers](#the-two-host-controllers)
- [Internal storage: SD-NAND on the EMMC controller](#internal-storage-sd-nand-on-the-emmc-controller)
- [microSD slot](#microsd-slot)
- [Bus widths, clocks, PIO vs DMA](#bus-widths-clocks-pio-vs-dma)
- [Throughput](#throughput)
- [Flash map summary](#flash-map-summary)
- [Open questions](#open-questions)
- [Sources](#sources)

## Summary

| Item | Internal storage | microSD |
|---|---|---|
| Controller | EMMC, base `0x60030000`, IRQ 3 (vector 0x13) | SDMMC, base `0x60020000`, IRQ 4 (vector 0x14) |
| Chip / medium | `TM3F4GUAI`, 8-pad LGA, SD-NAND [?] | microSD slot on board side B |
| Protocol in use | SD (auto-detected; MMC path present) [AP30, ?] | SD 2.0: SDSC / SDHC / SDXC by protocol |
| Bus width | 4-bit [?] (pins for 8 muxed) | 4-bit |
| Clock | up to 50 MHz High Speed | up to 50 MHz High Speed |
| Capacity | 983 040 sectors = 480 MiB | vendor: up to 256 GB; 512 GB reported working [WEB] |
| Detect | — | GPIO0_11, active low, polled |
| Data transfer | interrupt-driven PIO | same |
| DMA request (unused) | DMAC1 request 13 | DMAC1 request 12 |

## The two host controllers

[TRM ch. 10, 11; AP30]

| Item | SDMMC | EMMC |
|---|---|---|
| Base | `0x60020000` | `0x60030000` |
| IRQ (NVIC) | 4, `sdmmc_int` | 3, `emmc_int` |
| DMAC1 hardware request | 12 | 13 |
| Protocols | SD 2.0, SDIO 2.0, MMC 4.41; 1/4-bit; no SPI mode | same IP; MMC 4.41 1/4/8-bit |
| Pins (LFBGA121 ball) | GPIO1_5 CMD (E4), GPIO1_6 CLK (F4), GPIO1_7 D0 (G3), GPIO1_8 D1 (F2), GPIO1_9 D2 (F3), GPIO1_10 D3 (G2) | GPIO0_0 PWREN (H10), GPIO0_1 CLK (G11), GPIO0_2 CMD (G10), GPIO0_3..7 D0..D4 (F10, F11, D9, E10, C10), GPIO0_8..10 D5..D7 (D10, D11, E11), GPIO1_11 RSTN (H11) |
| Shared pin functions | SPI1A, UART3/4/5, I2C1B | I2S1B (D0 / D1 / CLK / CMD), SFC (D2..D7), JTAG1 (D5..D7), UART2C |
| FIFO | 32 words (implied by the stock watermark setting) | same |
| Card-detect input | the controller's own detect pin and debounce exist but are not routed; the AP30 uses a GPIO | n/a |

- **No UHS-I:** the TRM lists SD 2.0 only, no 1.8 V signalling, no tuning. The fastest SD mode is High Speed,
  50 MHz, 4-bit = 25 MB/s on the bus [TRM ch. 10.2].
- **Clock source:** CRU register `CLKSEL7` (offset 0x30): SDMMC divider bits 4:0 and source bit 7, EMMC divider bits
  12:8 and source bit 15 (source 0 = PLL, 1 = 24 MHz); clk = src / (div + 1) [TRM ch. 3]. Gates: `clk_sdmmc` /
  `clk_emmc` in CLKGATE1 bits 8 / 9; `hclk_sdmmc` / `hclk_emmc` = CRU gate ids 0x6b / 0x6c [TRM + AP30].
- Register-level notes: [soc_peripherals.md](soc_peripherals.md).

## Internal storage: SD-NAND on the EMMC controller

| Evidence | Points to | Tag |
|---|---|---|
| Package: 8-pad LGA, ~6×8 mm, 4 pads per long side, on side A's top edge; an **empty** ~150-ball BGA footprint beside it | SD-NAND (8 pads = VCC, GND, CLK, CMD, D0-D3); the BGA site is an alternate eMMC fit | [AP30] + [?] |
| Marking `TM3F4GUAI`, stylised "TM" logo | Titan Micro **TM3F** SD-NAND family; its datasheet describes 1-4 Gbit parts as SD 2.0, max 50 MHz, 512-byte sectors | [WEB, part-number match only, ?] |
| Capacity 983 040 sectors = 480 MiB | a 4 Gbit flash after spare / management area; eMMC parts this small are rare | [AP30] + [?] |
| The stock driver identifies the chip with **auto-detect** (CMD0, CMD8 0x1AA, CMD5, CMD55 probes, then SD or MMC init); a forced-MMC mode exists but has no caller | the firmware does not assume eMMC | [AP30] |
| No eMMC boot partitions used: the only partition-config switch has no caller; the boot loader lives in the user area from sector 64 | SD-style boot layout | [AP30] |
| The pin setup muxes all 8 data lines + RSTN | generic SDK code, no evidence either way | [AP30] |
| The boot loader's flash-info answer says "Samsung eMMC" / "EMMC" | probably a default string, not a read CID | [AP30] + [?] |

**Conclusion:** SD protocol, 4-bit, up to 50 MHz High Speed, block-addressed (SDHC-style) [?, high confidence, not
proven]. Another production run might fit an eMMC in the BGA footprint, which the auto-detecting driver would also
handle [?].

**Power and reset:** the stock code gates `hclk_emmc` around each access to the internal flash [AP30]. The firmware
locks the firmware area against writes unless a software key ("NAND", 0x444E414E) is set around the updater's writes
[AP30]; see [../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md).

### SD init as the stock driver does it (own words) [AP30]

Power on, 1-bit, 400 kHz, 80 init clocks + CMD0; CMD8 with pattern 0x1AA; ACMD41 loop with HCS until ready (bounded,
~2 s); CMD2, CMD3 (card publishes its RCA); CMD9 CSD → capacity (CSD v1 formula or v2 `(C_SIZE + 1) × 1024`
sectors) and TRAN_SPEED, clock set to min(TRAN_SPEED, 24 MHz); CMD7 select; CMD16 512; ACMD42 (disconnect the DAT3
pull-up); ACMD51 SCR; ACMD6 4-bit if the SCR allows it (checked by re-reading the SCR, else 1-bit); CMD6 check-then-
set function group 1 = High Speed; if accepted, 50 MHz. Standard-capacity cards use byte addresses, high-capacity
cards (OCR CCS set) block addresses. Reads: CMD17 / CMD18 + CMD12; writes: CMD24 / CMD25; a multi-sector request is
one CMD18 for the whole run.

The MMC path (not used on this board as far as known) runs CMD1, a host-assigned RCA, EXT_CSD, HS_TIMING, a bus test
for 4 then 8 bits and BUS_WIDTH; it clocks the card at 48 MHz, above the 26 MHz legacy limit [AP30].

### Host settings [AP30]

Reset controller + FIFO + DMA and wait; FIFO thresholds: burst 16, RX watermark 15, TX watermark 16; 1-bit bus to
start; debounce 600 000 clocks (25 ms at 24 MHz); interrupts: command done, data transfer over, TX request, RX
request, host timeout, start-bit error. Initial CRU divider 32 from 24 MHz (750 kHz); identification at 400 kHz.

## microSD slot

| Item | Value | Tag |
|---|---|---|
| Slot | metal slot on board side B, on the wheel edge | [AP30] |
| Controller | SDMMC (controller 0) | [AP30] |
| Card detect | **GPIO0_11 (GPIO0_B3, ball B6), active low**, polled; no detect interrupt; the controller's own detect pin is not muxed | [AP30] |
| Card types | SDSC, SDHC, SDXC by protocol (HCS accepted, CSD v2 capacity, 32-bit sector count, up to 2 TiB) | [AP30] |
| Speed | High Speed 50 MHz, 4-bit; no UHS-I | [AP30 + TRM] |
| Card power | controller `PWREN` only; no card-power switch GPIO seen | [AP30, ?] |
| Vendor limit | "up to 256 GB"; the firmware does not refuse larger cards, and a 512 GB card is reported working; the real limit is the media library (7 168 songs) | [WEB] + [AP30] |
| File systems | FAT16 / FAT32 / exFAT read; exFAT writes by the stock code are buggy; FAT32 is the safe choice | [AP30] + [WEB] |

The reference board uses the same detect pin (GPIO0_B3) [WEB] EVK. Media-change handling, the library rebuild after
a card swap and the favourites bug: [../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md).

## Bus widths, clocks, PIO vs DMA

- **Bus width:** both media run 4-bit after init [AP30, internal ?].
- **Bus clock rule** [AP30]: requests above 50 MHz are refused; the source is the system PLL unless the system clock
  is below 24 MHz (then the 24 MHz crystal); the CRU divider is the rounded-up ratio forced to an even number (max
  32), the controller divider covers the rest. So the real card clock is "PLL ÷ an even number, ≤ the request"; it
  depends on the PLL frequency the clock manager chose, and is re-derived on every PLL change. The exact clock during
  playback has not been pinned down [?].
- The clock-change procedure follows the TRM order: wait for data not busy, disable the card clock with an
  update-clock-only command, change divider / source with another update command, re-enable with a third [AP30 +
  TRM ch. 10.5.1].
- **PIO, not DMA:** the TRM offers DMAC1 requests 12 / 13; the stock firmware does **not** use them (a DMA start
  helper exists but is unreferenced). Each RX-watermark interrupt moves 16 words (64 bytes) from the FIFO; the rest is
  drained after "data transfer over": 8 interrupts per 512-byte sector [AP30].
- File reads run with the firmware's deferred audio / mailbox handlers held off for the whole read [AP30].

## Throughput

No throughput has been benchmarked on the SD-NAND or the microSD path. Known figures:

| Figure | Value | Tag |
|---|---|---|
| Bus maximum (HS, 4-bit) | 25 MB/s | [TRM] |
| Effective sequential read, estimate | ~10-15 MB/s (bus minus PIO, command and interrupt overhead) | [?] |
| PIO cost, estimate | ~100 cycles per 64 bytes ≈ 1.6 cycles/byte (~1.6 % of a 100 MHz core at 1 MB/s) | [?] |
| Loader USB mode read speed | 1.18 MiB/s measured over Rockusb (limited by the loader and its 16-sector reads) | [AP30] measured |
| Highest stock stream rate | DSD256 DSF ≈ 2.8 MB/s; 24/192 WAV ≈ 1.15 MB/s | arithmetic |

SD read access time is bounded at 100 ms worst case by the SD specification; writes can stall for tens to hundreds
of ms during internal erase / garbage collection [?, general SD behaviour].

## Flash map summary

Physical sectors of the internal storage (512-byte sectors). "Loader LBA" = the address the boot loader's Rockusb
interface uses = physical − 0x2000 [AP30, measured]. Full details, the IDB structure, and the reserved-partition
layout: [../formats/idb_and_flash_layout.md](../formats/idb_and_flash_layout.md).

```
physical            loader LBA          size       content
0x000000-0x001FFF   (not reachable)     4 MiB      boot area: IDB / boot loader copies from sector 0x40,
                                                   reserved areas; never written by updates
0x002000-0x010FFF   0x00000-0x0EFFF     30 MiB     FW1 slot (RKnanoFW image + header copy)
0x011000-0x01FFFF   0x0F000-0x1DFFF     30 MiB     FW2 slot (boot fallback when FW1 is invalid)
0x020000-0x083FFF   0x1E000-0x81FFF     200 MiB    reserved partition: settings, bookmarks, favourites, media library
0x084000-end        0x82000-0xEDFFF     216 MiB    user volume: MBR, FAT32 at +0x40 (USB mass-storage LUN 0)
end = 983 040 sectors (480 MiB); the loader sees 974 848 sectors (= 983 040 − 0x2000)
```

> **Warning:** writing to the internal flash (through loader USB mode or your own firmware) is risky. **Never write
> physical sectors 0x0000-0x1FFF**: they hold the boot loader, which is the recovery path (losing it leaves only
> untested MaskROM tricks). Never run `rkdeveloptool ef` and never download a foreign loader (`db` / `ul`). Write
> FW1 / FW2 only with the updater discipline (invalidate the header, write the body, write the header last, read
> back). The recovery procedure is in [../guides/recovery.md](../guides/recovery.md); take a full read-only backup
> first ([../guides/backup.md](../guides/backup.md)).

## Open questions

| Question | How it could be answered |
|---|---|
| Internal chip protocol: SD or MMC for sure? Vendor? | the loader UART banner (`BootDevType=`), or read CID / CSD / SCR from own code |
| Actual card clock during playback | compute from the PLL per clock profile, or scope the `CLK` test pad (if it is the storage clock) |
| Real read latency and throughput of the SD-NAND and of typical microSD cards; PIO vs DMA | bare-metal benchmark of CMD18 at 1 / 8 / 64 / 256 sectors |
| Is the empty BGA footprint wired in parallel with the SD-NAND? | continuity |
| Content of physical sectors 0..0x3F and 0x1C00..0x1FFF | not reachable through the loader's read commands; leave untouched |

## Sources

- [AP30] analysis of firmware V1.7.8 (host driver, SD/MMC card layer, pin and clock setup, card detect, partition
  code); board inspection (storage chip, empty footprint, slot); a full read-only dump and loader-mode tests on a
  device (capacity, layout, read speed).
- [TRM] [RKNanoD TRM V1.0](https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf) ch. 2.3-2.4, 3, 10, 11;
  [DS] [RKNanoD datasheet V1.8](https://rockchip.fr/RKNanoD%20datasheet%20V1.8.pdf) (pins).
- [WEB] Titan Micro TM3FxxxUXX SD-NAND datasheet (distributor mirrors; family match only); microSD reports from
  reviews ([../community/user_feedback.md](../community/user_feedback.md));
  [rkdeveloptool](https://github.com/rockchip-linux/rkdeveloptool); EVK documents in public SDK copies.
