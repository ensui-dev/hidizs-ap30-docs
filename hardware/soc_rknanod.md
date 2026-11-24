# Rockchip RKNanoD-G: the AP30's SoC

Status: draft, 2026-11

The AP30 is built around a **Rockchip RKNanoD-G**, a dual Cortex-M3 microcontroller with 1 MiB of on-chip SRAM, no
external RAM interface, no cache and no execute-in-place flash. This page is the SoC reference: what the chip contains,
its full memory map as each core sees it, power domains, bus attributes, the clock tree and the rules for changing it,
the 41 interrupt lines, reset sources and what survives each one, the MPU question, and the pin-mux table of the
LFBGA121 package. Register-level notes for each peripheral are in [soc_peripherals.md](soc_peripherals.md); the second
core, the mailbox and the audio accelerators in [dual_core.md](dual_core.md); how the AP30 board uses the pins in
[board_ap30.md](board_ap30.md).

"Core A" below is the TRM's *sys-core* / core 0 / "MCU core"; "core B" is the TRM's *cal-core* (calculation core) /
core 1 / "MPU core". The TRM's "MPU core" means core B, **not** a memory protection unit.

## Contents

- [Identification and package](#identification-and-package)
- [Feature inventory](#feature-inventory)
- [The two CPU cores](#the-two-cpu-cores)
- [Memory map](#memory-map)
- [RAM blocks](#ram-blocks)
- [Power domains](#power-domains)
- [Bus attributes: caches, XIP, bit-banding, memory types](#bus-attributes-caches-xip-bit-banding-memory-types)
- [Clocks](#clocks)
- [Interrupts](#interrupts)
- [Boot ROM and boot sources](#boot-rom-and-boot-sources)
- [Resets and what survives them](#resets-and-what-survives-them)
- [The MPU question](#the-mpu-question)
- [Debug ports](#debug-ports)
- [Electrical limits](#electrical-limits)
- [Pin-mux table (LFBGA121)](#pin-mux-table-lfbga121)
- [Contradictions in the Rockchip documents](#contradictions-in-the-rockchip-documents)
- [Open questions](#open-questions)
- [Sources](#sources)

## Identification and package

| Item | Value | Source |
|---|---|---|
| Chip | Rockchip **RKNanoD** (not RKNanoC) | [AP30] analysis of firmware V1.7.8: core-B code, mailbox IRQs, 6 UARTs, 3 I2Cs, 2 I2Ss and every peripheral base and IRQ number match the RKNanoD TRM |
| Package | **RKNanoD-G, LFBGA121** | [AP30] chip marking `RKNANOD-G` read on an opened unit |
| Other packages | RKNanoD-N (QFN68), RKNanoD-L (LQFP128) | [DS] datasheet V1.8 §2.1 |
| Why not QFN68 | six GPIOs the firmware drives (GPIO2_0, 2_8, 2_9, 2_10, 2_11, 0_13) are not bonded on QFN68 | [AP30] + [DS] pin tables |
| USB identity string | the firmware's Rockchip vendor SCSI reply still says `RKNANOC`: a leftover from the older SDK generation | [AP30] |

The RKNanoC (one Cortex-M3 at 100 MHz, 224 KB SRAM, one UART/I2C/I2S) is the predecessor; see
[rockchip_rknano_family.md](../related/rockchip_rknano_family.md).

## Feature inventory

From the TRM feature list and the datasheet; the right-hand column says whether the AP30 firmware uses the block.

| Block | Count / size | AP30 stock use | Source |
|---|---|---|---|
| Cortex-M3 cores | 2 (core A system, core B calculation) | both | [TRM ch1.1, ch7] |
| Boot ROM | 16 KiB | boots from the internal flash | [TRM ch1.1] |
| SRAM | 1 MiB in five blocks (320 + 256 + 64 + 128 + 256 KiB) | all of it | [TRM ch12] |
| PLL | one general-purpose PLL on one 24 MHz crystal; the audio codec has its own PLL | both PLLs | [TRM ch3, ch9] |
| Mailbox | 4 channels per direction | yes | [TRM ch1.1] |
| DMA | DMAC1 (6 channels), DMAC2 (2 channels) | both | [TRM ch8] |
| Display | VOP: i8080 MCU interface, RGB565 / YUV420, up to 400×400; e-ink T-CON (EBC) | VOP only | [TRM ch15, ch24] |
| USB | USB 2.0 OTG, HS/FS, integrated PHY | device mode only | [TRM ch14] |
| Storage | SDMMC/SDIO (SD 2.0, MMC 4.41, 4-bit), eMMC (MMC 4.41, 8-bit), SFC (SPI NOR/NAND, x1/x2/x4) | SDMMC + eMMC | [TRM ch10, 11, 25] |
| Serial | 6 UART, 2 SPI, 3 I2C (master only, ≤ 400 kbit/s), 2 I2S (≤ 192 kHz) | UART1, I2C0, I2C1, I2S1 | [TRM ch1.1] |
| Timers | 2 × 64-bit timer, 1 watchdog, SysTick in each core | yes | [TRM ch18, ch20] |
| PWM | 5 outputs (two blocks) | 1 (backlight) | [TRM ch21] |
| GPIO | 3 banks × 32 lines in the register map; 56 bonded on LFBGA121 | yes | [TRM ch19], [DS] |
| SAR-ADC | 8 channels, 10-bit, ≤ 100 kS/s | 2 channels | [TRM ch17] |
| Audio codec (ACODEC) | stereo 24-bit DAC/ADC, headphone amp, own PLL | **PLL only** (external DAC) | [TRM ch9], [AP30] |
| Audio accelerators | HIFIACC (FFT/MAC/FLAC/ALAC/APE filters), IMDCT36 and SYNTH (MP3) | all three, from core B | [TRM ch26-28], [AP30] |

## The two CPU cores

| Item | Value | Source |
|---|---|---|
| Architecture | ARMv7-M, Thumb/Thumb-2, SDIV/UDIV, single-cycle 32-bit multiply, unaligned access support | [TRM ch7.1.1, 7.2.2] |
| Revision | the TRM refers to Arm's *Cortex-M3 r2p0 TRM* (DDI0337G); the CPUID register has not been read on a device | [TRM ch6.4, ch7.3]; [?] |
| FPU, cache | none (the Cortex-M3 has neither) | [TRM ch7]; [WEB] Arm |
| Buses | I-Code, D-Code and System AHB-Lite per core | [TRM ch7.1.1] |
| NVIC | per core; 41 external lines in the interrupt table; **5 priority bits** (32 levels, bits 7:3 of each priority byte) | [TRM ch2.3, ch7.1.1]; [AP30] every stock priority value is a multiple of 8 |
| SysTick, SCB | per core; both cores' code programs its own SysTick and AIRCR | [AP30] |
| Which core am I | `GRF_CPU_ID` (0x500100FC) bit 0: 0 = core A, 1 = core B | [TRM ch4] |
| Core status | `GRF_SOC_STATUS0` (core A) / `GRF_SOC_STATUS1` (core B): bit 0 sleeping, 1 sleepdeep, 2 lockup, 3 halted | [TRM ch4] |
| Core B at reset | held in reset (`CRU_SOFTRST3_CON` bit 2 resets to 1) | [TRM ch3.7] |
| Clock limits | stock firmware caps core A at 200 MHz and core B at 450 MHz; Rockchip's own documents disagree (200/400 MHz in the SDK guide, 250/500 MHz in the EVK guide) | [AP30]; [WEB] Rockchip EVK/SDK guides |

How core B is started, stopped and talked to: [dual_core.md](dual_core.md).

The System Control Space (0xE000E000-0xE000EFFF: NVIC, SysTick, SCB, and the MPU registers if an MPU exists) is
**private to each core**: core A cannot reach core B's NVIC and vice versa [WEB] Arm ARMv7-M.

## Memory map

All blocks are 64 KiB windows unless noted [TRM fig 2-1].

```
 Address        Core A (remap=0)   Core A (remap=1)   Core B             Power domain
 0x0000_0000 ┬─ BOOT ROM 16K ───── PMU-SRAM 64K ───── HIGHRAM0 alias ─── (alias)
             │  (0x4000-: rsvd)    (0x1_0000-: rsvd)  128K (0x2_0000-: reserved)
 0x0100_0000 ├─ HIGHRAM0  128K   "IRAM for core 1"                        PD_HIGH
 0x0102_0000 ├─ HIGHRAM1  256K   "DRAM for core 1"                        PD_HIGH
 0x0106_0000 ├─ HIFIACC   64K    lossless-audio accelerator               PD_HIGH
 0x0107_0000 ├─ DMAC2     64K    2 channels                               PD_HIGH
 0x0108_0000 ├─ reserved
 0x0300_0000 ├─ SYSRAM0   320K   "IRAM for core 0"                        PD_LOGIC
 0x0305_0000 ├─ SYSRAM1   256K   "DRAM for core 0"                        PD_LOGIC
 0x0309_0000 ├─ PMU-SRAM  64K    (unmapped here when remap=1)             PD_PMU (always on)
 0x030A_0000 ├─ reserved
 0x4000_0000 ├─ APB peripherals 0x4002_0000 .. 0x4018_FFFF                PD_LOGIC
 0x5001_0000 ├─ GRF, PMU, GPIO2   0x5001_0000 .. 0x5003_FFFF              PD_PMU
 0x6000_0000 ├─ AHB peripherals  0x6000_0000 .. 0x600B_FFFF               PD_LOGIC
 0xE000_E000 └─ System Control Space (per core, private)
```

* **One shared map.** Apart from address 0, both cores see the same addresses: core A can read and write HIGHRAM,
  core B can read and write SYSRAM and every peripheral [TRM fig 2-1]. The stock firmware relies on this: core A loads
  core B's program into HIGHRAM and core B reads a descriptor in SYSRAM [AP30].
* **Remap.** `GRF_INTER_CON0` bit 8 (`noc_remap`, 0x500100C4) selects what core A sees at 0: 0 = boot ROM (reset
  value), 1 = PMU-SRAM, and then nothing is mapped at 0x03090000 [TRM ch4, fig 2-1]. TRM ch2.1 calls the bit
  `GRF_SOC_CON0[8]`; the register chapter has it in `GRF_INTER_CON0` (the stock firmware writes it there) [TRM;
  AP30]. The stock firmware only ever writes 0 (crash handler, watchdog ISR, reboot path) [AP30]; what uses remap = 1 is
  not known (probably wake-up from the PMU low-power mode [?]).
* **Core B at 0.** Core B sees a 128 KiB alias of HIGHRAM0 at 0x00000000, so its vector table is the first words of
  HIGHRAM0 [TRM fig 2-1].

### Peripheral bases

IRQ numbers are in [Interrupts](#interrupts); register notes in [soc_peripherals.md](soc_peripherals.md).

| Base | Block | Base | Block |
|---|---|---|---|
| `0x40020000` | I2S0 | `0x400F0000` | PWM0 (4 channels) |
| `0x40030000` | I2S1 | `0x40100000` | PWM1 (1 channel bonded) |
| `0x40040000` | I2C0 | `0x40110000` | Mailbox |
| `0x40050000` | I2C1 | `0x40120000` | WDT |
| `0x40060000` | I2C2 | `0x40130000` | UART3 |
| `0x40070000` | SPI0 | `0x40140000` | UART4 |
| `0x40080000` | SPI1 | `0x40150000` | UART5 |
| `0x40090000` | ACODEC | `0x40160000` | GPIO0 |
| `0x400A0000` | UART0 | `0x40170000` | GPIO1 |
| `0x400B0000` | UART1 | `0x40180000` | CRU |
| `0x400C0000` | UART2 | `0x50010000` | GRF |
| `0x400D0000` | SAR-ADC | `0x50020000` | PMU |
| `0x400E0000` | TIMER (2 channels) | `0x50030000` | GPIO2 |
| `0x60000000` | DMAC1 (6 channels) | `0x60050000` | SYNTH (MP3) |
| `0x60010000` | IMDCT36 (MP3) | `0x60060000` | SFC (SPI flash) |
| `0x60020000` | SDMMC / SDIO | `0x60070000` | LCDC / VOP |
| `0x60030000` | eMMC | `0x60080000` | USB OTG (256 KiB, to 0x600BFFFF) |
| `0x60040000` | EBC (e-ink) | `0x01060000` / `0x01070000` | HIFIACC / DMAC2 |

Every base the AP30 firmware drives appears as a literal in its code and matches this table [AP30]. The firmware also
references `0x60090000 + 0x0C` from two routines that are never called (a second display DMA target, probably the EBC
[?]) [AP30].

## RAM blocks

| Block | Range | Size | Domain | Clock gates (32 KiB each) | Soft reset | Notes |
|---|---|---|---|---|---|---|
| Boot ROM | `0x00000000-0x00003FFF` | 16 KiB | PD_LOGIC | `hclk_bootrom` (CLKGATE7 bit 9) | `bootrom` (SOFTRST0 bit 10) | executable |
| HIGHRAM0 | `0x01000000-0x0101FFFF` | 128 KiB | PD_HIGH | `hiram0..3` CLKGATE4 bits 0-3, interface bit 8 | `highram0` SOFTRST2 bit 2 | core B's code RAM |
| HIGHRAM1 | `0x01020000-0x0105FFFF` | 256 KiB | PD_HIGH | `hdram0..7` CLKGATE3 bits 0-7, interface bit 8 | `highram1` SOFTRST2 bit 1 | core B's data RAM |
| SYSRAM0 | `0x03000000-0x0304FFFF` | 320 KiB | PD_LOGIC | `iram0..7` CLKGATE7 bits 0-7, interface bit 8 | `sysram0` SOFTRST0 bit 12 | 10 × 32 KiB but 8 gate bits: mapping unknown |
| SYSRAM1 | `0x03050000-0x0308FFFF` | 256 KiB | PD_LOGIC | `dram0..7` CLKGATE6 bits 0-7, interface bit 8 | `sysram1` SOFTRST0 bit 11 | |
| PMU-SRAM | `0x03090000-0x0309FFFF` | 64 KiB | PD_PMU | `pmu_ram0/1` CLKGATE5 bits 7/8, interface bit 6 | — | "for low power sleep mode" |

[TRM ch1.1, ch3.7, ch12.1]

* **Sub-blocks.** Each RAM is made of 8192 × 32-bit (32 KiB) single-port SRAM instances; each 32 KiB clock can be gated
  when unused [TRM ch12.1]. The ch1.1 feature list says "64KB/bank" instead. Whether a gated bank keeps its contents is
  not stated: treat it as lost until tested [TRM; ?]. The stock firmware never gates SYSRAM or PMU-SRAM banks and gates
  all HIGHRAM banks whenever core B is off [AP30].
* **Totals.** Core A has 640 KiB (SYSRAM0 + SYSRAM1 + PMU-SRAM) at all times; HIGHRAM adds 384 KiB only while PD_HIGH
  is powered [TRM ch12.1].
* **Byte, half-word and word** accesses work on every SRAM [TRM ch12.1].
* **HIGHRAM needs PD_HIGH.** It is usable only after the domain is powered, its bus clocks are on and its resets
  released; powering PD_HIGH down loses its contents [TRM ch5.2, ch12.1]. Order: [dual_core.md](dual_core.md).
* **Stock use.** How the stock firmware divides this RAM (stack, section 0 data and code, overlay windows, the core-B
  module areas) is in [architecture.md](../firmware/architecture.md); the loader's own footprint while it loads an
  image (0x0304A000-0x0304FFFF and 0x03088000-0x0308FFFF) is in [boot_loader.md](../firmware/boot_loader.md).

## Power domains

```
  VD_PMU (always on)                     VD_LOGIC (switchable as a whole in low-power mode)
  ┌───────────────────────┐             ┌──────────────────────────────┐ ┌──────────────────────────┐
  │ PD_PMU                │             │ PD_LOGIC                     │ │ PD_HIGH                  │
  │  PMU, GRF, GPIO2,     │             │  core A, SYSRAM0/1, boot ROM,│ │  core B, HIGHRAM0/1,     │
  │  PMU-SRAM             │             │  every other peripheral,     │ │  HIFIACC, DMAC2          │
  │                       │             │  DMAC1, IMDCT36, SYNTH [?]   │ │  (switch: PMU_PWRDN_CON) │
  └───────────────────────┘             └──────────────────────────────┘ └──────────────────────────┘
```

| Voltage domain | Power domain | Contents | Source |
|---|---|---|---|
| VD_PMU | PD_PMU | PMU, GRF, GPIO2, PMU-SRAM | [TRM ch5 table 5-1, ch12 table 12-1] |
| VD_LOGIC | PD_LOGIC | core A, internal SRAM (SYSRAM), ROM, all other peripherals | [TRM table 5-1] |
| VD_LOGIC | PD_HIGH | core B, HIFIACC, HIGHRAM0 and HIGHRAM1, DMAC2 | [TRM table 5-1, ch2.4, ch8.1] |

* **Normal mode:** software powers PD_HIGH on and off with `PMU_PWRDN_CON` (0x5002000C) bit 1 (1 = power down) and
  reads the state in `PMU_PWRDN_ST` (+0x10) bit 1; bit 0 there is the VD_LOGIC state [TRM ch5.3.1, ch5.4].
* **Low-power mode** (`PMU_PWRMODE_CON` bit 0): a hardware sequence that can switch the clock to a slow source, power
  VD_LOGIC down, wait for a wake-up event, wait for the crystal, switch back and power VD_LOGIC up again
  [TRM ch5.3.2]. **Wake-up sources are GPIO2 pins or the GPIO2 interrupt only** [TRM ch5.3.3]. That is why the power
  key (PLAYON) and the power latch (POWERHOLD) sit on GPIO2. Register detail: [soc_peripherals.md](soc_peripherals.md#pmu).
* **Stock use:** the firmware powers PD_HIGH down early in boot and up only for music playback; it never enters the
  low-power mode (only `PMU_PWRDN_CON` and `PMU_SYS_REG3` are ever accessed) [AP30]. See
  [power_management.md](../firmware/power_management.md).
* IMDCT36 and SYNTH serve only core B but are drawn near DMAC1 in the block diagram, i.e. in PD_LOGIC [TRM fig 1-1];
  not tested [?].

## Bus attributes: caches, XIP, bit-banding, memory types

* **No caches.** The Cortex-M3 has none and the TRM mentions none [TRM ch7]. Memory is coherent between the cores; only
  each core's write buffer needs a barrier (`DSB`) before signalling the other core [WEB] Arm.
* **No execute-in-place flash.** The SFC is a command/FIFO/DMA controller with no memory-mapped read window in its
  register list, and eMMC/SD are block devices [TRM ch10, 11, 25]. Every byte of code must be copied into RAM before
  it runs. On the AP30 the boot loader copies only the first three code/data sections of an image; the firmware loads
  everything else itself ([stage3_sections.md](../formats/stage3_sections.md)).
* **All RAM is in the ARMv7-M "Code" region** (below 0x20000000). Instruction fetches use the I-Code bus and data the
  D-Code bus, and both work on every RAM [WEB] Arm; [TRM fig 7-1]. The stock firmware runs code from SYSRAM1 and keeps
  data and stack in SYSRAM0 [AP30].
* **Bit-banding.** The Cortex-M3 has bit-band logic [TRM ch7.1.1], but:
  * the SRAM bit-band window (0x20000000-0x200FFFFF) maps to nothing, because no RAM is there: **no RAM bit-banding**
    [TRM fig 2-1]; [WEB] Arm;
  * the peripheral window (0x40000000-0x400FFFFF) covers only I2S0 … PWM0 (0x40020000-0x400FFFFF), not the mailbox,
    WDT, UART3-5, GPIO0/1, CRU or anything at 0x5000_0000 [TRM fig 2-1]; [WEB] Arm;
  * whether the alias at 0x42000000 is wired is untested; the stock firmware never uses alias addresses [AP30]. CRU and
  GRF registers have per-bit write masks instead ([soc_peripherals.md](soc_peripherals.md#write-mask-convention)).
* **Default memory types** (no MPU programmed) [WEB] Arm ARMv7-M default map:

  | Range | Type | Executable |
  |---|---|---|
  | 0x00000000-0x1FFFFFFF (ROM, all RAM) | Normal | yes |
  | 0x40000000-0x5FFFFFFF (APB, GRF/PMU/GPIO2) | Device | no (XN) |
  | 0x60000000-0x9FFFFFFF (AHB peripherals: DMAC1, SD/eMMC, VOP, USB, SFC, MP3 accelerators) | Normal | yes |
  | 0xE0000000- (System Control Space) | Strongly-ordered | no |

  Because the AHB peripherals at 0x6000_0000 fall in a "Normal" region, writes to them can be buffered: put a `DSB`
  after a register write whose side effect something else depends on (starting a DMA, then sleeping or polling a
  status that another master sets) [WEB] Arm; consequence [?] (no fault seen in the stock code).
* **SRAM wait states.** Each SRAM runs single-cycle up to about 150 MHz. Above that, set its "one more response cycle"
  bit in `GRF_INTER_CON0` before raising the clock (bit table in [Clocks](#sram-response-cycles)) [TRM ch12.3.1].
* **Core B to PD_LOGIC** goes through an AHB-to-AHB asynchronous bridge (`hclk_async_brg`, reset `async_brg`) [TRM fig
  1-1, ch3.7]; such accesses are slower than core B's accesses to HIGHRAM [EM].

## Clocks

### Sources

| Source | Notes | Source |
|---|---|---|
| `xin24m` | the only crystal input, 24 MHz | [TRM ch3.1, ch3.3]; [DS] |
| SoC PLL ("APLL") | one general-purpose PLL, integer or fractional | [TRM ch3.6] |
| USB PHY 480 MHz | can clock core A, core B and some peripherals (`CRU_MODE_CON` bit 4) | [TRM ch3.3, ch3.7] |
| ACODEC PLL | inside the audio codec; feeds the I2S clocks (`CRU_MODE_CON` bit 5); the AP30's audio clock | [TRM ch3.3, ch9]; [AP30] |
| PVTM | ring-oscillator clock for the PMU in low-power mode | [TRM fig 3-3] |

### Clock tree (simplified)

```
 xin24m ─┬─► ÷(n+1), n = MODE_CON[13:8] ──┐  "slow mode"
         └─► PLL ──────────────────────────┴─► MODE_CON[0] ─► PLL_MUX_CLK
                                                                 │
          USB PHY 480M ─┐                                        │
                        ├─(CLKSEL0[3])─► ÷1..8 (CLKSEL0[2:0]) ─► core A clock = hclk_sys_core
                        │                    └► ÷1..8 (CLKSEL0[6:4]) ─► core A SysTick ref (stclk)
                        │                                              └► ÷1,2,4,8 (CLKSEL1[9:8]) ─► pclk_logic (APB)
                        └─(CLKSEL0[15])► ÷1..8 (CLKSEL0[14:12]) ─► core B clock = hclk_cal_core
                                             └► ÷1..8 (CLKSEL0[10:8]) ─► core B SysTick ref
 Peripheral clocks: CLKSEL2..12 choose 24 MHz or PLL_MUX_CLK (some: USB 480M) and a divider;
 I2S0/I2S1 can also use the ACODEC PLL and a fractional divider.
```

[TRM fig 3-2, 3-3, ch3.7]

* **PLL formula** [TRM ch3.6]: integer mode (`dsmpd` = 1): `VCO = 24 MHz / refdiv × fbdiv`,
  `out = VCO / postdiv1 / postdiv2`. Fractional mode adds `frac / 2^24` to `fbdiv`.
* **Reset state** [TRM ch3.7 reset values; our arithmetic]: `CRU_MODE_CON` = 0 (slow mode, crystal ÷ 1),
  `CRU_CLKSEL0` = 0x331 (core A ÷ 2, both SysTick dividers ÷ 4, core B ÷ 1), so core A starts at 12 MHz. The PLL's reset
  programming (`refdiv` 2, `fbdiv` 100, `postdiv1` 4, `postdiv2` 1) would give 300 MHz, but it is not selected.
* **What the boot loader leaves** [AP30 loader]: PLL at 48 MHz (`refdiv` 1, `fbdiv` 32, `postdiv` 4 × 4, VCO 768 MHz),
  APB ÷ 2, a fixed ~1 ms wait instead of a lock poll; the core-A divider is left as found [?]. Full handoff state:
  [startup.md](../firmware/startup.md).
* **Bus clocks:** each core's AHB clock follows its core clock; `pclk_logic` = core A clock ÷ 1/2/4/8 [TRM fig 3-2].
  The watchdog counts `pclk`, so its timeout changes with this divider [TRM ch20].

### PLL and divider registers (CRU base 0x40180000)

| Register | Offset | Fields | Reset |
|---|---|---|---|
| `CRU_APLL_CON0` | 0x00 | 15 bypass, 14:12 postdiv1, 11:0 fbdiv (write mask 31:16) | 0x00004064 |
| `CRU_APLL_CON1` | 0x04 | 15 reset mode (1 = software reset), 14 power-down, 12 `dsmpd` (1 = integer), **10 lock (read-only)**, 8:6 postdiv2, 5:0 refdiv | 0x00001042 |
| `CRU_APLL_CON2` | 0x08 | 27 four-phase PD, 26 VCO-out PD, 25 post-divider PD, 24 DAC PD, 23:0 frac (no write mask) | 0x00000001 |
| `CRU_MODE_CON` | 0x10 | 0: 0 = slow (crystal), 1 = PLL; 4: USB 480 MHz from the PHY; 5: ACODEC PLL in use; 13:8 crystal divider in slow mode (24 MHz / (n+1)) | 0 |
| `CRU_CLKSEL0_CON` | 0x14 | 15 core-B source (0 PLL, 1 USB 480M), 14:12 core-B divider, 10:8 core-B SysTick divider, 6:4 core-A SysTick divider, 3 core-A source, 2:0 core-A divider; all `clk = src / (n+1)` | 0x00000331 |
| `CRU_CLKSEL1_CON` | 0x18 | 9:8 APB divider (1, 2, 4, 8) | 0x00000100 |
| `CRU_CLKSEL2..12_CON` | 0x1C-0x44 | per-peripheral source and divider: 2 timers, 3 I2S1, 4 I2S0, 5 EBC, 6 SAR-ADC (from 24 MHz, ÷1..256), 7 SDMMC/eMMC, 8 SPI0/1, 9 UART0/1, 10 UART2/SFC, 11 UART3/test-out, 12 UART4/5 | |
| `CRU_CLK_FRACDIV_CON0/1` | 0x50/0x54 | I2S0 / I2S1 fractional dividers (ratio must exceed 20) | 0x0BB8EA60 |
| `CRU_STCLK_CON0/1` | 0xE0/0xE4 | "stick clk counter", 24 bits, one per core; meaning not described | 1 |

[TRM ch3.7] Gates and soft resets: [soc_peripherals.md](soc_peripherals.md#cru).

### Clock-change rules

1. **Slow mode first.** "When power on or changing PLL setting, we must force PLL into slow mode": switch `MODE_CON`
   bit 0 to the crystal before reprogramming [TRM ch3.5].
2. **Glitches.** Entering or leaving bypass, changing a post-divider, or asserting power-down can glitch the PLL
   output [TRM ch3.6]. Do these only while running from the crystal.
3. **Lock bit.** After releasing power-down, wait for `APLL_CON1` bit 10 (lock) before switching back to the PLL
   [TRM ch3.7]. Use a timeout. The stock firmware polls it; the boot loader only waits ~1 ms [AP30].
4. **Short delays after CRU writes.** Without a short delay between the divider writes and the final `MODE_CON` write,
   the mode write can be lost and the core stays at 24 MHz ÷ 2 [EM, verified on an Echo Mini].
5. **SRAM response cycles before speed-up** (next section): set before raising a clock, clear only after lowering it.
6. **Everything derived from the PLL changes with it:** SysTick period, watchdog timeout (pclk), UART baud divisors on
   PLL clocks, SD/eMMC card clocks, the VOP's i8080 timing and core B's idea of time. The TIMER on 24 MHz does not.
7. **Fractional dividers** (I2S) give usable output only for low frequencies with a ratio above 20 [TRM ch3.5].

Stock sequence in words [AP30 section 0 at 0x030520B8]: crystal mode, core dividers to 1, APB ÷ 2; PLL into software
reset and power-down, integer mode, new `fbdiv`/`postdiv1` and `refdiv`/`postdiv2`; set the response-cycle bits for
the new speed; release power-down and poll lock; write `CLKSEL0`, then `CLKSEL1`, with a short delay after each; switch
`MODE_CON` to the PLL. Targets at or below 24 MHz stay on the crystal with the `MODE_CON` divider (down to 375 kHz).

### SRAM response cycles

`GRF_INTER_CON0` (0x500100C4, write mask in bits 31:16) [TRM ch4, ch12.3.1]:

| Bit | Name | RAM |
|---|---|---|
| 15 | `caldram_resp_cycle` | HIGHRAM1 (core-B data RAM) |
| 14 | `caliram_resp_cycle` | HIGHRAM0 (core-B code RAM) |
| 13 | `sysdram_resp_cycle` | SYSRAM1 |
| 12 | `sysiram_resp_cycle` | SYSRAM0 |
| 6 | `pmu_resp_cycle` | PMU-SRAM |
| 5 | `btrom_resp_cycle` | boot ROM |

* The TRM says each SRAM is good for "about 150 MHz by default" and to enable the extra cycle "when SRAM works at the
  frequency of about 300 MHz" [TRM ch12.3.1]: the threshold between the two is not stated.
* The stock firmware sets bits 12, 13 and 6 together when core A runs at ≥ 180 MHz, and bits 14/15 when core B runs at
  ≥ 300 MHz, before raising the clock [AP30].
* On the Echo Mini, core A writes into HIGHRAM1 caused random imprecise bus faults with core B at 200 MHz and
  single-cycle HIGHRAM; multi-cycle mode stopped them [EM]. Treat the extra cycle as required above ~150 MHz.

### Stock clock policy (summary)

The stock firmware keeps a table of clock requirements per "module" (base system, UI, pictures, library rebuild, file
work, USB, and one entry per decoding profile), adds up the requirements of all active modules and clamps the result:
floors 96 MHz, caps PLL 450 MHz, core A 200 MHz, core-A bus 200 MHz, APB 75 MHz, core B 450 MHz [AP30 table at
0x0307DF10]. With only the boot modules active it runs PLL 200 MHz, core A 200 MHz, APB 50 MHz (the same values the
RECHO firmware reads back on an Echo Mini) [AP30; EM]. Before a change it parks core B through the mailbox and suspends
DMAC1 channels 0-4 (the I2S feed keeps running: audio clocks come from the ACODEC PLL) [AP30]. Details:
[power_management.md](../firmware/power_management.md); the core-B hold handshake:
[core_b_codecs.md](../firmware/core_b_codecs.md).

## Interrupts

* **41 external lines (IRQ 0-40), all active-high level, not configurable** [TRM ch2.3 table 2-1]. Edge behaviour
  exists only inside the GPIO block. Clear the source in the peripheral before returning, or the handler re-enters.
* **Each core has its own NVIC.** Vector number = 16 + IRQ. The mailbox has four lines into each core: the line a core
  receives is for the direction towards it, and both cores use IRQ 9-12 for channels 0-3 [TRM ch1.1; AP30].
* **Priorities:** 5 bits implemented (values 0x00, 0x08, … 0xF8). The stock firmware uses PRIGROUP 5
  (AIRCR = 0x05FA0500): the top two implemented bits pre-empt (4 levels: 0x00-0x38, 0x40-0x78, 0x80-0xB8,
  0xC0-0xF8), the other three are sub-priority [AP30]; [WEB] Arm.
* **Vector table:** 16 system entries + 41 = **57 entries = 228 bytes**. VTOR needs the table aligned to the next
  power of two of its size, so **256-byte alignment** [WEB] Arm ARMv7-M. All RAM is in the Code region, so VTOR can
  point at any RAM.
* **TRM ch7.1.1 says "20 External interrupts"**, which contradicts table 2-1, the 57-entry stock vector tables and core
  B's use of IRQ 40 [TRM vs AP30]. Whether every line reaches both NVICs is not documented (see [Open
  questions](#open-questions)).

| IRQ | Vector | Source | Stock core A | Stock core B | Stock prio |
|---|---|---|---|---|---|
| 0 | 0x10 | SFC | — | — | 0x90 |
| 1 | 0x11 | SYNTH (MP3) | — | MP3 module | 0x80 |
| 2 | 0x12 | EBC (e-ink) | — | — | 0xB8 |
| 3 | 0x13 | eMMC | storage driver | — | 0x40 |
| 4 | 0x14 | SDMMC | storage driver | — | 0x40 |
| 5 | 0x15 | USB OTG | USB stack | — | 0x80 |
| 6 | 0x16 | DMAC1 | DMA completion | — | **0x00** |
| 7 | 0x17 | IMDCT36 (MP3) | — | MP3 module | 0x48 |
| 8 | 0x18 | WDT | pre-reset warning (spins until the reset) | — | **0x00** |
| 9 | 0x19 | mailbox channel 0 | core B ready / clock-change ack | clock-change hold | 0xC0 |
| 10 | 0x1A | mailbox channel 1 | decoder status (playback engine) | decoder control | 0xC0 |
| 11 | 0x1B | mailbox channel 2 | file service (playback engine) | file replies | 0x80 |
| 12 | 0x1C | mailbox channel 3 | core-B debug text | print done | 0xC0 |
| 13-15 | 0x1D-0x1F | reserved | — | — | 0xA0-0xB0 |
| 16 | 0x20 | PWM1 | — | — | 0xB8 |
| 17 | 0x21 | PWM0 | — | — | 0x50 |
| 18 | 0x22 | TIMER channel 1 | — | — | 0xF8 |
| 19 | 0x23 | TIMER channel 0 | key-scan tick | — | 0xF8 |
| 20 | 0x24 | SAR-ADC | conversion done | — | 0xC0 |
| 21 | 0x25 | UART5 | common UART handler | — | 0xF8 |
| 22 | 0x26 | UART4 | common UART handler | — | 0xF8 |
| 23 | 0x27 | UART3 | common UART handler | — | 0xB8 |
| 24 | 0x28 | UART2 | common UART handler | — | 0xF8 |
| 25 | 0x29 | UART1 | common UART handler (Bluetooth link) | — | 0x78 |
| 26 | 0x2A | UART0 | common UART handler | — | 0xB8 |
| 27 | 0x2B | SPI1 | — | — | 0xB8 |
| 28 | 0x2C | SPI0 | — | — | 0xB8 |
| 29 | 0x2D | I2C2 | common I2C handler | — | 0xB8 |
| 30 | 0x2E | I2C1 | common I2C handler | — | 0xB8 |
| 31 | 0x2F | I2C0 | common I2C handler | — | 0xB8 |
| 32 | 0x30 | I2S1 | — | — | 0xB8 |
| 33 | 0x31 | I2S0 | — | — | 0xB8 |
| 34 | 0x32 | HIFIACC | — | not registered (completion seen through DMAC2 and polling) | 0xF8 |
| 35 | 0x33 | PMU | — | — | 0xF8 |
| 36 | 0x34 | GPIO2 | per-pin dispatcher | — | 0xF8 |
| 37 | 0x35 | GPIO1 | — | — | 0xF8 |
| 38 | 0x36 | GPIO0 | — | — | 0xF8 |
| 39 | 0x37 | LCDC / VOP | — | — | 0xF8 |
| 40 | 0x38 | DMAC2 | — | FLAC, ALAC, APE modules | 0xF8 |

Sources: [TRM table 2-1] for the line list; [AP30] for stock use (every interrupt registration in core A and in the
core-B modules) and for the core-A priority table at 0x03082B84.

System exceptions in the stock core-A firmware: MemManage, BusFault and UsageFault enabled at priority 0; SVCall and
DebugMonitor 0xF8 (unused); **SysTick 0x88** (10 ms tick); **PendSV 0xC0, set to 0xE0** by the playback engine (deferred
audio buffer work) [AP30]. The priority table stores 0x3FF8 for "lowest": only the low byte 0xF8 lands and the excess is
overwritten by the next entry; harmless [AP30]. Every unregistered vector goes to a crash handler that selects ROM at 0,
prints PC, LR, MSP and PSP on UART1 and hangs until the watchdog or the 8 s power-key reset [AP30]. How the stock OS layer
uses SysTick, PendSV and its software timers: [architecture.md](../firmware/architecture.md).

## Boot ROM and boot sources

* The 16 KiB MaskROM at 0x00000000 can boot from an SD card, eMMC, SPI NAND/NOR, or fall back to USB download
  [TRM ch2.2].
* On the AP30 it reads Rockchip's IDB (boot loader) from the hidden area of the internal flash; the IDB is stored as
  five identical RC4-scrambled copies 1024 sectors apart [AP30]. The word at ROM 0x8C is the ROM's USB-boot entry
  point; the stock firmware jumps through it to reach MaskROM USB mode [AP30].
* Before the loader overwrites 0x03050000 it saves the three words the ROM left there to 0x03088000; the first one is
  compared with 0x30 (= 48, the loader's PLL MHz value) [AP30]; [EM] says the ROM path stores the CPU frequency there.
  The meaning of the other two words is unknown.

The boot loader, its markers, its button check and the FW1/FW2 choice: [boot_loader.md](../firmware/boot_loader.md).
The flash layout: [idb_and_flash_layout.md](../formats/idb_and_flash_layout.md). Recovery:
[recovery.md](../guides/recovery.md).

## Resets and what survives them

### Reset sources

| Source | Scope | Notes |
|---|---|---|
| NPOR (power-on reset pin) | whole chip; the reset is held until the PLL locks, then 256 more cycles | [TRM ch3.4, fig 3-5] |
| ~8 s power-key long press (AP30 board) | power-on class: clears `PMU_SYS_REG3` | external circuit, fires ~8 s after Power is pressed and repeats about every 10.5 s while held [AP30, measured on a device]; see [power.md](power.md) |
| Watchdog (`soc_wdt_rstn`) | system reset | what it preserves: unknown |
| Per-module soft resets | one block each, `CRU_SOFTRSTn_CON` bits (1 = held in reset), write-masked | [TRM ch3.7] |
| Global soft reset | write 0xFDB9 to `CRU_GLB_SRST_FST_VALUE` (CRU +0xF4); self-clearing; resets **all logic except the GRF and the GPIOs**; `CRU_GLB_CNT_TH` (+0xF8) sets a wait count | [TRM ch3.4, ch3.7]; never used by the stock firmware [AP30] |
| `SYSRESETREQ` (AIRCR = 0x05FA0007) | re-runs boot ROM and loader; `PMU_SYS_REG3` survives | [AP30, device behaviour of the loader markers]; which blocks it resets: unknown |

### What survives

| Reset | `PMU_SYS_REG0-3` | PMU-SRAM | SYSRAM / HIGHRAM | Source |
|---|---|---|---|---|
| Power cut, ~8 s long press | cleared | lost [?] | lost [?] | [AP30, measured: a loader marker is gone after the long press] |
| `SYSRESETREQ` | kept | kept [EM: a log ring survives a reset on the Echo Mini] | not cleared by hardware [?]; the loader then overwrites its own areas and the loaded sections | [AP30, measured: loader markers survive a soft reset] |
| Watchdog reset | unknown | unknown | unknown | — |
| Global soft reset | unknown (the TRM only promises GRF and GPIOs are kept) | unknown | unknown | [TRM ch3.4] |

* `PMU_SYS_REG3` (0x5002004C) carries the boot loader's protocol: the low half is a boot marker written as
  `0xFFFF0000 | value` (0x18AF loader USB mode, 0x18BF MaskROM USB, 0x18CF booted from FW2 / keep FW2, 0x18DF booted
  from FW1, 0x18EF one extra loader-mode boot) [AP30]. Leave it to that protocol;
  [boot_loader.md](../firmware/boot_loader.md) has the details.
* `PMU_SYS_REG0-2` are presumably kept the same way [?].
* Just before it resets, the stock reboot path writes the 16-byte text `NanoCRebootFlag` at 0x0309FFF0 (top of
  PMU-SRAM); who reads it is unknown [AP30].
* The stock reboot path ungates every clock, releases every soft reset and returns every pin mux and pull to its
  default before requesting `SYSRESETREQ`, which suggests the request does not reset those blocks itself [AP30;
  inference ?].
* Core B is held in reset again after any chip-level reset (`SOFTRST3` bit 2 resets to 1) [TRM ch3.7].

## The MPU question

**Unknown; assume absent.**

* **Documents:** neither the TRM nor either datasheet mentions a Memory Protection Unit. The CPU feature lists (TRM
  ch1.1, ch7.1.1) name Thumb, banked SP, divide, NVIC, bit-band and debug, and no MPU [TRM; DS]. Arm makes the Cortex-M3
  MPU an implementation option, so its absence from a feature list proves nothing [WEB] Arm.
* **Firmware:** no code in the AP30 image (core A, all core-B modules, the boot loader) touches the MPU registers
  (0xE000ED90-0xE000EDB8), and no such address appears as a literal anywhere [AP30]. `CONTROL` is written only by an
  unreferenced helper group; there is no SVC use. **Stock code always runs privileged, in thread mode on the main
  stack** [AP30].
* The stock boot enables the MemManage fault; that is not evidence of an MPU, because MemManage also reports
  execute-never violations on a core without one [AP30]; [WEB] Arm.
* **No other protection:** no bus firewall, no TrustZone (ARMv7-M has none), no per-master filtering, no per-core
  peripheral enables. Core B can write the CRU, GRF and PMU (the stock core-B modules do) [TRM ch2.1, ch4, ch5; AP30].
  Consequences: [dual_core.md](dual_core.md#isolation).
* **How to check:** run a few instructions on each core that read `MPU_TYPE` at 0xE000ED90. Bits 15:8 (`DREGION`) give
  the number of regions: 0 = no MPU, 8 = MPU present. The same probe can read `CPUID` (0xE000ED00, the core revision)
  and `ICTR` (0xE000E004, the number of implemented interrupt lines), and write 0xFF to one NVIC priority byte and read
  it back (0xF8 expected for 5 bits). The probe itself needs no write to storage, but getting it onto the player
  means installing a custom image.

> **Warning:** installing any custom image writes the firmware slots. Follow
> [installing_firmware.md](../guides/installing_firmware.md), have the loader-mode recovery path of
> [recovery.md](../guides/recovery.md) working (USB cable in, D-pad Right + Power) and a full backup
> ([backup.md](../guides/backup.md)) before you start. Never write the IDB area (flash sectors 0-0x1FFF), never run
> `rkdeveloptool ef`, never download a random loader (`db`/`ul`).

## Debug ports

| Port | Core | Pins (LFBGA121) | Mux value | Source |
|---|---|---|---|---|
| JTAG0 / SWD | core A | TCK = GPIO2_15 (A4), TMS = GPIO2_14 (B3); TDI = GPIO2_4, TDO = GPIO2_5, TRST = GPIO2_6 | 2 (`GRF_GPIO2B_IOMUX` bits 15:14 and 13:12 = 0b10) | [TRM ch6.5 table 6-1]; [DS] |
| JTAG1 / SWD | core B | TCK = GPIO2_13 (C1), TMS = GPIO2_12 (C2); TDI/TDO/TRST on GPIO0_8/9/10 (eMMC D5-D7) | 2 (`GRF_GPIO2B_IOMUX` bits 11:10 and 9:8) | [TRM ch6.5 table 6-2]; [DS] |

* Each core has an SWJ-DP (JTAG or SWD) with an AHB-AP; invasive debug with the core halted [TRM ch6.1, ch6.3].
* `GRF_INTER_CON0` bit 0 (`force_jtag`) resets to 1, which connects JTAG0 to its pads regardless of the iomux; the
  stock firmware clears it early in boot [TRM ch4; AP30]. The boot loader does not touch it [AP30].
* On Rockchip's reference board both ports are brought out as 4-pin SWD headers (JTAG0 = core A, JTAG1 = core B)
  [WEB] Rockchip EVK documents.
* **On the AP30** these pins are taken: GPIO2_15 is the LCD reset, GPIO2_4/5/6 are backlight, power key and power hold,
  and GPIO2_12/13 carry the DAC's I2C bus [AP30]. See [board_ap30.md](board_ap30.md).

## Electrical limits

From [DS] datasheet V1.8 ch3:

| Parameter | Min | Typ | Max |
|---|---|---|---|
| Core logic supply | 1.08 V | 1.2 V | 1.32 V (absolute max 1.32 V) |
| GPIO supply (3.3 V / 1.8 V) | 2.97 / 1.62 V | 3.3 / 1.8 V | 3.6 / 1.98 V |
| SAR-ADC, USB, ACODEC analog supply | 2.97 V | 3.3 V | 3.63 V |
| SAR-ADC input | | | 2.75 V absolute |
| USB DP/DM/VBUS input | | | 5 V absolute |
| Crystal | | 24 MHz | |
| Ambient temperature | −10 °C | 25 °C | 85 °C ("the reference software will limit the chipset temperature about 85 °C") |
| GPIO levels (3.3 V) | Vil ≤ 0.8 V, Vih ≥ 2 V, Vol ≤ 0.4 V, Voh ≥ 2.4 V | | |

## Pin-mux table (LFBGA121)

* All 56 GPIOs bonded on the LFBGA121 package: GPIO0_A0-D1 (26), GPIO1_A0-B3 (12), GPIO2_A0-C1 (18) [DS].
  The QFN68 table lists only 35 of them [DS].
* **Naming:** the datasheet writes `GPIO2_B6`; the stock firmware numbers pins `bank_n` with n = 8 × port + bit
  (A = 0, B = 1, C = 2, D = 3), so GPIO2_B6 = GPIO2_14 [AP30]. This collection uses the firmware form, with the
  datasheet form where it helps.
* **Mux register:** `GRF_GPIO<bank><port>_IOMUX` at GRF + 0x20 × bank + 4 × port, 2 bits per pin (pin bit b → bits
  2b+1:2b), write mask in bits 31:16. Value 0 = GPIO, 1-3 = the functions below (columns "Mux 1-3") [TRM ch4].
* **Pull register:** `GRF_GPIO<bank><port>_PULL` at GRF + 0x20 × bank + 0x10 + 4 × port, one bit per pin:
  **0 = pull enabled** in the pad's fixed direction (column "Pull"), 1 = no pull; write mask bits 23:16 [TRM ch4];
  [DS].
* **Pin groups:** where a function exists on several pin sets (I2C0 A/B/C, UART1 A/B …) the group is chosen in
  `GRF_IOMUX_CON` ([soc_peripherals.md](soc_peripherals.md#grf)) in addition to the pin mux.
* All GPIOs are inputs after a power-on reset [TRM ch1.1].
* GPIO2 is in the always-on domain; GPIO0/1 are in PD_LOGIC.

| Pin | Datasheet | Ball | Mux 1 | Mux 2 | Mux 3 | Pull |
|---|---|---|---|---|---|---|
| GPIO0_0 | GPIO0_A0 | H10 | EMMC_PWREN | I2S1B_CLK | | down |
| GPIO0_1 | GPIO0_A1 | G11 | EMMC_CLK | I2S1B_LRCK | UART2C_TX | down |
| GPIO0_2 | GPIO0_A2 | G10 | EMMC_CMD | I2S1B_SCLK | UART2C_RX | up |
| GPIO0_3 | GPIO0_A3 | F10 | EMMC_D0 | I2S1B_SDO | UART2C_CTS | up |
| GPIO0_4 | GPIO0_A4 | F11 | EMMC_D1 | I2S1B_SDI | UART2C_RTS | up |
| GPIO0_5 | GPIO0_A5 | D9 | EMMC_D2 | SFC_D3 | I2C0C_SDA | up |
| GPIO0_6 | GPIO0_A6 | E10 | EMMC_D3 | SFC_D2 | I2C0C_SCL | up |
| GPIO0_7 | GPIO0_A7 | C10 | EMMC_D4 | SFC_D1 | | up |
| GPIO0_8 | GPIO0_B0 | D10 | EMMC_D5 | SFC_D0 | JTG1_TDI | up |
| GPIO0_9 | GPIO0_B1 | D11 | EMMC_D6 | SFC_CLK | JTG1_TDO | up |
| GPIO0_10 | GPIO0_B2 | E11 | EMMC_D7 | SFC_CS | JTG1_TRST | up |
| GPIO0_11 | GPIO0_B3 | B6 | UART2A_RTS | I2S0_SDI | EBC_VCOM | up |
| GPIO0_12 | GPIO0_B4 | C6 | UART2A_CTS | I2S0_SDO | EBC_SDCLK | up |
| GPIO0_13 | GPIO0_B5 | B7 | UART2A_RX | I2S0_SCLK | EBC_GDCLK | up |
| GPIO0_14 | GPIO0_B6 | A7 | UART2A_TX | I2S0_LRCK | EBC_GDSP | up |
| GPIO0_15 | GPIO0_B7 | B8 | LCD_CSN | I2S0_CLK | EBC_GDOE | up |
| GPIO0_16 | GPIO0_C0 | A11 | LCD_D0 | SPI0A_TX | EBC_SDDO0 | up |
| GPIO0_17 | GPIO0_C1 | A10 | LCD_D1 | SPI0A_RX | EBC_SDDO1 | up |
| GPIO0_18 | GPIO0_C2 | B11 | LCD_D2 | SPI0A_CLK | EBC_SDDO2 | up |
| GPIO0_19 | GPIO0_C3 | C11 | LCD_D3 | SPI0A_CS | EBC_SDDO3 | up |
| GPIO0_20 | GPIO0_C4 | A9 | LCD_D4 | UART2B_RX | EBC_SDDO4 | up |
| GPIO0_21 | GPIO0_C5 | B10 | LCD_D5 | UART2B_TX | EBC_SDDO5 | up |
| GPIO0_22 | GPIO0_C6 | C9 | LCD_D6 | UART2B_RTS | EBC_SDDO6 | up |
| GPIO0_23 | GPIO0_C7 | A8 | LCD_D7 | UART2B_CTS | EBC_SDDO7 | up |
| GPIO0_24 | GPIO0_D0 | B9 | LCD_WRN | I2C2B_SCL | EBC_SDLE | up |
| GPIO0_25 | GPIO0_D1 | C8 | LCD_RS | I2C2B_SDA | EBC_SDOE | up |
| GPIO1_0 | GPIO1_A0 | G1 | I2S1A_CLK | EBC_GDRL | | down |
| GPIO1_1 | GPIO1_A1 | J3 | I2S1A_LRCK | UART1B_RX | EBC_SDSHR | down |
| GPIO1_2 | GPIO1_A2 | H1 | I2S1A_SCLK | UART1B_TX | EBC_SDCE2 | down |
| GPIO1_3 | GPIO1_A3 | J2 | I2S1A_SDO | UART1B_CTS | EBC_SDCE1 | down |
| GPIO1_4 | GPIO1_A4 | J1 | I2S1A_SDI | UART1B_RTS | EBC_SDCE4 | down |
| GPIO1_5 | GPIO1_A5 | E4 | SDMMC_CMD | SPI1A_CS | UART3_TX | up |
| GPIO1_6 | GPIO1_A6 | F4 | SDMMC_CLK | SPI1A_CLK | UART3_RX | up |
| GPIO1_7 | GPIO1_A7 | G3 | SDMMC_D0 | SPI1A_RX | UART4_TX | up |
| GPIO1_8 | GPIO1_B0 | F2 | SDMMC_D1 | SPI1A_TX | UART4_RX | up |
| GPIO1_9 | GPIO1_B1 | F3 | SDMMC_D2 | I2C1B_SCL | UART5_TX | up |
| GPIO1_10 | GPIO1_B2 | G2 | SDMMC_D3 | I2C1B_SDA | UART5_RX | up |
| GPIO1_11 | GPIO1_B3 | H11 | EMMC_RSTN | | | down |
| GPIO2_0 | GPIO2_A0 | B5 | PWM4 | I2C2A_SDA | EBC_GDPWR0 | up |
| GPIO2_1 | GPIO2_A1 | A5 | PWM3 | I2C2A_SCL | EBC_SDCE0 | up |
| GPIO2_2 | GPIO2_A2 | B4 | PWM2 | EBC_GDPWR2 | PMU_ST3 | down |
| GPIO2_3 | GPIO2_A3 | B1 | PWM1 | CLK_OBS | EBC_GDPWR1 | up |
| GPIO2_4 | GPIO2_A4 | A3 | PWM0 | JTG0_TDI | PMU_ST2 | down |
| GPIO2_5 | GPIO2_A5 | A2 | I2C2C_SCL | JTG0_TDO | PLAYON | down |
| GPIO2_6 | GPIO2_A6 | A1 | I2C2C_SDA | JTG0_TRST | POWERHOLD | down |
| GPIO2_7 | GPIO2_A7 | C3 | PMU_IDLE | | | down |
| GPIO2_8 | GPIO2_B0 | A6 | I2C1A_SDA | SPI0B_CS | EBC_SDCE3 | up |
| GPIO2_9 | GPIO2_B1 | C5 | I2C1A_SCL | SPI0B_CLK | EBC_BORDER1 | up |
| GPIO2_10 | GPIO2_B2 | D5 | I2C0A_SCL | SPI0B_TX | EBC_SDCE5 | up |
| GPIO2_11 | GPIO2_B3 | E5 | I2C0A_SDA | SPI0B_RX | EBC_BORDER0 | up |
| GPIO2_12 | GPIO2_B4 | C2 | UART0A_RX | JTG1_TMS | I2C1C_SDA | up |
| GPIO2_13 | GPIO2_B5 | C1 | UART0A_TX | JTG1_TCK | I2C1C_SCL | up |
| GPIO2_14 | GPIO2_B6 | B3 | UART1A_RTS | JTG0_TMS | SPI1B_CS | up |
| GPIO2_15 | GPIO2_B7 | A4 | UART1A_CTS | JTG0_TCK | SPI1B_RX | up |
| GPIO2_16 | GPIO2_C0 | D2 | UART1A_TX | I2C0B_SDA | SPI1B_CLK | up |
| GPIO2_17 | GPIO2_C1 | D3 | UART1A_RX | I2C0B_SCL | SPI1B_TX | up |

[DS] RKNanoD datasheet V0.1 / V1.8 pin tables. The mux-value numbering (column order = values 1, 2, 3) is consistent
with the TRM's JTAG tables (JTAG = value 2) and with the boot loader setting UART1A_TX as value 1 [TRM ch6.5; AP30].
UART0 has a second route (UART0B) on the USB D−/D+ pads through the USB PHY bypass, not through this table
([soc_peripherals.md](soc_peripherals.md#usb-otg)). What each pin does on the AP30: [board_ap30.md](board_ap30.md).

## Contradictions in the Rockchip documents

Collected here so nobody trips over them twice [TRM unless named]:

| Topic | One place says | Another place says | What to trust |
|---|---|---|---|
| Remap bit | `GRF_SOC_CON0[8]` (ch2.1) | `GRF_INTER_CON0` bit 8 (ch4) | ch4; the firmware writes it there [AP30] |
| Number of interrupts | "20 External interrupts" (ch7.1.1) | 41 lines (table 2-1) | table 2-1 [AP30] |
| RAM gate granularity | "64KB/bank" (ch1.1) | 32 KiB sub-blocks (ch12.1) | ch12.1 |
| SYSRAM gate names | fig 3-3 labels gates `G6_x` as "hclk_sysram0" | register table: CLKGATE6 = `dram0-7` (SYSRAM1), CLKGATE7 = `iram0-7` (SYSRAM0) | register table [?]; untested |
| SRAM extra-cycle threshold | "maximum about 150 MHz by default" | enable "at about 300 MHz" (same paragraph) | set it above ~150 MHz [EM] |
| Timer mode bit | §18.3.2: 1 = free-running | register table: 0 = free-running | register table; stock leaves it 0 and gets a periodic tick [AP30] |
| UART0/UART2 DMA requests | "5 and 6" (ch2.4 prose) | 8 and 9 (table 2-2) | table [?] |
| IMDCT36 / SYNTH addresses | 0x6204_2000 / 0x6204_4000 (ch27-28 figures) | 0x60010000 / 0x60050000 (fig 2-1) | fig 2-1; the firmware uses it [AP30] |
| SAR-ADC rate | "200 kHz" (datasheet) | 100 kS/s at 1 MHz (TRM ch17) | TRM |
| ADC reference power-down reset value | bit 0 resets to 1 (ch4 detail) | GRF summary reset value 0x18 (bit 0 = 0) | unknown [?] |
| Core clock limits | 200 / 400 MHz (SDK guide) | 250 / 500 MHz (EVK guide) | neither measured; stock caps 200 / 450 MHz [AP30] |
| PMU-SRAM size | "256KB" (block diagram label, EVK guide figure) | 64 KiB (everywhere else) | 64 KiB |
| USB OTG DMA | "AHB slave only, no internal DMA" (ch14.1.1) | "internal DMA logic" (ch14.2.1) | untested; the stock driver copies by CPU [AP30] |

## Open questions

1. **MPU present on either core?** Never probed. See [The MPU question](#the-mpu-question).
2. **Core revision and line count:** `CPUID` and `ICTR` have not been read on a device; the 5-bit priority claim is
   backed only by the firmware's priority values.
3. **Interrupt routing:** does every one of the 41 lines reach both NVICs (could core A take DMAC2's IRQ 40, could core
   B take DMAC1's IRQ 6)? Not documented.
4. **Reset semantics:** what a watchdog reset, the global soft reset and `SYSRESETREQ` each reset, and whether
   `PMU_SYS_REG0-2` and PMU-SRAM survive them.
5. **Boot-ROM handoff words** at 0x03050000 (saved by the loader to 0x03088000): only the first one (a MHz value) is
   understood.
6. **SYSRAM0 gating map:** 8 gate bits for ten 32 KiB sub-blocks; and whether a gated bank keeps its data.
7. **Peripheral bit-band alias** (0x42000000): wired or not.
8. **Safe maximum clocks** for core A and core B (200 vs 250 MHz, 400/450/500 MHz) and the exact SRAM extra-cycle
   threshold.
9. **`CRU_STCLK_CON0/1`:** what the "stick clk counter" does, and whether SysTick's external reference is usable.
10. **`noc_remap` = 1:** what it is for (PMU low-power wake-up is the likely use [?]).
11. **Reserved bits the stock firmware sets:** CLKGATE0 bits 5 and 9, SOFTRST3 bit 4 are set at boot although the TRM
    marks them reserved [AP30]; probably SDK defaults.
12. **PMU low-power mode:** never used by the stock firmware; untested.

## Sources

* [TRM] Rockchip RKNanoD Technical Reference Manual V1.0 (2015):
  <https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf>. Chapters used: 1 (features, block diagram), 2 (address map,
  boot, interrupts, DMA requests), 3 (CRU), 4 (GRF), 5 (PMU), 6 (debug), 7 (CPU), 12 (SRAM), 17-21, 26-28.
* [DS] RKNanoD datasheet V1.8 (2022): <https://rockchip.fr/RKNanoD%20datasheet%20V1.8.pdf>; V0.1 (2015):
  <https://rockchip.fr/RKNanoD%20datasheet%20V0.1.pdf> (pin tables, packages, electrical limits).
* [WEB] Arm: *Cortex-M3 Technical Reference Manual r2p0* (DDI0337H), <https://developer.arm.com/documentation/ddi0337/h>;
  *ARMv7-M Architecture Reference Manual* (DDI0403), <https://developer.arm.com/documentation/ddi0403/latest>
  (default memory map, bit-banding, VTOR alignment, exclusive monitors, MPU option).
* [WEB] Rockchip RKNanoD EVK hardware guide and SDK guide, as found in public SDK repositories (clock limits, SWD
  headers); see [sources.md](../overview/sources.md).
* [EM] Snowsky Echo Mini study `ETUDE.md` in [berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw)
  (MIT): clock-change delay, HIGHRAM bus faults, PMU-SRAM retention, ROM handoff word.
* [AP30] analysis of firmware V1.7.8 (vector tables, priority table, clock manager, reset trampoline, reboot path,
  crash handler, interrupt registrations), of the AP30 boot loader, and observations measured on a device (power-key
  reset timing, marker survival). Chip marking read on an opened unit.
