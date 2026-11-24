# Real-time clock: AnalogTek AT85163S

Status: draft, 2026-11

The AP30 keeps the date and time in a PCF8563-class real-time clock, an **AnalogTek AT85163S**, with its own
32.768 kHz crystal, on **I2C0 pin route A** (GPIO2_10 / GPIO2_11) at **8-bit address 0xA2** (7-bit 0x51). The stock
firmware reads it once at boot, falls back to a fixed default when the values are invalid, and then counts time in
software; it writes the chip only when the user sets the clock, on a factory reset, or when it installs the default.

Tags: **[AP30]** firmware V1.7.8 or the device · **[TRM]** RKNanoD TRM V1.0 · **[DS]** a datasheet · **[EM]** Echo Mini · **[WEB]**
public source · **[?]** guess.

## Summary

| Item | Value | Tag |
|---|---|---|
| Part | AnalogTek `AT85163S`, 8-pin MSOP, board side A right of the storage chip | [AP30] marking |
| Datasheet | no AnalogTek datasheet found; the number follows NXP's **PCF85163** (a PCF8563 variant with the same register map and address) | [?] |
| Crystal | 2-pad SMD crystal next to it (marking `AQQT` / `T53F`), 32.768 kHz by its position | [AP30], frequency [?] |
| Bus | I2C0 (base 0x40040000, IRQ 31), route A: SCL **GPIO2_10** (GPIO2_B2, ball D5), SDA **GPIO2_11** (GPIO2_B3, ball E5) | [AP30] |
| Address | 8-bit **0xA2** (write) / 0xA3 (read) = 7-bit 0x51 | [AP30] |
| Speed | the firmware opens the bus at 100 for writes and 200 for reads (unit assumed kHz) | [AP30], unit [?] |
| Shared pins | none on the AP30. I2C0 route B (GPIO2_17 / GPIO2_16) would collide with the Bluetooth UART; route C is GPIO0_6 / GPIO0_5 (eMMC data pins) | [AP30] |
| Supply when the player is off | not traced; presumably straight from the battery [?] | [?] |
| `G`, `5V` test pads | above the RTC on side A (ground and VBUS [?]) | [AP30] |

The Rockchip reference board (early V0.1 schematic) has a HYM8563 RTC on the same bus and address [WEB] EVK, so
Hidizs kept the reference design's RTC slot with a different vendor's part. On the Echo Mini the I2C0A pins carry
the DACs instead [EM].

## Register map

PCF8563 / PCF85163 layout [WEB NXP datasheets]; the stock access pattern matches it [AP30]. All time fields are BCD.

| Address | Register | Bits that matter |
|---|---|---|
| 0x00 | Control_status_1 | bit 5 STOP, bit 7 TEST1 |
| 0x01 | Control_status_2 | alarm / timer flags and interrupt enables |
| 0x02 | VL_seconds | bit 7 **VL** = clock integrity lost (low voltage); bits 6:0 seconds |
| 0x03 | minutes | bits 6:0 |
| 0x04 | hours | bits 5:0 |
| 0x05 | days | bits 5:0 |
| 0x06 | weekdays | bits 2:0 |
| 0x07 | century_months | bit 7 century; bits 4:0 month |
| 0x08 | years | 0-99 |
| 0x09-0x0C | minute / hour / day / weekday alarm | |
| 0x0D | CLKOUT control | |
| 0x0E, 0x0F | timer control, timer | |

## How the stock firmware uses it

[AP30]

1. **Boot:** read 9 bytes from register 0x02 (seconds … hour alarm), then write 0x00 to Control_status_1 (clears
   STOP and TEST1, so the clock runs).
2. Decode BCD: seconds and minutes masked to 7 bits (**VL ignored**), hours and days to 6 bits, month to 5 bits
   (**century bit ignored**), year = 2000 + years.
3. Validate: month 1-12, day 1-31 (≠ 0), hour ≤ 23, minute ≤ 59, second ≤ 59. If invalid, read once more.
4. Still invalid: install **2026-08-19 09:00:00** (the factory firmware's build date) and write registers 0x02-0x08,
   retrying up to 3 times on I2C error. The weekday computed for it is wrong (an uninitialised counter, a firmware
   bug; the same pattern in the factory-reset path) — see [../firmware/known_bugs.md](../firmware/known_bugs.md).
5. **Run time:** a software clock advances every 100 ticks (1 s) and rolls minutes, hours, days and months with a
   days-per-month table; the RTC is not re-read in normal operation.
6. **Set:** the date / time screen writes registers 0x02-0x08; a factory reset writes too.
7. A failed read keeps the previous values in RAM.

Consequences: the software clock drifts with the 24 MHz crystal while the player runs and is corrected only at the
next boot; a lost-power RTC (VL set) with plausible values is not detected; years ≥ 2100 are not handled.

## Open questions

| Question | How it could be answered |
|---|---|
| Is the AT85163S register-compatible with the PCF85163 in every detail (timer, CLKOUT default, VL behaviour)? | read all 16 registers over I2C and compare with the NXP datasheet |
| RTC supply when the player is off (battery direct or a switched rail)? | remove power for some minutes and check the VL bit; continuity from the RTC VDD pin |
| Are the interrupt (pin 3) and CLKOUT (pin 7) outputs wired, e.g. to a GPIO2 pin (which would allow alarm wake-up)? | continuity to SoC balls |

## Sources

- [AP30] analysis of firmware V1.7.8 (RTC read / write routines, boot-time validation, software clock, date / time
  settings); board inspection (AT85163S and crystal markings).
- [WEB] [NXP PCF8563 datasheet](https://www.nxp.com/docs/en/data-sheet/PCF8563.pdf),
  [NXP PCF85163 datasheet](https://www.nxp.com/docs/en/data-sheet/PCF85163.pdf); EVK V0.1 schematic (HYM8563 on
  I2C0A) in public SDK copies.
- [TRM] [RKNanoD TRM V1.0](https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf) ch. 22 (I2C).
