# RKNanoD peripherals: register-level notes

Status: draft, 2026-11

Per-peripheral notes for the Rockchip RKNanoD: base address, what the block is for, the registers and bits that matter,
quirks and document errors, and one line on what the AP30's stock firmware does with it (with a link to the firmware
page that explains it). The memory map, power domains, clock tree, interrupt table and pin-mux table are in
[soc_rknanod.md](soc_rknanod.md); the second core, the mailbox and the accelerators in depth in
[dual_core.md](dual_core.md). Register names follow the TRM; offsets are from the block's base.

Most blocks are licensed Synopsys DesignWare IP (UART, SPI, GPIO, WDT, DMAC, SD/MMC host, USB OTG); where the TRM is
thin, the public DesignWare-based Linux drivers describe the same registers [?: IP identification from the register
layouts].

## Contents

- [Conventions](#conventions) · [Write-mask convention](#write-mask-convention)
- System: [CRU](#cru) · [GRF](#grf) · [PMU](#pmu)
- Timing: [TIMER](#timer) · [WDT](#wdt) · [SysTick](#systick)
- I/O: [GPIO](#gpio) · [SAR-ADC](#sar-adc) · [PWM](#pwm)
- Data movement: [DMAC1 and DMAC2](#dmac1-and-dmac2)
- Serial: [I2C](#i2c) · [I2S](#i2s) · [UART](#uart) · [SPI](#spi)
- Storage: [SD/MMC hosts](#sdmmc-hosts) · [SFC](#sfc)
- Display: [VOP](#vop) · [EBC](#ebc)
- [USB OTG](#usb-otg) · [ACODEC](#acodec) · [Mailbox](#mailbox) · [Accelerators](#accelerators) · [PVTM](#pvtm)
- [Open questions](#open-questions) · [Sources](#sources)

## Conventions

* "Gate id" / "reset id" = the stock firmware's numbering of CRU bits: `id = register index × 16 + bit`, with gates in
  `CRU_CLKGATEn_CON` and resets in `CRU_SOFTRSTn_CON` [AP30]. A gate bit set to 1 stops the clock; a reset bit set to 1
  holds the block in reset [TRM ch3.7]. The same id names different things in the two register families (id 0x32 is
  gate `hdram2` but reset `cal_core`).
* IRQ = NVIC line number (vector = 16 + IRQ).
* "Stock" = the AP30 firmware V1.7.8 [AP30].

## Write-mask convention

Every CRU and GRF control register (except `CRU_APLL_CON2`) and the PMU's `PMU_SOFT_CON` carry a **per-bit write
enable in bits 31:16**: a write changes bit *n* only if bit *n*+16 is also 1 [TRM ch3.7, ch4, ch5.4].

| To do | Write |
|---|---|
| set bit 3 | `0x00080008` |
| clear bit 3 | `0x00080000` |
| set a 2-bit field at bits 5:4 to 0b10 | `0x00300020` |

* No read-modify-write is needed, so **both cores can update different bits of the same CRU or GRF register without a
  lock** [TRM; consequence].
* Registers with narrower fields use only the matching mask bits (GPIO pull registers: mask in bits 23:16) [TRM ch4].
* **Not masked:** `PMU_PWRDN_CON`, GPIO `DR`/`DDR`, `CRU_APLL_CON2`, all non-CRU/GRF peripherals. These need one owner
  or a lock [TRM].

---

## CRU

**Base 0x40180000. Clock and reset unit** [TRM ch3]. PLL, clock selection, dividers, gates and soft resets for every
block. PLL/divider registers and the clock-change rules: [soc_rknanod.md § Clocks](soc_rknanod.md#clocks).

| Register | Offset | Use |
|---|---|---|
| `CRU_APLL_CON0..2` | 0x00-0x08 | PLL |
| `CRU_MODE_CON` | 0x10 | slow/normal mode, USB 480 M and ACODEC PLL select, slow-mode divider |
| `CRU_CLKSEL0..12_CON` | 0x14-0x44 | sources and dividers |
| `CRU_CLK_FRACDIV_CON0/1` | 0x50/0x54 | I2S0 / I2S1 fractional dividers |
| `CRU_CLKGATE0..9_CON` | 0x80 + 4n | clock gates, 1 = off; reset value 0 (all clocks on) |
| `CRU_SOFTRST0..3_CON` | 0xC0 + 4n | soft resets, 1 = in reset; reset value 0 except SOFTRST3 = 0x4 (**core B held in reset**) |
| `CRU_STCLK_CON0/1` | 0xE0/0xE4 | per-core "stick clk counter" (meaning not described) |
| `CRU_GLB_SRST_FST_VALUE` | 0xF4 | write 0xFDB9: global soft reset (all logic except GRF and GPIOs) |
| `CRU_GLB_CNT_TH` | 0xF8 | global reset wait count |

### Gate and reset ids

Register bit names from [TRM ch3.7]; id numbering [AP30].

| id | Gate | Reset | id | Gate | Reset |
|---|---|---|---|---|---|
| 0x00 | clk_sys_core | usbotg | 0x14 | clk_i2s0_src | timer0 |
| 0x01 | hclk_sys_core | usbphy | 0x15 | clk_i2s_frac_src | timer1 |
| 0x02 | **hclk_cal_core** (core B) | usbglb | 0x16 | clk_i2s | saradc |
| 0x03 | hclk_logic | i2s0 | 0x17 | dclk_ebc_src | pwm0 |
| 0x04 | pclk_logic | i2s1 | 0x18-0x1B | clk_sdmmc, clk_emmc, clk_spi0, clk_spi1 | pwm1, sfc, i2c0, i2c1 |
| 0x05-0x07 | —, hclk_pmu, clk_usbphy | spi0, spi1, uart0 | 0x1C-0x1F | clk_uart0, clk_uart1, clk_uart2, clk_test | i2c2, ebc, mailbox, wdt |
| 0x08 / 0x09 | clk_sfc / — | uart1 / uart2 | 0x20-0x23 | clk_uart3, clk_uart4, clk_uart5 (0x20-0x22) | high_matrix, highram1, highram0, hifi |
| 0x0A | clk_saradc | bootrom | 0x25-0x29 | | uart3, uart4, uart5, gpio0 (0x28), gpio1 (0x29) |
| 0x0B / 0x0C | clk_timer0 / clk_timer1 | sysram1 / sysram0 | 0x30-0x39 | hdram0-7, hdram interface (0x38), **hclk_hifi (0x39)** | 0x30 acodec, 0x31 sys_core, **0x32 cal_core**, 0x33 brg_to_pmu, 0x35 pmu, 0x36 async_brg, 0x37 dma2 |
| 0x0D / 0x0E | pclk_pmu / clk_acodec | lcdc / **imdct** | 0x40-0x4C | hiram0-3, hiram interface (0x48), hclk_high (0x49), hclk_high_matrix (0x4A), hclk_high_dma (0x4B), hclk_async_brg (0x4C) | |
| 0x0F | | **synth** | 0x50-0x5A | pclk_pmu (0x50), pclk_grf (0x53), pclk_gpio2 (0x54), clk24m (0x55), pmu_ram interface/0/1 (0x56-0x58), clk_pvtm (0x5A) | |
| 0x10-0x13 | clk_i2s1_src, clk_i2s1_frac_src, clk_i2s1_out, clk_i2s1 | sysdma, sdmmc, sdio, sysmatrix | 0x60-0x6F | dram0-7, dram interface (0x68), hclk_apb_brg, hclk_usbc, hclk_sdmmc (0x6B), hclk_emmc (0x6C), hclk_ebc, **hclk_synth (0x6E)**, hclk_sfc | |
| | | | 0x70-0x7F | iram0-7, iram interface (0x78), hclk_bootrom (0x79), hclk_bus_matrix, hclk_ahb_brg, hclk_1tom_brg, hclk_dma (DMAC1, 0x7D), **hclk_imdct (0x7E)**, hclk_lcdc (0x7F) | |
| | | | 0x80-0x8F | hclk_pmu_apb_brg, pclk_i2s0/1, pclk_i2c0/1/2, pclk_spi0/1, pclk_uart0-5, pclk_timer (0x8E), pclk_wdt (0x8F) | |
| | | | 0x90-0x98 | pclk_pwm0/1, pclk_mailbox (0x92), pclk_saradc (0x93), pclk_gpio0/1, pclk_acodec (0x96), pclk_async_brg, pclk_lgc_matrix | |

### Stock boot baseline

The stock firmware writes every gate and reset register once at boot, with full masks; a known-good "everything idle"
state. Drivers then ungate and release their own block when they open [AP30 section 0 at 0x030817D6].

| Register | Value | Meaning (1 = gated / held in reset) |
|---|---|---|
| CLKGATE0 | 0x7FFF1FA4 | core-B bus clock, USB PHY, SFC, SAR-ADC, timer0/1 off (bits 5 and 9 also set, reserved in the TRM) |
| CLKGATE1 | 0xFFFFCF9F | all I2S, EBC, SDMMC, eMMC, SPI, UART2, test-out off (UART0/1 on) |
| CLKGATE2 | 0x00070007 | UART3-5 off |
| CLKGATE3 / 4 | 0x03FF03FF / 0x1FFF1FFF | everything in PD_HIGH off (HIGHRAM banks, HIFIACC, DMAC2, bridge) |
| CLKGATE5 | 0x07EF0606 | PVTM off; PMU-SRAM, GRF, GPIO2, PMU on |
| CLKGATE6 | 0xFFFFEC00 | SFC, SYNTH, EBC, SDMMC, USB AHB off; SYSRAM1 banks on |
| CLKGATE7 | 0xFFFF4000 | IMDCT off; SYSRAM0 banks, DMAC1, LCDC, ROM on |
| CLKGATE8 | 0xFFFFFCFE | every APB clock off except UART0/1 and the PMU bridge |
| CLKGATE9 | 0x01FF0004 | mailbox off |
| SOFTRST0 | 0xFFFFE67F | USB, I2S0/1, SPI0/1, UART2, boot ROM, LCDC, IMDCT, SYNTH held |
| SOFTRST1 | 0xFFFFFE32 | SDMMC, timers, SFC, I2C0-2, EBC, mailbox, WDT held |
| SOFTRST2 | 0x03FF00FF | PD_HIGH matrix/RAM/HIFI and UART3-5 held; GPIO0/1 released |
| SOFTRST3 | 0x00FF00D4 | core B, async bridge, DMAC2 held (bit 4 also set, reserved in the TRM) |

Stock: a requirement-table clock manager reprograms the PLL and dividers on demand →
[power_management.md](../firmware/power_management.md).

## GRF

**Base 0x50010000, PD_PMU (always on). General register file** [TRM ch4]: pin mux, pulls, pin-group routing, USB PHY
control, SRAM timing, remap, core status. All registers use the [write mask](#write-mask-convention).

| Register | Offset | Reset | Use |
|---|---|---|---|
| `GRF_GPIOxy_IOMUX` | 0x20·bank + 4·port | 0 | 2 bits per pin, 8 pins; 0 = GPIO, 1-3 = alternate functions ([pin table](soc_rknanod.md#pin-mux-table-lfbga121)) |
| `GRF_GPIOxy_PULL` | 0x20·bank + 0x10 + 4·port | 0 | 1 bit per pin: **0 = pull enabled** (direction fixed by the pad), 1 = off; mask bits 23:16 |
| `GRF_PVTM_CON0-2`, `GRF_PVTM_STATUS0/1` | 0x60-0x70 | | process/voltage/temperature monitor ([PVTM](#pvtm)) |
| `GRF_USBPHY_CON0-11` | 0x80-0xAC | various | USB PHY tuning |
| `GRF_UOC_CON0-2` | 0xB0-0xB8 | 0 | OTG/PHY control: CON0 bit 0 OTG disable, bit 1 BYPASSDMEN, bit 2 BYPASSSEL (UART bypass); CON2 VBUS charge/discharge |
| `GRF_IOMUX_CON` | 0xBC | 0 | pin-group select: 1:0 I2C0 (A/B/C), 3:2 I2C1, 5:4 I2C2, 6 SPI0 (A/B), 7 SPI1, 9 UART1 (A/B), 11:10 UART2 (A/B/C), **12 I2S0 → internal ACODEC** instead of pads |
| `GRF_INTER_CON0` | 0xC4 | 0x1 | 0 **`force_jtag`** (JTAG0 owns its pads; reset 1), 1 DMA request select UART0 (0) / UART2 (1), 5 boot-ROM extra cycle, 6 PMU-SRAM extra cycle, **8 `noc_remap`** (0 ROM at 0, 1 PMU-SRAM at 0), 12-15 SYSRAM0 / SYSRAM1 / HIGHRAM0 / HIGHRAM1 extra cycle |
| `GRF_VREF_CON` | 0xCC | 0x18 | SAR-ADC reference: 0 power-down, 3:1 trim 2.4-2.6 V (0b100 = 2.5 V), 6:4 band-gap select |
| `GRF_SOC_STATUS0` / `1` | 0xE0 / 0xE4 | | core A / core B: 0 sleeping, 1 sleepdeep, 2 **lockup**, 3 halted |
| `GRF_SOC_USB_STATUS` | 0xE8 | | 0 VBUS valid, **1 B-session valid** (used as "USB power present"), 2 A-valid, 3 session end |
| `GRF_PRJ_ID` | 0xF8 | 0xDDDDDDDD | project id |
| `GRF_CPU_ID` | 0xFC | | bit 0: which core is reading (0 = A, 1 = B) |

* The pin-group select in `GRF_IOMUX_CON` is needed **in addition** to the pin mux when a function exists on more than
  one pin set [TRM ch4].
* Both the boot loader and the stock firmware read `GRF_SOC_USB_STATUS` bit 1 as "VBUS present" [AP30].
* Quirk: the ADC reference power-down bit resets to 1 in the register detail but 0 in the summary table [TRM ch4].

Stock: pins set once at boot and per driver; `force_jtag` cleared at boot; SRAM extra cycles set by the clock manager;
`noc_remap` written 0 by the crash handler, watchdog ISR and reboot path [AP30]. Board pin use:
[board_ap30.md](board_ap30.md).

## PMU

**Base 0x50020000, PD_PMU. Power management unit** [TRM ch5]. Power domains, low-power mode, wake-up, four scratch
registers.

| Register | Offset | Reset | Use |
|---|---|---|---|
| `PMU_WAKEUP_CFG0` | 0x00 | 0 | bit 1: wake on the GPIO2 interrupt |
| `PMU_WAKEUP_CFG1` | 0x04 | 0 | per-pin rising-edge wake enable; bytes = GPIO2 A/B/C/D |
| `PMU_WAKEUP_CFG2` | 0x08 | 0 | per-pin falling-edge wake enable |
| `PMU_PWRDN_CON` | 0x0C | 0 | bit 1 `pd_high_pwrdwn_en`: 1 = power PD_HIGH (core B, HIGHRAM, HIFIACC, DMAC2) down. **No write mask** |
| `PMU_PWRDN_ST` | 0x10 | | bit 1 PD_HIGH state, bit 0 VD_LOGIC state |
| `PMU_PWRMODE_CON` | 0x14 | 0 | 0 enter low-power mode; 1 global IRQ disable during the flow; 2 power down VD_LOGIC; 3 switch to a low-frequency clock (24 MHz divider or PVTM); 5 PMU IRQ enable; 6 crystal power-down; 7 PLL power-down |
| `PMU_OSC_CNT` | 0x1C | 0x5DC0 | crystal stabilisation count |
| `PMU_CORE_PWRDWN_CNT` / `PWRUP_CNT` | 0x20 / 0x24 | 0x5DC0 | VD_LOGIC power-down/up counts (0x5DC0 = 24000 cycles = 1 ms at 24 MHz) |
| `PMU_SOFT_CON` | 0x28 | 0 | low-clock select (24 MHz divider / PVTM), crystal power-down (write mask) |
| `PMU_PLLLOCK_CNT` | 0x2C | 0x5DC0 | PLL lock wait count |
| `PMU_INT_CON` / `INT_ST` | 0x30 / 0x34 | | PMU interrupt (IRQ 35) enables / status |
| `PMU_GPIO_POS_INT_ST` / `NEG_INT_ST` | 0x38 / 0x3C | | GPIO2 edge interrupt status |
| `PMU_SYS_REG0..3` | 0x40-0x4C | 0 | scratch words in the always-on domain; survive `SYSRESETREQ`, cleared by power-on |
| `PMU_GPIO_POS_INT_CON` / `NEG_INT_CON` | 0x60 / 0x64 | | GPIO2 edge interrupt enables |
| `PMU_SOFTRST_CON` | 0x80 | | internal soft reset |

* **Low-power flow** [TRM ch5.3.2]: normal → (optional) clock to low frequency → (optional) VD_LOGIC off → wait for a
  GPIO2 wake event → wait for the crystal → clock back to 24 MHz → VD_LOGIC on. Only GPIO2 pins or the GPIO2
  interrupt can wake the chip [TRM ch5.3.3].
* **PD_HIGH on/off** in normal mode: write `PMU_PWRDN_CON`, then poll `PMU_PWRDN_ST` [TRM ch5.3.1, ch5.4]. The stock
  firmware does not poll [AP30].
* **`PMU_SYS_REG3`** is the boot loader's mode marker (`0xFFFF0000 | value`; values in
  [soc_rknanod.md § Resets](soc_rknanod.md#resets-and-what-survives-them)) [AP30].

Stock: only `PMU_PWRDN_CON` (PD_HIGH for playback) and `PMU_SYS_REG3` (reboot to loader / MaskROM) are ever
accessed; the low-power mode is never used [AP30] → [power_management.md](../firmware/power_management.md),
[boot_loader.md](../firmware/boot_loader.md).

---

## TIMER

**Base 0x400E0000, IRQ 19 (channel 0) and 18 (channel 1). Two 64-bit down-counters** [TRM ch18].

| Register (channel stride 0x20) | Offset | Use |
|---|---|---|
| `LOAD_COUNT0` / `1` | +0x00 / +0x04 | reload value, low / high word |
| `CURRENT_VALUE0` / `1` | +0x08 / +0x0C | current count, low / high |
| `CONTROLREG` | +0x10 | bit 0 enable, bit 1 mode, bit 2 interrupt **unmask** |
| `INTSTATUS` | +0x18 | write 1 to clear |

* Counts down to zero and interrupts; reloads on enable and, in free-running mode, at zero. Change registers only
  while disabled [TRM ch18].
* **Mode bit contradiction:** §18.3.2 says 1 = free-running, the register table says 0 = free-running. The stock code
  leaves it 0 and gets a periodic tick, so the table is right [TRM; AP30].
* Clock: 24 MHz or `pclk_logic` with a divider (`CRU_CLKSEL2`); gates 0x0B/0x0C + 0x8E, resets 0x14/0x15 [TRM ch3.7].
  On 24 MHz it is the one time base that does not move when the PLL changes.
* The TRM's "TIMER0~5" (§18.3.1) is a leftover: there are two channels [TRM].

Stock: channel 0 on 24 MHz as a periodic tick for key scanning [AP30] →
[display_and_input.md](../firmware/display_and_input.md).

## WDT

**Base 0x40120000, IRQ 8. DesignWare watchdog** [TRM ch20].

| Register | Offset | Reset | Use |
|---|---|---|---|
| `WDT_CR` | 0x00 | 0x0A | 4:2 reset pulse length 2^(n+1) pclk (2…256), 1 response mode (0 = reset at first timeout; 1 = interrupt first, reset at the second timeout unless cleared), 0 enable |
| `WDT_TORR` | 0x04 | 0 | 3:0 period = 2^(16+n) pclk cycles; takes effect at the next restart |
| `WDT_CCVR` | 0x08 | | current counter |
| `WDT_CRR` | 0x0C | | write **0x76** to restart ("kick") |
| `WDT_STAT` | 0x10 | | interrupt status |
| `WDT_EOI` | 0x14 | | read to clear the interrupt |

* **Counts `pclk`**: the timeout scales with the APB clock, so it changes with every clock change [TRM ch20].
* Gate 0x8F, reset 0x1F. The watchdog reset is a system reset (`soc_wdt_rstn`) [TRM ch3.4].

Stock: started at boot with CR = 0x16 (64-cycle pulse, interrupt first, enabled) and TORR = 13 (2^29 cycles, about
10.7 s at the boot APB clock of 50 MHz, so about 21 s to the reset); kicked from 60 places including long file-system
loops; its ISR just spins until the second timeout; stopped before reboot and power-off [AP30] →
[power_management.md](../firmware/power_management.md).

## SysTick

Per-core Arm SysTick (0xE000E010), 24-bit reload [WEB] Arm. Clock = the core clock (`CSR.CLKSOURCE` = 1) or the
"external reference", here the per-core `stclk` from `CRU_CLKSEL0` (core clock / (n+1)) [TRM fig 3-2]. At 200 MHz the
longest period is about 84 ms.

Stock: both cores select the core clock; 10 ms tick on core A and on core B, re-timed after every clock change [AP30] →
[architecture.md](../firmware/architecture.md).

---

## GPIO

**GPIO0 0x40160000 (IRQ 38), GPIO1 0x40170000 (IRQ 37), GPIO2 0x50030000 (IRQ 36, always-on domain).
DesignWare APB GPIO** [TRM ch19].

| Register | Offset | Use |
|---|---|---|
| `GPIO_SWPORT_DR` | 0x00 | output data |
| `GPIO_SWPORT_DDR` | 0x04 | direction, 1 = output |
| `GPIO_INTEN` | 0x30 | interrupt enable per pin |
| `GPIO_INTMASK` | 0x34 | interrupt mask |
| `GPIO_INTTYPE_LEVEL` | 0x38 | 1 = edge, 0 = level |
| `GPIO_INT_POLARITY` | 0x3C | 1 = high / rising |
| `GPIO_INT_STATUS` | 0x40 | masked status |
| `GPIO_INT_RAWSTATUS` | 0x44 | raw status |
| `GPIO_DEBOUNCE` | 0x48 | debounce enable |
| `GPIO_PORT_EOI` | 0x4C | write 1 to clear an edge interrupt |
| `GPIO_EXT_PORT` | 0x50 | pin input level |
| `GPIO_LS_SYNC` | 0x60 | synchronise level interrupts to pclk |

* **No write mask:** `DR`/`DDR` updates are read-modify-write; give each bank one owner or an interrupt-safe lock,
  especially if both cores touch the same bank [TRM ch19].
* Every GPIO can interrupt (edge or level, per pin); outside the GPIO block, interrupt lines are level-only [TRM ch1.1,
  ch2.3].
* Pulls live in the GRF, not here. Pins are inputs after power-on [TRM ch1.1, ch4].
* GPIO2 stays powered in low-power mode and is the only wake-up source [TRM ch5.3.3].
* Gates: pclk_gpio0/1 (0x94/0x95), pclk_gpio2 (0x54); resets gpio0/gpio1 (0x28/0x29) [TRM ch3.7].

Stock: pins numbered `bank_n` (n = 8 × port + bit); keys and the volume wheel are polled, not interrupt-driven; a GPIO2
per-pin dispatcher is registered on IRQ 36 [AP30] → [display_and_input.md](../firmware/display_and_input.md),
[board_ap30.md](board_ap30.md).

## SAR-ADC

**Base 0x400D0000, IRQ 20. 8 channels, 10-bit, single-sample** [TRM ch17].

| Register | Offset | Bits |
|---|---|---|
| `SARADC_DATA` | 0x00 | 9:0 result |
| `SARADC_STAS` | 0x04 | 0 busy |
| `SARADC_CTRL` | 0x08 | 2:0 channel, **3 power-up** (a conversion starts by itself a few ADC clocks after power-up), **4 start of conversion** (self-clearing), 5 interrupt enable, 6 interrupt status (write 0 to clear) |

* Up to 100 kS/s with a 1 MHz ADC clock, the stated maximum [TRM ch17.1, 17.6]. ADC clock = 24 MHz / (`CRU_CLKSEL6` +
  1) [TRM ch3.7]. The datasheet's "200 kHz" disagrees [DS].
* **TRM procedure** [TRM ch17.6]: power down (bit 3 = 0), select the channel, enable the interrupt, power up (bit 3 =
  1), wait for the interrupt or poll `STAS`, read `DATA`.
* Reference: internal 2.5 V source controlled by `GRF_VREF_CON` (power-down bit 0, trim bits 3:1) [TRM ch17.4]. Input
  limit 2.75 V absolute [DS].
* Gates 0x0A (clk_saradc) + 0x93 (pclk), reset 0x16 [TRM ch3.7].
* **Bit order:** an earlier reading from the Echo Mini study had start = bit 3, power = bit 4, interrupt enable =
  bit 6 [EM]. The stock AP30 driver writes `channel | 0x28` (power-up + interrupt enable), sets bit 4 to start a new
  conversion and clears bit 6 in the handler, which matches the TRM layout above [AP30].

Stock: channel 0 = battery (behind a 2:1 divider), channel 1 = key ladder; one conversion per request with an
end-of-conversion interrupt; the boot loader leaves the ADC powered with a 1 MHz clock [AP30] →
[input.md](input.md), [power.md](power.md).

## PWM

**PWM0 0x400F0000 (IRQ 17), PWM1 0x40100000 (IRQ 16)** [TRM ch21]. Each block has four channels; only one channel of
PWM1 is bonded, so five outputs in total: pins PWM0-PWM4 on GPIO2_4, 2_3, 2_2, 2_1, 2_0 [TRM ch1.1; DS].

| Register (channel stride 0x10) | Offset | Use |
|---|---|---|
| `PWMn_CNT` | +0x0 | counter |
| `PWMn_PERIOD_HPR` | +0x4 | period, or high-time capture |
| `PWMn_DUTY_LPR` | +0x8 | duty, or low-time capture |
| `PWMn_CTRL` | +0xC | 0 enable, 2:1 mode (00 one-shot, 01 continuous, 10 capture), 3 duty polarity, 4 inactive polarity, 5 alignment, 8 low-power, 9 clock source, 14:12 prescale, 23:16 scale, 31:24 repeat count |
| `PWM_INTSTS` / `PWM_INT_EN` | 0x40 / 0x44 | interrupt status / enable |

* Period and duty are shadowed and take effect at the end of the current period. One-shot mode runs N+1 periods and
  interrupts [TRM ch21].
* Clocked from its pclk (gates 0x90/0x91, resets 0x17/0x18) [TRM ch3.7].
* Which pin each PWM1 channel drives is inferred from the pin names (PWM4 = PWM1 channel 0) [?].

Stock: PWM0 channel 0 on GPIO2_4 drives the backlight at 15 kHz with "negative" duty polarity; 0 % or 100 % stops the
channel instead [AP30] → [display.md](display.md).

---

## DMAC1 and DMAC2

**DesignWare AHB DMA controllers** [TRM ch8].

| | DMAC1 | DMAC2 |
|---|---|---|
| Base / IRQ | 0x60000000 / 6 | 0x01070000 / 40 |
| Domain | PD_LOGIC | PD_HIGH (exists only while core B's domain is powered) |
| Channels | 6 | 2 |
| Hardware requests | 0 I2S0 TX, 1 I2S0 RX, **2 I2S1 TX**, 3 I2S1 RX, 4/5 SPI0 TX/RX, 6/7 SPI1 TX/RX, 8/9 UART0 or UART2 TX/RX (`GRF_INTER_CON0` bit 1), 10/11 UART1 TX/RX, 12 SDMMC, 13 eMMC, 14 VOP, 15 reserved | 0 HIFIACC RX, 1 HIFIACC TX |
| Gate / reset | `hclk_dma` 0x7D / `sysdma` 0x10 | `hclk_high_dma` 0x4B / `dma2` 0x37 |

[TRM ch2.4, ch8]

* **Layout:** per-channel block at stride 0x58: `SAR` +0x00, `DAR` +0x08, `LLP` +0x10, `CTL` +0x18/+0x1C, `SSTAT`
  +0x20, `DSTAT` +0x28, `CFG` +0x40/+0x44, `SGR` +0x48, `DSR` +0x50 [TRM ch8.3]. Global: raw/status/mask/clear
  interrupt groups from +0x2C0 (`RawTfr` +0x2C0, `ClearTfr` +0x338, `ClearBlock` +0x340, `ClearErr` +0x358),
  `DmaCfgReg` +0x398 (write 1 to enable), `ChEnReg` +0x3A0 (write-enable bits in the high byte) [TRM ch8.3; EM].
* Byte/half-word/word transfers, fixed or incrementing addresses, linked lists (LLP) and auto-reload on every channel,
  channel priority arbitration [TRM ch8.1]. Hardware requests are level, active high [TRM ch2.4].
* **Block size:** `BLOCK_TS` is 12 bits (at most 4095 items per block); longer transfers need linked-list chains
  [TRM ch8.3]. The stock display driver caps one block at 0xFF8 (4088) items [AP30].
* **Request numbers for UART0/2:** the ch2.4 prose says requests "5 and 6" are switchable; the table says 8 and 9.
  Trust the table [?].
* **Single-block pitfall** [EM, measured]: without a chain, `SAR`, `DAR` and the block length must be written to the
  channel registers themselves; a chain starts from the item `LLP` points to.
* **Reach:** both controllers sit on the shared map, so either core can program either; the hardware has no channel
  ownership [TRM fig 2-1]. DMAC1 reads HIGHRAM1 (the stock firmware does) [AP30]; whether DMAC2 can reach SYSRAM and
  DMAC1 HIGHRAM0 is untested.

Stock: DMAC1 is core A's (channel 5 feeds I2S1 TX on request 2; VOP pixel transfers on request 14; memory-to-memory
copies of decoded audio out of HIGHRAM1; channels 0-4 suspended during clock changes); the SD/eMMC driver does not
use DMA. DMAC2 is driven only by core B's lossless modules, to feed HIFIACC [AP30] →
[audio_playback.md](../firmware/audio_playback.md), [core_b_codecs.md](../firmware/core_b_codecs.md).

---

## I2C

**I2C0 0x40040000 (IRQ 31), I2C1 0x40050000 (IRQ 30), I2C2 0x40060000 (IRQ 29). Rockchip I2C master** [TRM ch22].
Master only, 7- and 10-bit addresses, up to 400 kbit/s, clock stretching, up to 32 bytes per transaction.

| Register | Offset | Reset | Use |
|---|---|---|---|
| `I2C_CON` | 0x000 | 0 | 0 enable; 2:1 mode (00 transmit only, 01 transmit address + register then restart and receive, 10 receive only, 11 as 01 with the read bit set on the first address); 3 start (self-clearing); 4 stop (self-clearing); 5 NAK after the last received byte; 6 stop on NAK |
| `I2C_CLKDIV` | 0x004 | 0x00060006 | SCL = pclk / (8 × ((CLKDIVL + 1) + (CLKDIVH + 1))) |
| `I2C_MRXADDR` | 0x008 | | slave address for receive modes |
| `I2C_MRXRADDR` | 0x00C | | slave register address for receive modes |
| `I2C_MTXCNT` | 0x010 | | writing it starts a transmit of that many bytes |
| `I2C_MRXCNT` | 0x014 | | writing it starts a receive of that many bytes |
| `I2C_IEN` / `I2C_IPD` | 0x018 / 0x01C | | interrupt enable / pending: 0 byte sent, 1 byte received, 2 MTXCNT done, 3 MRXCNT done, 4 start done, 5 stop done, 6 NAK received |
| `I2C_FCNT` | 0x020 | | finished count |
| `I2C_TXDATA0-7` | 0x100-0x11C | | 32 bytes to send, low byte first |
| `I2C_RXDATA0-7` | 0x200-0x21C | | 32 bytes received |

* The bus clock derives from the APB clock, so `CLKDIV` must be recomputed after every clock change [TRM ch22.3].
* In transmit-only mode the read/write bit is bit 0 of the first TX byte; in receive-only mode it is bit 0 of
  `MRXADDR` [TRM ch22.3.2].
* **Pin groups** (`GRF_IOMUX_CON`): I2C0 A = GPIO2_10 SCL / 2_11 SDA, B = GPIO2_17 / 2_16, C = GPIO0_6 / 0_5; I2C1 A =
  GPIO2_9 / 2_8, B = GPIO1_9 / 1_10, C = GPIO2_13 / 2_12; I2C2 A = GPIO2_1 / 2_0, B = GPIO0_24 / 0_25, C = GPIO2_5 /
  2_6 [DS; TRM ch4].
* Gates pclk_i2c0/1/2 (0x83-0x85), resets 0x1A/0x1B/0x1C [TRM ch3.7].

Stock: I2C0 route A for the real-time clock (address 0xA2, opened at 100 kHz for writes, 200 kHz for reads); I2C1
route C for the CS43198 DAC (address 0x66, 400 kHz); one common interrupt handler for all three [AP30] →
[rtc.md](rtc.md), [audio_dac_cs43198.md](audio_dac_cs43198.md).

## I2S

**I2S0 0x40020000 (IRQ 33), I2S1 0x40030000 (IRQ 32). Rockchip I2S/PCM controller** [TRM ch13]. 2 channels,
16-32-bit samples, I2S / left / right-justified / PCM, master or slave, up to 192 kHz, 32 × 32-bit TX and RX FIFOs.

| Register | Offset | Reset | Use |
|---|---|---|---|
| `TXCR` / `RXCR` | 0x00 / 0x04 | 0x0F | `VDW` 4:0 = data width − 1; I2S/PCM; normal/left/right justified; MSB/LSB first; justification of short samples in the 32-bit word; `HWT` two 16-bit samples per word. Writable only while the transfer is stopped |
| `CKR` | 0x08 | 0x00071F1F | 27 `MSS` (0 = master, SCLK out), SCLK and LRCK polarity, 23:16 `MDIV` (MCLK/SCLK, even 2..256), 15:8 `RSD`, 7:0 `TSD` (SCLK cycles per frame − 1, 32..256) |
| `FIFOLR` | 0x0C | | FIFO levels |
| `DMACR` | 0x10 | 0x001F0000 | 8 `TDE` TX DMA enable; 4:0 `TDL` TX request level |
| `INTCR` / `INTSR` | 0x14 / 0x18 | | interrupts |
| `XFER` | 0x1C | | 0 TX start, 1 RX start, 2 LRCK sync |
| `CLR` | 0x20 | | self-clearing reset of the SCLK-domain logic |
| `TXDR` | 0x400-0x7FC | | TX FIFO window |
| `RXDR` | 0x800-0xBFC | | RX FIFO window |

* **TXDR quirk:** the stock firmware's audio DMA writes to I2S1 base **+0x24**, an offset the TRM does not list; the
  TRM puts the FIFO window at +0x400. Since audio plays, +0x24 evidently works as a TX data port [AP30; TRM].
* Clocks: MCLK from `CRU_CLKSEL3` (I2S1) / `CLKSEL4` (I2S0): PLL or ACODEC PLL, integer or fractional divider; the
  I2S1 MCLK can also be driven on the I2S1A CLK pin [TRM fig 3-2, ch3.7]. I2S0 can be routed to the internal ACODEC
  instead of pins (`GRF_IOMUX_CON` bit 12).
* DMA: I2S0 TX/RX = DMAC1 requests 0/1, I2S1 = 2/3 [TRM ch2.4].
* Pin groups: I2S1A on GPIO1_0-1_4, I2S1B on GPIO0_0-0_4 (shared with eMMC); I2S0 on GPIO0_11-0_15 [DS].
* Gates 0x10/0x12/0x13 (I2S1 clocks), 0x14/0x16 (I2S0), 0x81/0x82 (pclk); resets 0x03 (I2S0), 0x04 (I2S1)
  [TRM ch3.7; AP30].
* The SoC has no DSD interface; DSD can only leave as DoP inside PCM frames [TRM ch13].

Stock: I2S1 route A, master, 24-bit samples in 32-bit slots, SCLK = 64 fs, MCLK from the ACODEC PLL through
`CLKSEL3` ÷ 5; fed by DMAC1 channel 5, one transfer per PCM block re-armed from the DMA interrupt [AP30] →
[audio_dac_cs43198.md](audio_dac_cs43198.md), [audio_playback.md](../firmware/audio_playback.md).

## UART

**UART0 0x400A0000 (IRQ 26), UART1 0x400B0000 (IRQ 25), UART2 0x400C0000 (IRQ 24), UART3 0x40130000 (IRQ 23),
UART4 0x40140000 (IRQ 22), UART5 0x40150000 (IRQ 21). DesignWare 16550-compatible** [TRM ch23].

| Register | Offset | Use |
|---|---|---|
| `RBR` / `THR` / `DLL` | 0x00 | receive / transmit / divisor low (DLAB = 1) |
| `DLH` / `IER` | 0x04 | divisor high / interrupt enable |
| `IIR` / `FCR` | 0x08 | interrupt id / FIFO control |
| `LCR` | 0x0C | line control (DLAB bit 7) |
| `MCR`, `LSR`, `MSR`, `SCR` | 0x10-0x1C | modem control, line status, modem status, scratch |
| `USR` | 0x7C | bit 1 TX FIFO not full, bit 3 RX FIFO not empty |
| `TFL` / `RFL` | 0x80 / 0x84 | FIFO levels |
| `SRR` | 0x88 | software reset (UART, FIFOs) |
| `UCV` / `CTR` | 0xF8 / 0xFC | component version 0x0330372A / type 0x44570110 |

* 32-byte RX and TX FIFOs on every UART; **auto flow control only on UART1 and UART2** [TRM ch23.1].
* Baud = UART clock / (16 × divisor) [TRM ch23.1]. Clock from `CRU_CLKSEL9-12`: 24 MHz or the PLL, divider 1-64
  [TRM fig 3-3].
* **Pin routes** [DS; TRM ch4, ch14.3]:

  | UART | Route A | Route B | Route C |
  |---|---|---|---|
  | UART0 | TX GPIO2_13, RX GPIO2_12 | USB D−/D+ through the PHY bypass ([USB OTG](#usb-otg)) | — |
  | UART1 | TX GPIO2_16, RX GPIO2_17, RTS GPIO2_14, CTS GPIO2_15 | TX GPIO1_2, RX GPIO1_1, CTS GPIO1_3, RTS GPIO1_4 | — |
  | UART2 | TX GPIO0_14, RX GPIO0_13, RTS GPIO0_11, CTS GPIO0_12 | TX GPIO0_21, RX GPIO0_20, RTS GPIO0_22, CTS GPIO0_23 | TX GPIO0_1, RX GPIO0_2, CTS GPIO0_3, RTS GPIO0_4 |
  | UART3 / 4 / 5 | TX GPIO1_5 / 1_7 / 1_9, RX GPIO1_6 / 1_8 / 1_10 (SD card pins) | — | — |

* DMA: UART1 = DMAC1 requests 10/11; UART0 or UART2 = 8/9 (selected by `GRF_INTER_CON0` bit 1) [TRM ch2.4].
* Gates clk_uart0-5 (0x1C, 0x1D, 0x1E, 0x20-0x22), pclk_uart0-5 (0x88-0x8D); resets uart0/1/2 = 0x07/0x08/0x09,
  uart3/4/5 = 0x25/0x26/0x27 [TRM ch3.7].

Stock: UARTs run from 24 MHz with divisor 13 (115 384 baud, +0.16 %). UART1 route A at 115200 8N1 is the Bluetooth
module link, and also where the boot loader prints its banner and the crash handlers of both cores dump registers.
Firmware `printf` goes to a null sink. Core B's debug strings are forwarded to UART0, which the firmware never
initialises [AP30] → [bluetooth.md](bluetooth.md), [board_ap30.md](board_ap30.md).

## SPI

**SPI0 0x40070000 (IRQ 28), SPI1 0x40080000 (IRQ 27). DesignWare-style SSI** [TRM ch16]. Master or slave; Motorola
SPI, TI SSP, Microwire; 4/8/16-bit frames; two 16-bit × 32-entry FIFOs; one chip select; SCLK up to clk/2 as master,
clk/6 as slave; DMA handshake.

| Register | Offset | Use |
|---|---|---|
| `SPI_CTRLR0` / `CTRLR1` | 0x00 / 0x04 | frame format, mode / number of frames |
| `SPI_ENR` | 0x08 | enable |
| `SPI_SER` | 0x0C | slave (chip-select) enable |
| `SPI_BAUDR` | 0x10 | clock divider |
| `SPI_TXFTLR` / `RXFTLR` | 0x14 / 0x18 | FIFO thresholds |
| `SPI_TXFLR` / `RXFLR` | 0x1C / 0x20 | FIFO levels |
| `SPI_SR` | 0x24 | status |
| `SPI_IPR`, `IMR`, `ISR`, `RISR`, `ICR` | 0x28-0x38 | interrupt polarity, mask, status, raw, clear |
| `SPI_DMACR`, `DMATDLR`, `DMARDLR` | 0x3C-0x44 | DMA control and levels |
| `SPI_TXDR` / `RXDR` | 0x48 / 0x4C | FIFO data |

* Pin groups: SPI0A on GPIO0_16-0_19 (LCD data pins), SPI0B on GPIO2_8-2_11; SPI1A on GPIO1_5-1_8 (SD pins), SPI1B on
  GPIO2_14-2_17 [DS]. DMA requests 4-7 [TRM ch2.4]. Clock from `CRU_CLKSEL8` (24 MHz or PLL, ÷1-64).
* Gates clk_spi0/1 (0x1A/0x1B), pclk_spi0/1 (0x86/0x87); resets 0x05/0x06 [TRM ch3.7].

Stock: not used for any device; no SPI interrupt is registered [AP30].

---

## SD/MMC hosts

**SDMMC 0x60020000 (IRQ 4, DMA request 12), eMMC 0x60030000 (IRQ 3, DMA request 13). DesignWare mobile storage host
controller (MSHC)** [TRM ch10, ch11].

| | SDMMC | eMMC |
|---|---|---|
| Protocols | SD 2.0, SDIO 2.0, MMC 4.41; 1/4-bit | MMC 4.41; 1/4/8-bit |
| Pins | GPIO1_5 CMD, 1_6 CLK, 1_7-1_10 D0-D3 | GPIO0_0 PWREN, 0_1 CLK, 0_2 CMD, 0_3-0_10 D0-D7, GPIO1_11 RSTN |
| Shares pins with | SPI1A, UART3/4/5, I2C1B | I2S1B, SFC, JTAG1, UART2C |

| Register | Offset | Use |
|---|---|---|
| `CTRL` | 0x00 | 0-2 controller / FIFO / DMA reset, 4 global interrupt enable |
| `PWREN` | 0x04 | card power |
| `CLKDIV` | 0x08 | card clock = cclk_in / (2 × div); 0 = bypass |
| `CLKSRC`, `CLKENA` | 0x0C, 0x10 | clock source, clock enable |
| `TMOUT` | 0x14 | timeouts |
| `CTYPE` | 0x18 | bus width |
| `BLKSIZ`, `BYTCNT` | 0x1C, 0x20 | block size, byte count |
| `INTMASK` | 0x24 | interrupt mask |
| `CMDARG`, `CMD` | 0x28, 0x2C | command argument and command |
| `RESP0-3` | 0x30-0x3C | response |
| `MINTSTS`, `RINTSTS` | 0x40, 0x44 | masked / raw interrupt status (write 1 to clear) |
| `STATUS` | 0x48 | bit 9 = data busy |
| `FIFOTH` | 0x4C | FIFO thresholds and burst |
| `CDETECT`, `DEBNCE` | 0x50, 0x64 | card detect, debounce |
| `RST_n` | 0x78 | card reset |
| FIFO | 0x200 | data window |

* `CMD` bits: 5:0 index, 6 response expected, 7 long response, 8 check CRC, 9 data expected, 10 write, 13 wait for
  previous data, 14 stop/abort, 15 send 80 init clocks, 21 update clock only, 29 `use_hold_reg` (required in
  SDR12/SDR25), 31 start [TRM ch10.4, ch10.5.1].
* **Clock change:** wait for data not busy, disable `CLKENA` with an update-clock-only command, change `CLKDIV` /
  `CLKSRC` with another, re-enable with a third [TRM ch10.5.1].
* No UHS-I (no 1.8 V signalling, no tuning): the fastest SD mode is High Speed, 50 MHz, 4-bit [TRM ch10.2].
* The FIFO is 32 words deep, judging by the stock threshold values (RX watermark 15, TX 16); the TRM gives the depth
  only symbolically [AP30; ?].
* Clocks: `CRU_CLKSEL7` (bits 4:0 SDMMC divider, 7 source PLL/24 MHz; 12:8 eMMC divider, 15 source), gates 0x18/0x19
  and hclk 0x6B/0x6C; the stock firmware releases reset id 0x11 for both controllers [TRM ch3.7; AP30].

Stock: SDMMC = microSD slot (card detect on a GPIO, not `CDETECT`), eMMC controller = the internal SD-NAND; PIO
transfers driven by FIFO-watermark interrupts (16 words each), no DMA; bus clock "PLL ÷ an even number", at most 50 MHz;
identification at 400 kHz [AP30] → [storage.md](storage.md),
[storage_and_filesystems.md](../firmware/storage_and_filesystems.md).

## SFC

**Base 0x60060000, IRQ 0. Serial flash controller** for SPI NOR/NAND, x1/x2/x4 data, up to four chip selects, AHB
master DMA [TRM ch25]. Registers: `SFC_CTRL` 0x00, `IMR` 0x04, `ICLR` 0x08, `FTLR` 0x0C, `RCVR` 0x10, `AX` 0x14, `ABIT`
0x18, `ISR` 0x1C, `FSR` 0x20, `SR` 0x24, `DMATR` 0x80, `DMAADDR` 0x84, `CMD` 0x100, `ADDR` 0x104, `DATA` 0x108.
There is **no memory-mapped read window**, so no execute-in-place [TRM ch25.4]. Pins shared with eMMC D2-D7. Gate
clk_sfc 0x08, hclk_sfc 0x6F; reset 0x19.

Stock: unused (the AP30 boots from the eMMC controller) [AP30].

---

## VOP

**Base 0x60070000, IRQ 39 (LCDC). Display controller with an i8080 MCU interface** [TRM ch15]. RGB565 or YUV420 input,
YUV→RGB (BT.601/709), RGB888→RGB565 dither, byte and half-word swap, 8-bit bus (16-bit in the register field), up to
400 × 400.

| Register | Offset | Use |
|---|---|---|
| `VOP_MCU_CON` | 0x00 | 15:13 burst, 12 auto clock gating, **11 write-data bypass**, 10 dither, 9 UV swap, 8 RGB565/YUV420, 7:6 YUV→RGB mode, 5 byte swap, **4 half-word swap**, 3 bus width 8/16, **2:1 write split phases** (none / 2 / 3 / 4), 0 idle data direction |
| `VOP_MCU_VERSION` | 0x04 | read-only |
| `VOP_MCU_TIMING` | 0x08 | in processor clock cycles: 15:12 `csrw` (CS → strobe), 10:5 `rwpw` (strobe width), 4:0 `rwcs` (strobe → CS); 0 acts as 1 |
| `VOP_MCU_LCD_SIZE` | 0x0C | 20:12 height − 1, 8:0 width − 1 |
| `VOP_MCU_FIFO_WATERMARK` | 0x10 | almost empty / full levels (≤ 16 recommended) |
| `VOP_MCU_SRT` | 0x14 | soft reset (self-clearing) |
| `VOP_MCU_INT_EN` / `CLEAR` / `STATUS` | 0x18 / 0x1C / 0x20 | frame done, FIFO empty, FIFO full |
| `VOP_MCU_STATUS` | 0x24 | current line, busy |
| `VOP_MCU_CMD` | 0x28 | write = one command cycle (RS low) |
| `VOP_MCU_DATA` | 0x2C | write = data cycle(s) (RS high); DMA target |
| `VOP_MCU_START` | 0x30 | start a picture on the FIFO path |

* **Data paths** [TRM fig 15-1]: RGB through `CMD`/`DATA` ("NanoC-compatible"); RGB565 through the FIFO; YUV420 through
  FIFO, line buffer and colour conversion; read path.
* **Rules:** change registers and send commands only while not busy; write `VOP_MCU_START` before every new picture
  on the FIFO path; RGB565 with two pixels per 32-bit word needs half-word swap and four-phase split, one pixel per
  word needs no swap and two-phase split; YUV420 needs two-phase split [TRM ch15].
* **Pins** (mux 1): `LCD_CSN` GPIO0_15, `LCD_WRN` GPIO0_24, `LCD_RS` GPIO0_25, `LCD_D0-D7` GPIO0_16-0_23. There is **no
  RD and no TE pin**: the bus is write-only from the VOP's side; reading a panel ID needs a bit-banged RD on a GPIO
  [TRM table 15-1; DS; EM].
* DMA: DMAC1 request 14 [TRM ch2.4]. Gate hclk_lcdc 0x7F, reset lcdc 0x0D [TRM ch3.7].

Stock: `CMD`/`DATA` path with DMAC1 pushing 32-bit words into `VOP_MCU_DATA` (bursts of 16, linked blocks of up to
4088 items); `VOP_MCU_TIMING` recomputed after every PLL change; the interrupt, FIFO path, size and start registers
are never used; clock gated off in standby [AP30] → [display.md](display.md),
[display_and_input.md](../firmware/display_and_input.md).

## EBC

**Base 0x60040000, IRQ 2. E-ink (EPD) timing controller** [TRM ch24]. Pins shared with the LCD, I2S0, I2S1A and GPIO2
groups (`EBC_*` in the [pin table](soc_rknanod.md#pin-mux-table-lfbga121)). Clock `dclk_ebc` from `CRU_CLKSEL5`; gates
0x17, 0x6D; reset 0x1D.

Stock: unused (gated and held in reset at boot) [AP30].

---

## USB OTG

**Base 0x60080000 (256 KiB, to 0x600BFFFF), IRQ 5. USB 2.0 OTG controller with integrated PHY, DesignWare HS OTG
(DWC2) register family** [TRM ch14; AP30 driver].

* High-speed and full-speed (low-speed only as host), UTMI+ level 3 PHY (16-bit) [TRM ch14.1].
* Device mode: control endpoint + 3 endpoints (two IN/OUT, one IN; the periodic IN endpoint ≤ 64 bytes). Host mode: 4
  channels, one port. Data FIFO 308 × 35 bits in total. The feature list mentions SRP/HNP; ch14 says no HNP/SRP
  [TRM ch1.1 vs ch14.1].
* DMA: the TRM says both "AHB slave only, no internal DMA" and "internal DMA logic" [TRM ch14.1.1 vs 14.2.1].
* PHY control in the GRF: `GRF_USBPHY_CON0-11`, `GRF_UOC_CON0-2`; status `GRF_SOC_USB_STATUS` [TRM ch4].
* **UART bypass (UART0B)** [TRM ch14.3]: with the PHY in bypass mode the USB pads become UART0. Transmit drives D−;
  receive comes through the single-ended D+ line indicator (the TRM table labels the receive pin both "D−" and "DP":
  check by experiment). To enter: OTG disable (`GRF_UOC_CON0` bit 0), D+ pull-up off (OPMODE 01), PLL power-down in
  suspend, PHY suspend, then BYPASSSEL (bit 2) and BYPASSDMEN (bit 1). To leave: the reverse.
* Gate hclk_usbc 0x6A, clk_usbphy 0x07; resets usbotg 0x00, usbphy 0x01, usbglb 0x02 [TRM ch3.7].
* The USB PHY's 480 MHz output can clock the cores and some peripherals (`CRU_MODE_CON` bit 4) [TRM ch3].

Stock: device mode only, CPU FIFO copies (no DMA); mass storage (`071b:3203`) with Rockchip vendor SCSI commands;
the boot loader uses the same controller for Rockusb (`2207:262d`); USB DAC mode is a separate Realtek chip, not this
controller [AP30] → [usb.md](usb.md), [usb_modes.md](../firmware/usb_modes.md).

## ACODEC

**Base 0x40090000. Internal audio codec** [TRM ch9]: 24-bit sigma-delta stereo DAC and ADC, headphone and line
outputs, microphone inputs with bias, ALC/DRC, 8-192 kHz in three rate families, own I2S slave port (reached by routing
I2S0 to it, `GRF_IOMUX_CON` bit 12), **and its own PLL**.

* PLL configuration registers `ACODEC_PLLCFG0-5` at +0x200-+0x214 [EM]. VCO = 24 MHz × POSDIV / PREDIV; POSDIV is 11
  bits split over two registers; an output-divider code selects ÷3/÷5/÷6/÷9 [TRM ch9.3.1; EM, measured].
* TRM programming order: output divider off + PLL reset + power-down, set source and dividers, power up and release
  reset, **wait ≥ 200 µs for lock**, enable the output divider. TRM targets: 40.96 MHz (8 kHz family), 56.448 MHz
  (44.1 kHz), 61.44 MHz (48 kHz) [TRM ch9.3.1].
* Selected as the I2S clock source with `CRU_MODE_CON` bit 5 [TRM ch3.7].
* On the Echo Mini the usable VCO range was measured at roughly 184-369 MHz; some stock table entries fall outside it
  [EM].
* Gates clk_acodec 0x0E, pclk_acodec 0x96; reset 0x30 [TRM ch3.7].

Stock: only the PLL is used, as the audio master clock source (per-rate table, 5 ms settle instead of 200 µs); the
codec's analogue parts are unused because the AP30 has an external CS43198 DAC [AP30] →
[audio_dac_cs43198.md](audio_dac_cs43198.md).

---

## Mailbox

**Base 0x40110000, IRQ 9-12 on each core.** Four channels per direction, each one command word, one data word and one
status bit; no FIFO [TRM ch1.1]. The TRM has no register chapter; the layout below comes from the stock drivers on both
cores and matches Rockchip's Linux `rockchip-mailbox` driver [AP30; EM; WEB].

| Offset | Register |
|---|---|
| +0x00 / +0x04 | A→B interrupt enable / status (bit *ch*; write 1 to clear status) |
| +0x08 + 8·ch / +0x0C + 8·ch | A→B command / data, channel *ch* |
| +0x28 / +0x2C | B→A interrupt enable / status |
| +0x30 + 8·ch / +0x34 + 8·ch | B→A command / data |

Gate pclk_mailbox 0x92, reset 0x1E [TRM ch3.7]. Full description (which write raises the status, single-slot
behaviour, IRQ routing): [dual_core.md § Mailbox](dual_core.md#mailbox).

Stock: one channel per protocol layer (system, decoder control, file service, debug text) →
[core_b_codecs.md](../firmware/core_b_codecs.md).

## Accelerators

| Block | Base | IRQ | Domain | Purpose | Gate / reset |
|---|---|---|---|---|---|
| HIFIACC | 0x01060000 | 34 | PD_HIGH | fixed-point FFT/IFFT (64-1024), MAC (1-1024 taps, 64-bit result), FLAC and ALAC FIR (order 1-32), APE NN filters; 32-word FIFOs; fed by DMAC2 | hclk_hifi 0x39 / hifi 0x23 |
| IMDCT36 | 0x60010000 | 7 | PD_LOGIC [?] | MP3 36-point IMDCT: 18 words in, 36 out | hclk_imdct 0x7E / imdct 0x0E |
| SYNTH | 0x60050000 | 1 | PD_LOGIC [?] | MP3 sub-band synthesis: 32-word I/O SRAM, 1024 × 20-bit history SRAM | hclk_synth 0x6E / synth 0x0F |

[TRM ch3.7, ch26-28; AP30 for the gate/reset ids the firmware uses]. Register maps (none are in the TRM) and stock use:
[dual_core.md § Accelerators](dual_core.md#accelerators).

## PVTM

Process/voltage/temperature monitor: a ring oscillator whose frequency tracks the silicon; usable as the PMU's slow
clock in low-power mode [TRM fig 3-3, ch5]. Registers `GRF_PVTM_CON0-2` and `GRF_PVTM_STATUS0/1` (GRF +0x60-+0x70);
gate clk_pvtm 0x5A [TRM ch4, ch3.7]. The TRM gives no further description.

Stock: gated off at boot, never used [AP30].

## Open questions

1. **I2S TXDR at +0x24:** an undocumented alias of the FIFO, or a different register that happens to work?
2. **DMA reach:** can DMAC2 reach SYSRAM and PMU-SRAM; can DMAC1 reach HIGHRAM0?
3. **UART0/UART2 DMA request numbers:** 8/9 (table) or 5/6 (prose)?
4. **USB OTG internal DMA:** present or not (the TRM says both).
5. **SD/MMC FIFO depth** and whether the eMMC and SDMMC soft resets are separate (stock releases one id for both).
6. **PWM1 channel-to-pin mapping** (PWM4 = PWM1 channel 0 is inferred).
7. **`CRU_STCLK_CON0/1`** meaning; **PVTM** registers.
8. **Reserved bits** the stock firmware sets in CLKGATE0 and SOFTRST3.
9. **ADC reference power-down reset value** (1 in the register detail, 0 in the summary).

## Sources

* [TRM] Rockchip RKNanoD Technical Reference Manual V1.0: <https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf>
  (ch2-5, 8-11, 13-25 register summaries and descriptions).
* [DS] RKNanoD datasheet V1.8 / V0.1: <https://rockchip.fr/RKNanoD%20datasheet%20V1.8.pdf>,
  <https://rockchip.fr/RKNanoD%20datasheet%20V0.1.pdf> (pin groups).
* [WEB] Arm Cortex-M3 / ARMv7-M documentation (SysTick): <https://developer.arm.com/documentation/ddi0337/h>.
* [WEB] Rockchip Linux kernel, `drivers/mailbox/rockchip-mailbox.c` (same mailbox register layout):
  <https://github.com/rockchip-linux/kernel>.
* [EM] Echo Mini study `ETUDE.md` and [HIFIACC.md](https://github.com/berettavexee/echo-mini-newfw/blob/main/docs/HIFIACC.md) in
  [berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw) (MIT): DMAC global registers and
  pitfalls, ACODEC PLL registers and VCO range, VOP read path, clock-change delay.
* [AP30] analysis of firmware V1.7.8 (register accesses of every driver, boot-time CRU values, interrupt
  registrations) and of the AP30 boot loader.
