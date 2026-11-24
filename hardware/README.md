# Hardware

Status: draft, 2026-11

The AP30 is built around a Rockchip **RKNanoD-G** system-on-chip (two Cortex-M3 cores, 1 MB of internal SRAM) on one
double-sided main board. Around it sit a Cirrus Logic **CS43198** DAC with a Richtek **RT6863** headphone amplifier,
a 2.0" 296×240 IPS panel on an 8-bit i8080 bus, eight face buttons on a resistor ladder plus an ALPS volume wheel,
an 8-pad **SD-NAND** chip as internal storage, a microSD slot, a separate **Realtek ALC5686** USB-audio chip for
USB DAC mode, a **JieLi** Bluetooth chip, an AnalogTek **AT85163S** real-time clock and a 1200 mAh Li-po cell. There
is no PMIC: power comes from discrete regulators. This page shows how the parts connect and lists every hardware
page.

Tags: **[AP30]** confirmed in the AP30 firmware (V1.7.8) or on the device (board inspection, measurement) ·
**[TRM]** RKNanoD TRM V1.0 · **[DS]** a chip datasheet · **[EM]** Snowsky Echo Mini, not checked on the AP30 ·
**[WEB]** public web source · **[?]** guess. Details: [../overview/conventions.md](../overview/conventions.md).

## Contents

