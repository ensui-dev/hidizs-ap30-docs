# Headphone amplifier: Richtek RT6863 and the output stage

Status: draft, 2026-11

After the CS43198 DAC, the analog signal goes through a **Richtek RT6863** headphone amplifier to **two jacks**:
a 3.5 mm single-ended output and a 4.4 mm balanced output (vendor spec). The amplifier sits on board side B between
the left jack and the USB-C connector. No public datasheet for the RT6863 was found, so its pins and features are
inferred from the board and from what the firmware switches. The firmware detects headphones with two GPIOs but
treats them as one event: it does not know which jack is in use. This page collects what is known about the analog
output stage.

Tags: **[AP30]** firmware V1.7.8 or the device · **[DS]** a datasheet · **[EM]** Echo Mini · **[WEB]** public
source · **[?]** guess.

## Contents

- [Summary](#summary)
- [The RT6863](#the-rt6863)
- [Signal path](#signal-path)
- [Control and detect lines](#control-and-detect-lines)
- [The two jacks](#the-two-jacks)
- [Output power and battery life](#output-power-and-battery-life)
- [Bluetooth and the analog output](#bluetooth-and-the-analog-output)
- [Open questions](#open-questions)
- [Sources](#sources)

## Summary

| Item | Value | Tag |
|---|---|---|
| Amplifier | Richtek RT6863, QFN marked `6863D` (12-16 leads) | [AP30] marking; part name from the vendor spec [WEB] |
| Position | board side B, between the left jack and USB-C; no inductor around it, so not a switching (class-D or DC-DC) part | [AP30] |
| Datasheet | none public (Richtek site and distributors searched) | [WEB] |
| Outputs | 3.5 mm single-ended + 4.4 mm balanced ("true balanced" per a pre-release impression) | [WEB] vendor spec |
| Output power (vendor) | 61 mW + 61 mW @ 32 Ω (3.5 mm SE), 137 mW + 137 mW @ 32 Ω (4.4 mm BAL) | [WEB] |
| Gain | "High / Low" setting acts on the **DAC** full-scale register, not on an amplifier pin (as far as known) | [AP30]; amp gain pin [?] |
| Headphone detect | GPIO2_8 + GPIO0_13, combined into one state | [AP30] |
| Enable / mute | candidates GPIO2_1 (mute, 1 = muted), GPIO2_14, GPIO1_4, GPIO2_2 | behaviour [AP30], roles [?] |

## The RT6863

- The marking `6863D` and the vendor's own spec text ("Richtek RT6863 amp") identify the part [AP30 + WEB].
- One reviewer once wrote that the AP30 pairs the CS43198 with "a separate SGM amplifier"; the same reviewer names
  the RT6863 in his AP30 review, and the board shows the RT6863, so this is most likely a slip [WEB]. Only open way
  it could hold: one of the unidentified parts near the jacks (`A80Q`, a 16-lead leadless part left of the RT6863)
  is an SG Micro part [?].
- No inductor sits around the RT6863, so it is a linear headphone driver [AP30, ?].
- Whether the RT6863 drives both outputs (four channels for balanced plus a single-ended pair) or whether the
  CS43198's own headphone stage drives one of them is not established [?]. The CS43198 has an integrated
  headphone output stage with a Class H supply that the firmware enables (`0x0B0000` = 0x1E, VP_LDO 3.0 V)
  [DS + AP30]; see [audio_dac_cs43198.md](audio_dac_cs43198.md).
- Unknown part near the gold jack: `A80Q`, 16-lead leadless, with a `K2N` SOT-23 beside it [AP30]. It could be a
  second amplifier channel pair, an analog switch or a mute part [?].

## Signal path

```
  CS43198 ──HPOUT A/B (differential)──► RT6863 ──┬──► 4.4 mm balanced jack   (larger barrel? [?])
  (2 Vrms FS                                      │
   at high gain)                                  └──► 3.5 mm SE jack          (smaller gold barrel? [?])
                    │
                    └──► JieLi Bluetooth chip analog input [?] (see Bluetooth below)
```

The diagram is a model: which outputs share which amplifier channels, and where the Bluetooth chip taps the signal,
have not been traced on the board [?].

## Control and detect lines

What the firmware does with each candidate line [AP30]; roles are inferred [?]. Full pin table:
[board_ap30.md](board_ap30.md#pin-assignment-table).

| Pin (ball) | Behaviour | Candidate role |
|---|---|---|
| GPIO2_1 (A5) | **1 = muted**: set on volume 0, before a user stop, when leaving USB DAC mode, at player exit and power-off; cleared ~0.5 s after playback starts, on any non-zero volume while playing, and in USB DAC mode | mute of the DAC, the amp or a mute FET [?]. On the Echo Mini this pin was the DAC reset [EM]; on the reference board it is the charger status pin [WEB] EVK |
| GPIO2_14 (B3) | high before the first DAC init and when idle; driven **low ~0.5 s after each track start**; high again on player exit | amplifier enable / shutdown, active low [?] |
| GPIO2_2 (B4) | 1 before the first DAC init; 0 when the player exits | audio power-rail enable [?] |
| GPIO1_4 (J1) | 1 at the first music start and when entering USB DAC mode; 0 on player exit, in File Transfer and on leaving DAC mode | amp / analog path enable (it follows both audio users) [?] or part of the USB switch |
| GPIO0_12 (C6) | 0 for local playback (set again ~0.5 s after each start); 1 ~0.5 s after entering USB DAC mode | output source select between CS43198 and the ALC5686 [?], or a Realtek enable [?] |
| GPIO2_8 (A6) | input, pull-up; headphone detect | one jack (4.4 mm on the Echo Mini [EM]) |
| GPIO0_13 (B7) | input, pull-up; headphone detect | the other jack (3.5 mm on the Echo Mini [EM]) |

Order at a playback start, as far as these lines go [AP30]: mute stays set from the previous stop → DAC volume →
DMA start → 80 ms wait → I2S on → about 0.5 s later GPIO0_12 low, 10 ms wait, GPIO2_1 low (unmute), GPIO2_14 low.
At player exit: GPIO1_4 = 0, GPIO2_1 = 1, DAC power-down, GPIO2_14 = 1, GPIO2_2 = 0. The DAC and amplifier stay
powered while the player is paused. Full behaviour: [../firmware/audio_playback.md](../firmware/audio_playback.md).

## The two jacks

| Item | Value | Tag |
|---|---|---|
| Physical | two jacks on the USB edge of board side B: left gold-plated with a smaller barrel, right larger; USB-C between them | [AP30] |
| Vendor spec | 3.5 mm single-ended + 4.4 mm balanced | [WEB] |
| Which is which | not readable from the board; the barrel sizes suggest left = 3.5 mm, right = 4.4 mm [?] | [?] |
| Detection | GPIO2_8 and GPIO0_13, polled every main-loop pass, **combined into one state** ("both low" vs "not both low"), 0.5 s debounce, one "headphone changed" event for either jack; the player pauses on it | [AP30] |
| Jack identity in firmware | none: the firmware **does not tell the jacks apart**, and the DAC's own headphone detect is disabled | [AP30] |
| Leftover | the volume routine reads both pins and discards the result | [AP30] |
| Polarity, pin-to-jack mapping | open | [?] |
| Headset microphone | the vendor spec claims headset-mic compatibility; a ~4 mm cylinder near the gold jack may be a microphone or buzzer; no microphone input is used by the firmware | [WEB], [AP30], [?] |

## Output power and battery life

| Figure | Value | Tag |
|---|---|---|
| Output power, 3.5 mm SE | 61 mW + 61 mW @ 32 Ω | [WEB] vendor spec (Head-Fi showcase text, repeated by 15+ reviews) |
| Output power, 4.4 mm BAL | 137 mW + 137 mW @ 32 Ω | [WEB] vendor spec |
| DAC full scale | 2 Vrms at high gain (`OUT_FS` 1.73 V + 1 dB) | [AP30 register value + DS] |
| Battery life, 3.5 mm | about 9.5-11 h measured by reviewers (moderate volume) | [WEB] |
| Battery life, 4.4 mm | about 7.5-9 h measured by reviewers | [WEB] |
| Battery life, Bluetooth | 7+ h measured by one reviewer; vendor 6-8 h | [WEB] |

Reviewers find the output power limiting for demanding headphones [WEB]. No firmware setting changes the amplifier
beyond the DAC's full-scale register [AP30].

## Bluetooth and the analog output

No digital audio path from the RKNanoD to the JieLi Bluetooth chip exists, the firmware raises the DAC level while a
receiver is connected, and Bluetooth loudness follows the analog gain setting. So the JieLi very likely digitises
the DAC / amplifier output with its own ADC [?]. On the Echo Mini two GPIOs route the analog signal to the module
[EM]; on the AP30 no GPIO changes when a link comes up, so the tap is probably permanent [?]. Whether the wired
outputs stay live during Bluetooth playback has not been checked. Details: [bluetooth.md](bluetooth.md).

## Open questions

| Question | How it could be answered |
|---|---|
| RT6863 datasheet: pinout, gain pin, shutdown / mute pins, channel count | Richtek or a distributor; trace pins on the board |
| Does the RT6863 drive both jacks, or does the CS43198's own stage drive one? What is `A80Q`? | continuity from DAC outputs and amp pins to the jack contacts |
| Roles of GPIO2_1, GPIO2_14, GPIO2_2, GPIO1_4, GPIO0_12 | continuity; or toggle each from a test image while playing a tone |
| Which detect pin is which jack, and the active level | read both GPIOs with each plug inserted |
| Where the JieLi takes its analog input; are the wired outputs muted during Bluetooth | continuity; listen on a wired headphone while streaming |
| Real output power and noise at both gains | measurement with a load and an analyser |

## Sources

- [AP30] analysis of firmware V1.7.8 (player start / stop pin sequences, headphone-detect polling, volume routine);
  board inspection (RT6863 marking, jack positions, nearby parts).
- [DS] [Cirrus Logic CS43198 datasheet DS1156F2](https://statics.cirrus.com/pubs/proDatasheet/CS43198_DS1156F2.pdf).
- [WEB] [Head-Fi AP30 showcase](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/) (output power,
  outputs); [Moonstar Reviews](https://moonstarreviews.net/hidizs-ap30-music-boy-review/) and other reviews for
  battery life (listed in [../community/user_feedback.md](../community/user_feedback.md));
  [Ichos review](https://ichos-reviews.com/hidizs-ap30-review/) (RT6863) and his
  [Echo Nano review](https://ichos-reviews.com/fiio-snowsky-echo-nano-review/) (the "SGM amplifier" slip).
- [EM] [iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw) `ETUDE.md`; EchoPod
  ([BasilSkyWalk/echopod](https://github.com/BasilSkyWalk/echopod)) hardware notes.
