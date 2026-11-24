# Board and teardown photos

Status: draft, 2026-11

Photos of one opened retail AP30 (the board, the chips, the connectors, the battery and the inside of the shell).
Everything shown is **[AP30]**: seen on that unit. Identifications that rest on a marking alone carry **[?]**; the
reasoning and the remaining unknowns are in [board_ap30.md § Chips and markings](board_ap30.md#chips-and-markings).

How to read the photos:

- **Orientation:** board photos use the "jacks at the bottom" view, the same one the text uses. Side A faces the
  screen and buttons, side B faces the battery; side B is side A mirrored left-right.
- **Blurred areas** hide manufacturing lot and date codes (second marking lines on chips, the battery's production
  date, the panel flex's date stamps). Part codes are left readable.
- **Licence:** the photos are CC BY 4.0, like the text (see [LICENSE](../LICENSE)). Metadata (camera, time, location)
  has been removed from every file.

## Contents

- [Board overviews](#board-overviews)
- [SoC, storage and clock](#soc-storage-and-clock)
- [Audio path](#audio-path)
- [USB and the USB-audio chip](#usb-and-the-usb-audio-chip)
- [Bluetooth](#bluetooth)
- [Power parts](#power-parts)
- [Controls, storage slot and display](#controls-storage-slot-and-display)
- [Test pads](#test-pads)
- [Battery and shell](#battery-and-shell)

## Board overviews

### Side A (screen side)

![Black circuit board seen from the screen side with numbered yellow callouts on the main chips, connectors and pads.](../images/board/side-a-annotated.jpg)

| # | Part | # | Part |
|---|---|---|---|
| 1 | Rockchip RKNanoD-G SoC | 9 | 22-pin display FPC connector |
| 2 | TM3F4GUAI storage chip | 10 | `SCL` / `SDA` / `VDD` pads |
| 3 | empty BGA footprint (eMMC pattern [?]) | 11 | `P` / `M` pads (encoder phases [?]) |
| 4 | AT85163S RTC and its crystal | 12 | `G` / `5V` pads |
| 5 | Cirrus Logic CS43198 DAC | 13 | ALPS volume-wheel encoder (frame) |
| 6 | 24.576 MHz audio clock | 14 | `705628` 8-lead part and `S2ZQ` (power [?]) |
| 7 | `7227` switch | 15 | board silk `HT9102_V2.1` |
| 8 | Realtek ALC5686 USB-audio chip | 16 | gold edge strip (shell ground contact [?]) |

The eight tact switches in the lower half are the face buttons (D-pad, A, B and the two pill keys).
Without callouts: [side-a.jpg](../images/board/side-a.jpg).

### Side B (battery side)

![Black circuit board seen from the battery side with numbered yellow callouts on the chips, jacks, slot and test pads.](../images/board/side-b-annotated.jpg)

| # | Part | # | Part |
|---|---|---|---|
| 1 | JieLi Bluetooth SoC | 10 | `TX` test pad |
| 2 | its 24.000 MHz crystal | 11 | Richtek RT6863 amplifier |
| 3 | coax pigtail to the antenna | 12 | `A80Q` (audio switch candidate [?]) |
| 4 | ALPS volume-wheel encoder | 13 | `mBJ3H` |
| 5 | microSD slot | 14 | USB-C receptacle |
| 6 | `L2AOU` and a `K2N` | 15 | gold-plated headphone jack |
| 7 | battery wires `BAT+` / `BAT-` / `NTC` | 16 | larger headphone jack |
| 8 | battery path: `D00HAV`, `SL`, `AFCP` | 17 | small brass cylinder (microphone or buzzer [?]) |
| 9 | `CLK` / `G` test pads | | |

The large outlined area in the middle holds only traces and test pads. Without callouts:
[side-b.jpg](../images/board/side-b.jpg).

## SoC, storage and clock

![Square black chip printed Rockchip RKNANOD-G, with a row of small capacitors below and a 24.000 MHz crystal at the lower left.](../images/parts/rknanod-g.jpg)

*Rockchip RKNanoD-G (LFBGA121), side A, upper left of centre; the SoC's 24.000 MHz crystal sits below it.*

![Black rectangular chip with a stylised logo and the text TM3F4GUAI.](../images/parts/tm3f4guai.jpg)

*Storage chip TM3F4GUAI, an 8-pad LGA (SD-NAND style [?]), side A, top edge right of the empty BGA footprint.*

![Square outlined area on the board filled with rings of bare solder pads, no chip fitted.](../images/parts/bga-footprint.jpg)

*Unpopulated BGA footprint (eMMC BGA-153 pattern [?]), side A, top left; traces fan out towards the SoC. Not fitted on this unit.*

![Small 8-lead chip printed AnalogTek AT85163S next to a metal-can crystal marked AQQT.](../images/parts/at85163s-rtc.jpg)

*AnalogTek AT85163S real-time clock (8-pin MSOP) and its 2-pad crystal (marked AQQT; 32.768 kHz by position [?]), side A, right of the storage chip.*

More: [soc_rknanod.md](soc_rknanod.md), [storage.md](storage.md), [rtc.md](rtc.md).

## Audio path

![Square chip printed TWN, CIRRUS, CS43198.](../images/parts/cs43198.jpg)

*Cirrus Logic CS43198 DAC (QFN-40), side A, centre.*

![Small metal-lid oscillator printed 24.576 MHZ.](../images/parts/osc-24576.jpg)

*24.576 MHz audio clock (4-pad SMD, 512 x 48 kHz), side A, above the DAC.*

![Small leadless chip printed 6863D, surrounded by capacitors.](../images/parts/rt6863.jpg)

*Richtek RT6863 headphone amplifier (marked 6863D), side B, between the left jack and USB-C.*

![Small leadless chip printed A80Q next to a three-lead part printed K2N.](../images/parts/a80q.jpg)

*Part marked A80Q, 16-lead leadless, side B, left of the RT6863 by the gold jack; a K2N SOT-23 beside it. Candidate: Will Semiconductor WSP6580Q stereo audio switch [?].*

![Two black headphone jack housings with a USB-C socket between them, board sitting in the back shell.](../images/parts/jacks.jpg)

*The two headphone jacks on the USB edge, side B: left gold-plated (plastic mark Y), right larger (mark B), USB-C between them.*

More: [audio_dac_cs43198.md](audio_dac_cs43198.md), [audio_amp_rt6863.md](audio_amp_rt6863.md).

## USB and the USB-audio chip

![Square chip printed ALC5686, with a 24.000 MHz crystal to its right.](../images/parts/alc5686.jpg)

*Realtek ALC5686 (QFN-48), the USB-DAC-mode chip (0bda:4a35), side A, lower left, with its 24.000 MHz crystal.*

![Tiny black leadless chip printed 7227 with five leads per side.](../images/parts/switch-7227.jpg)

*Part marked 7227, 10-lead leadless, side A, between the 24.576 MHz part and the SoC; 7227-family DPDT analog / USB switch by marking [?].*

![Small leadless chip printed 4576.](../images/parts/4576.jpg)

*Part marked 4576 (QFN-16), side A, below the 24.576 MHz part. Not identified.*

![Metal USB-C socket seen from above with its solder pins, next to small parts.](../images/parts/usb-c.jpg)

*USB-C receptacle (16-pin SMD), side B, between the two jacks; mBJ3H and the 6-bump part beside it.*

![Six-lead chip printed mBJ3H beside the USB-C pins, with a tiny six-bump part below.](../images/parts/mbj3h.jpg)

*Part marked mBJ3H (SOT-23-6), side B, next to the USB-C receptacle; a tiny 6-bump part sits between two '88' diodes below it. Not identified; ESD array or USB switch [?].*

More: [usb.md](usb.md).

## Bluetooth

![Square chip with the JL logo and a marking ending in -56C4, a 24.000 MHz crystal to the right and a gold coax crimp tab at the bottom.](../images/parts/jieli-bt.jpg)

*JieLi Bluetooth SoC (QFN-32, JL logo, marking ends in -56C4: by JieLi's marking convention probably an AC6956C4 [?]) with its 24.000 MHz crystal and the coax pigtail's crimp tab, side B, top-left corner (jacks-at-bottom view).*

![Dark antenna sticker printed B_1597-2.4G_A1 with a thin coax cable soldered at one end.](../images/other/bt-antenna.jpg)

*Bluetooth FPC antenna sticker on the inside of the back cover, B_1597-2.4G_A1, with the coax soldered to it.*

More: [bluetooth.md](bluetooth.md).

## Power parts

![Leadless chip printed DP1 next to a large black molded inductor, below the gold edge strip.](../images/parts/dp1.jpg)

*Part marked DP1 (leadless, 6 pads on the visible long side) with a large molded power inductor beside it, side A, right edge by the gold strip; DC-DC converter or charger [?].*

![Small six-lead chip printed 06T2 above a black molded inductor.](../images/parts/06t2.jpg)

*Part marked 06T2 (SOT-23-6) with a molded inductor right below it, side A, right of the SoC; buck converter [?].*

![Five-lead chip printed D00HAV.](../images/parts/d00hav.jpg)

*Part marked D00HAV (SOT-23-5), side A right edge (a second one on side B by the coax tab); LDO [?].*

![Row of small parts along the board edge: a three-lead part printed AFCP, a diode printed SL and a five-lead part printed D00HAV.](../images/parts/afcp-sl.jpg)

*AFCP (3-lead SOT-23: AF = Alpha & Omega's code for the AO3415 20 V P-MOSFET, or a clone using the same code [?]) and SL (SOD-123, Schottky diode [?]) on side B's battery edge, with D00HAV and the coax tab at the right.*

![Corner of the board with a small eight-lead chip and a five-lead part printed S2ZQ, next to a mounting hole.](../images/parts/70562-s2zq.jpg)

*Side A top-left corner: an 8-lead gull-wing part marked 705628 (last character 8 or B) and an S2ZQ SOT-23-5 above it; power parts [?].*

![Small leadless chip printed L2AOU above a three-lead part printed K2N.](../images/parts/l2aou.jpg)

*Part marked L2AOU (DFN), side B, below the encoder frame, with a K2N SOT-23 beside it. Not identified.*

More: [power.md](power.md) and the power tree in [board_ap30.md](board_ap30.md#power-tree).

## Controls, storage slot and display

![Black rotary encoder rotor with a D-shaped hole in a metal frame stamped 6M1.](../images/parts/encoder.jpg)

*ALPS volume-wheel encoder, side B: black rotor with D-hole in a stamped metal frame marked 6M1, in a board-edge notch.*

![Metal microSD card slot soldered at the board edge.](../images/parts/microsd.jpg)

*microSD slot (metal), side B, wheel / microSD edge.*

![Long white flat-flex connector with pin marks 1 and 22 on the board.](../images/parts/display-fpc-connector.jpg)

*22-pin display FPC connector, side A, display-connector edge (silk 1 and 22).*

![Orange flexible cable with the printed text FDT0201B015-V02.](../images/other/panel-flex.jpg)

*Display panel FPC printed FDT0201B015-V02 (22 pins).*

![Small unmarked black chip with four leads on each short side, next to round pads labelled SDA and SCL.](../images/parts/unmarked-8lead.jpg)

*Unmarked 8-lead gull-wing part, side A, below the encoder, right of the SCL/SDA pads; role unknown (I2C device? [?]).*

More: [input.md](input.md), [storage.md](storage.md), [display.md](display.md).

## Test pads

![Dark board area with small round pads labelled CLK, G, G and TX, and red, black and white battery wires at the top.](../images/parts/test-pads-tx-clk.jpg)

*Test pads on side B, jacks-at-bottom view: CLK and G pair below the BAT+ pad, a single G, and the solid copper TX pad with a surface trace; battery wires BAT+/BAT-/NTC at the top.*

![Round gold pads labelled SCL, SDA and VDD beside a small black chip.](../images/parts/test-pads-scl-sda.jpg)

*SCL, SDA and VDD pads on side A, below the encoder, next to the unmarked 8-lead part.*

What each pad is for and the cautions: [board_ap30.md § Test pads](board_ap30.md#test-pads).

## Battery and shell

![Silver pouch battery cell printed 923033 3.8V 1200mAh and 4.56Wh.](../images/other/battery-label.jpg)

*Battery: 923033 3.8V 1200mAh, 4.56 Wh Li-po.*

![Green strip circuit board under yellow kapton tape at the edge of the battery, with red, black and white wires.](../images/other/battery-protection-pcb.jpg)

*Battery protection PCB along the cell's short edge, seen through its kapton tape (markings not readable); three wires out (red, black, white).*

![Inside of a black plastic shell with the grey back of the display panel and its orange flex cable at the top.](../images/other/front-shell.jpg)

*Inside of the front shell: the panel's back, its FPC, screw bosses and two slots along the bottom edge; no markings.*

More: [power.md](power.md).