- [Block diagram](#block-diagram)
- [Chip list](#chip-list)
- [Hardware pages](#hardware-pages)
- [Where the firmware side lives](#where-the-firmware-side-lives)
- [Open questions](#open-questions)
- [Sources](#sources)

## Block diagram

Signal names are SoC pin names (GPIOx_n = bank x, pin n; ball numbers in [board_ap30.md](board_ap30.md)).
Dashed boxes are roles that are inferred, not traced on the board.

```
                         USB-C receptacle (16-pin)
                          │ VBUS            │ D+ / D-
         ┌────────────────┘                 │
         │                        ┌─────────┴──────────┐  select = GPIO0_14 [AP30, role ?]
         │                        │ "7227" DPDT analog │  1 = RKNanoD (default, File Transfer)
         │                        │ USB switch [?]     │  0 = Realtek (USB DAC mode)
         │                        └───┬───────────┬────┘
         │                            │           │
         ▼                            ▼           ▼
 ┌───────────────┐   VBUS sense ┌──────────────────────────────────────────┐   USB D+/D-  ┌──────────────────┐
 │ charger IC    │ ──(GRF bit)─►│            Rockchip RKNanoD-G            │              │ Realtek ALC5686  │
 │ (not identi-  │   "full" ───►│ GPIO2_3     LFBGA121, 2× Cortex-M3      │              │ USB audio chip   │
 │  fied) + NTC  │   GPIO1_0 ◄──│ (charge ctl?)  24 MHz crystal            │              │ 0bda:4a35, own   │
 └──────┬────────┘              │                                          │              │ 24 MHz crystal   │
        │                       │  PLAYON  GPIO2_5 ◄── Power key (wheel    │  GPIO0_12 ──►│ enable? [?]      │
 ┌──────┴────────┐  enable =    │                      push switch [?])    │              └────────┬─────────┘
 │ 1200 mAh Li-po│  PLAYON OR   │  POWERHOLD GPIO2_6 ──► regulator enable  │                       │ analog or I2S
 │ + protection  │  POWERHOLD   │                                          │                       │ path to the
 │ PCB, BAT+/-,  │  OR VBUS     │  SARADC ch0 ◄── battery (2:1 divider)    │                       │ output [?]
 │ NTC pads      │  [WEB EVK    │  SARADC ch1 ◄── 8-key resistor ladder    │                       ▼
 └───────────────┘   pattern,   │  GPIO2_0 / GPIO2_9 ◄── ALPS encoder A/B  │   I2S1A (master)  ┌──────────────┐
   discrete regs,    AP30 fits] │                                          │──GPIO1_0..1_3────►│ Cirrus Logic │
   no PMIC                      │  I2C1C GPIO2_13/12 ───────── 0x66 ───────│──────────────────►│ CS43198 DAC  │
                                │                                          │                   │ 24.576 MHz   │
 ┌───────────────┐  I2C0A       │  GPIO2_1 mute, GPIO2_2, GPIO2_14,        │                   │ crystal      │
 │ AnalogTek     │◄─GPIO2_10/11─│  GPIO1_4 audio power / enable [roles ?]  │──────────────────►└──────┬───────┘
 │ AT85163S RTC  │  0xA2        │                                          │                          │ analog
 │ + 32.768 kHz  │              │  VOP i8080 8-bit (GPIO0_15..25) ─────────│──► 22-pin FPC ──► 2.0" IPS panel
 └───────────────┘              │  GPIO2_15 LCD reset, GPIO2_4 PWM0 ───────│──► 296×240, backlight
                                │                                          │                   ┌──────────────┐
 ┌───────────────┐  UART1A      │  EMMC controller (4/8-bit) ──────────────│──► SD-NAND        │ Richtek      │
 │ JieLi BT SoC  │◄─GPIO2_16/17─│                                          │    "TM3F4GUAI"    │ RT6863 amp   │
 │ QFN-32, own   │  115200 8N1  │  SDMMC controller (4-bit) ───────────────│──► microSD slot   └──────┬───────┘
 │ 24 MHz xtal,  │  power =     │  card detect GPIO0_11 (active low)       │                          │
 │ FPC antenna   │  GPIO2_7     │  headphone detect GPIO2_8 + GPIO0_13 ◄───│── jacks               ┌──┴────────────┐
 └──────▲────────┘              └──────────────────────────────────────────┘                       │ 3.5 mm SE +   │
        │ analog audio in (samples the DAC/amp output) [?]                                          │ 4.4 mm BAL    │
        └───────────────────────────────────────────────────────────────────────────────────────────┤ jacks         │
                                                                                                    └───────────────┘
```

Reading the diagram:

- **Audio:** decoded PCM leaves the SoC on I2S1 (SoC = clock master) to the CS43198; the DAC is controlled over
  I2C1 pin group C and clocks itself from its own 24.576 MHz crystal; the RT6863 drives the two jacks
  [AP30]. See [audio_dac_cs43198.md](audio_dac_cs43198.md), [audio_amp_rt6863.md](audio_amp_rt6863.md).
- **USB:** the USB-C data lines go either to the RKNanoD (mass storage, loader USB mode) or to the Realtek
  ALC5686 (USB DAC mode), switched by GPIO0_14 [AP30, switch part ?]. See [usb.md](usb.md).
- **Bluetooth:** the JieLi chip is a transmitter with its own stack, commanded over a UART; no digital audio goes
  to it from the RKNanoD, so it very likely samples the analog output [?]. See [bluetooth.md](bluetooth.md).
- **Power:** the board stays powered while any of PLAYON (Power key), POWERHOLD (SoC latch) or VBUS is high; an
  external circuit resets the player ~8 s after Power is pressed [AP30]. See [power.md](power.md).

## Chip list

Part identifications from the package markings of an opened retail unit [AP30]; lot and date codes are left out.

| Function | Part | Package | Confidence |
|---|---|---|---|
| SoC | Rockchip **RKNanoD-G** | LFBGA121 | [AP30] marking |
| DAC | Cirrus Logic **CS43198** | QFN-40 | [AP30] marking |
| Headphone amplifier | Richtek **RT6863** (marked `6863D`) | QFN, 12-16 leads | [AP30] marking + vendor spec [WEB] |
| Internal storage | marked **`TM3F4GUAI`** (logo "TM"), Titan Micro TM3F SD-NAND family [?] | 8-pad LGA, ~6×8 mm | marking [AP30], vendor [?] |
| USB-audio chip (DAC mode) | Realtek **ALC5686** | QFN-48 | [AP30] marking + USB IDs |
| Bluetooth | **JieLi** SoC marked `…-56C4` (probably AC6956C4 [?]) | QFN-32 | [AP30] marking |
| RTC | AnalogTek **AT85163S** (PCF85163-style numbering [?]) | 8-pin MSOP | [AP30] marking |
| USB / signal switch | marked `7227` (WillSemi WAS7227Q / FSW7227 family of DPDT switches [?]) | 10-lead leadless | [?] |
| Crystals | 24.000 MHz (SoC), 24.576 MHz (DAC), 24.000 MHz (ALC5686), 24.000 MHz (JieLi), 2-pad RTC crystal | SMD | [AP30] markings; RTC frequency [?] |
| Power parts | `DP1 165`, `06T2`, `S2ZQ`, `705628`, `D00HAV` ×2, `AFCP` (AO3415-type P-MOSFET [?]), `SL` diodes | various | mostly not identified, see [board_ap30.md](board_ap30.md) |

Full list with packages, positions and the unidentified parts: [board_ap30.md § Chips](board_ap30.md#chips-and-markings).

## Hardware pages

| Page | What it covers |
|---|---|
| [soc_rknanod.md](soc_rknanod.md) | the Rockchip RKNanoD: cores, memory map, buses, clocks, interrupts, peripherals overview |
| [soc_peripherals.md](soc_peripherals.md) | register-level notes per SoC peripheral (CRU, GRF, PMU, timers, WDT, GPIO, ADC, PWM, DMA, I2C, I2S, UART, SD/MMC, VOP, USB, mailbox) |
| [dual_core.md](dual_core.md) | the two Cortex-M3 cores, core-B start/stop, mailbox, shared RAM, accelerators |
| [board_ap30.md](board_ap30.md) | the AP30 board: complete pin assignment table, power tree, test pads, chip markings, unknowns |
| [photos.md](photos.md) | teardown photos: annotated board overviews, a close-up of every chip, connector and test-pad area |
| [audio_dac_cs43198.md](audio_dac_cs43198.md) | CS43198: I2C control, init sequence, registers, filters (incl. NOS), gain, volume, clocks, sample rates, DSD |
| [audio_amp_rt6863.md](audio_amp_rt6863.md) | RT6863 and the output stage, the two jacks, mute / enable lines, output power |
| [display.md](display.md) | panel geometry, controller class, init sequence, VOP i8080 interface, backlight |
| [input.md](input.md) | key ladder, volume wheel, Power key, scan timing |
| [storage.md](storage.md) | internal SD-NAND, microSD slot, bus widths and clocks, flash map summary |
| [usb.md](usb.md) | USB-C, RKNanoD OTG, the Realtek USB-audio chip and the hand-over, charging, USB IDs |
| [bluetooth.md](bluetooth.md) | JieLi chip, UART link and its ASCII protocol, audio path, codec limits |
| [rtc.md](rtc.md) | AT85163S real-time clock |
| [power.md](power.md) | power latch, VBUS, the ~8 s hardware reset, battery measurement, charging, sleep |

## Where the firmware side lives

Hardware pages describe chips, wiring and register values. What the stock firmware *does* with them is in:
[../firmware/audio_playback.md](../firmware/audio_playback.md),
[../firmware/display_and_input.md](../firmware/display_and_input.md),
[../firmware/power_management.md](../firmware/power_management.md),
[../firmware/usb_modes.md](../firmware/usb_modes.md),
[../firmware/bluetooth.md](../firmware/bluetooth.md),
[../firmware/storage_and_filesystems.md](../firmware/storage_and_filesystems.md),
and the boot loader in [../firmware/boot_loader.md](../firmware/boot_loader.md).

## Open questions

- No schematic exists publicly; every board-level role marked [?] comes from firmware behaviour or part markings.
  The biggest gaps: which GPIO resets the CS43198, what GPIO2_2 / GPIO2_14 / GPIO1_4 / GPIO0_12 switch, the charger
  IC, the source of the ~8 s reset, where the JieLi takes its audio, and what the `TX` / `CLK` test pads connect to.
  Each page lists its own open questions.

## Sources

- [AP30] analysis of firmware V1.7.8 (and 5.0.0 / HIFIYF26 where named); board inspection and measurements on a
  retail unit.
- [TRM] [Rockchip RKNanoD TRM V1.0](https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf);
  [DS] [RKNanoD datasheet V1.8](https://rockchip.fr/RKNanoD%20datasheet%20V1.8.pdf);
  [DS] [Cirrus Logic CS43198 datasheet DS1156F2](https://statics.cirrus.com/pubs/proDatasheet/CS43198_DS1156F2.pdf).
- [WEB] [Head-Fi AP30 showcase (vendor spec text)](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/),
  reviews listed in [../overview/sources.md](../overview/sources.md).
- [EM] [iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw) (`ETUDE.md`, the Echo Mini study).
