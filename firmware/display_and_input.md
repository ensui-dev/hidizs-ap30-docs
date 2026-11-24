# Display and input (firmware side)

Status: draft, 2026-11

How the stock firmware drives the 296×240 screen and reads the buttons and the volume wheel. The screen is fed
from a full RGB565 frame buffer in RAM; each main-loop pass pushes the changed rows to the panel with DMA through
the SoC's LCD controller (VOP). "Screen off" only switches the backlight off and locks the keys; the panel itself
sleeps only at power-off. Keys are scanned every 10 ms from a resistor ladder on the ADC, the Power key from a GPIO,
and the wheel from two GPIOs sampled 5,000 times a second. The panel hardware, its init sequence and the ladder
voltages are on [hardware/display.md](../hardware/display.md) and [hardware/input.md](../hardware/input.md); this
page is about what the firmware does with them.

## Contents

- [Display driver](#display-driver)
- [Drawing and the frame buffer](#drawing-and-the-frame-buffer)
- [Refresh path](#refresh-path)
- [Screen off, wake and standby](#screen-off-wake-and-standby)
- [Backlight and brightness levels](#backlight-and-brightness-levels)
- [Key scanning](#key-scanning)
- [Power key](#power-key)
- [Volume wheel](#volume-wheel)
- [Key lock and the Screen-Off Button Settings](#screen-off-button-settings-key-lock-filter)
- [Key codes and what they do](#key-codes-and-what-they-do)
- [Bugs in this area](#bugs-in-this-area)
- [Open questions](#open-questions)
- [Sources](#sources)

## Display driver

```
UI code ──► draw image by index / draw text / fill
              │
              ▼
         frame buffer in RAM (296×240 RGB565, two pieces)      dirty row band [min y .. max y]
              │  once per main-loop pass
              ▼
         LCD driver table (15 entries, RAM 0x0306fd14) ──► panel driver = overlay 4
              │                                               set window · DMA block · standby · wake
              ▼
         DMAC1 (request 14) ──► VOP data register 0x6007002c ──► i8080 8-bit bus ──► panel
```

* **Driver selection** [AP30]: the firmware image's descriptor block (after the section table) holds a driver index
  (+0x1a4, value 1), a driver count (+0x1a8, value 2) and two tables of 15 function pointers (+0x1ac). The driver
  code is overlay *3 + index* = **overlay 4**; both tables point to the same overlay-4 functions. Overlay 3 is empty.
* **Driver table slots** [AP30]: 0 begin RAM write · 1 panel init · 2 write data · 3 set window · 4 clear · 5 DMA
  block · 6 standby · 7 wake · 8, 9 empty · 10, 11 unused · 12 clear to black · 13 fill rectangle · 14 unused.
* **Panel init** [AP30]: reset pulse on GPIO2_15 (high 10 ms, low 100 ms, high 10 ms), software reset, a vendor
  sequence that starts `DF 98 53` and switches register pages with `DE` (the pattern of the Jadard JD9853 family
  [?]), then landscape orientation (`36` = `A0`) and RGB565 (`3A` = `05`), sleep out, 120 ms, display on. The full
  table is on [hardware/display.md](../hardware/display.md).
* **Window** [AP30]: column address + 24 (the controller is 320 wide, the glass shows 296 columns), row address
  unchanged, then the RAM-write command. Logical coordinates are x 0..295, y 0..239.
* **Bus timing** [AP30]: the VOP's i8080 timing register is recomputed after every PLL change so that the write
  strobe stays roughly constant in nanoseconds (at a 200 MHz system clock the fields come out as 1 / 2 / 1). When the
  system runs from the 24 MHz crystal the register keeps its reset value.
* A second display DMA target (0x60090000 + 0x0c, probably the e-ink controller of the SoC [?]) is referenced only by
  uncalled code [AP30].

## Drawing and the frame buffer

* **Frame buffer** [AP30]: 296×240 RGB565 = 142,080 bytes in two pieces: rows 0-189 at 0x03006688 (112,480 bytes,
  section-0 data) and rows 190-239 at 0x0306fd50 (29,600 bytes, a zero-initialised region that also holds the
  driver table, a 20,000-byte backup buffer and the favourites list). Pixel pairs are stored swapped inside each
  32-bit word to suit the DMA.
* **Images** [AP30]: an image is drawn by its index in the image resource (width, height, default x, y, offset). The
  pixels are streamed from the firmware area of the internal storage in 1 KiB chunks, byte-swapped (they are stored
  big-endian) and written into the frame buffer; images are never loaded whole. One-bit masks (glyphs) are drawn
  with foreground and background colours. The image resource can hold up to 10 image sets per firmware header
  (themes); the AP30 uses one. Format: [formats/resources.md](../formats/resources.md).
* **Text**: see [ui_and_settings.md](ui_and_settings.md#text-rendering).
* **Software effects** [AP30]: list slide transitions, a dimmed backdrop behind popups, alpha-blended image draws,
  marquee text. A portrait mode (240×296) for the picture viewer, the boot logo and a main-menu animation is done by
  rotating coordinates in the pixel writer; the panel orientation never changes.
* Only one frame-buffer layer exists; the picture viewer's "decode ahead" writes into the visible buffer (possible
  artefacts, see [known_bugs.md](known_bugs.md)) [AP30, ?].

## Refresh path

[AP30]

1. Every pixel write widens the dirty row band.
2. Once per main-loop pass (unless a "no flush" message is set, the key lock is on, or the picture viewer paused
   flushing) the firmware sends **full-width rows** of the band: rows 0-189 from the first piece, rows 190-239 from
   the second, one DMA transfer each, with a 1 ms pause between them.
3. Each transfer sets the panel window, switches the VOP to four-phase split mode (two pixels per 32-bit word),
   starts DMAC1 and waits (WFI) for the DMA-done callback. The flush is **synchronous**.
4. DMA blocks hold at most 4,088 words; longer transfers are chained (up to 18 blocks). A full frame (35,520 words)
   needs at least 9.
5. The band is reset.

No tearing-effect synchronisation is used, although the panel's TE output is switched on in the init sequence: no
SoC input reads it [AP30]. Single pixels and fills are written by the CPU in two-phase mode [AP30].

## Screen off, wake and standby

| State | What the firmware does [AP30] |
|---|---|
| **Screen off** (backlight timeout, or a short Power press) | Backlight PWM stopped, backlight pin driven low, key lock on, messages 0x15 and 0x17 raised. The **panel stays in normal display mode** with its last picture; no sleep command. Painting and flushing stop while locked. |
| **Wake** (short Power press while locked) | Message to the UI and a request for a higher clock level; the backlight comes back through the UI's wake path at the saved brightness. |
| **Hold** | Screens that must stay lit (games, BT Music, picture slideshow) suspend the auto-off (message 0x1c). |
| **Panel standby** | Display off (`28`), sleep in (`10`), 120 ms, then the VOP clock is gated. Used only at reboot and power-off. Wake from standby = clock on, sleep out (`11`), 120 ms, display on (`29`). |
| **Power-off** | Goodbye image drawn and flushed, about 0.5 s of redraws, backlight off, panel standby, then the power-off sequence on [power_management.md](power_management.md). |

The backlight timeout values are in [power_management.md](power_management.md#backlight-timeout).

## Backlight and brightness levels

[AP30 unless tagged]

* PWM block 0 channel 0 on GPIO2_4, **15 kHz**. Duty = percent × period / 100; 0 % and 100 % switch the channel off
  instead.
* **Duty table** (6 entries, index = configuration byte +0x17): **85 / 80 / 70 / 60 / 40 / 95 %**. The UI offers
  brightness 1-5; how the five UI levels map to the six entries is not checked [?].
* **Polarity** is not measured on the AP30. On the Snowsky Echo Mini (same code base, same PWM settings) the duty
  value was measured to be the *off* time [EM]. If that holds here, the stock on-times are 15 / 20 / 30 / 40 / 60 /
  5 %, and the brightest stock level is only ~60 % on [?].
* Off = PWM channel stopped (block clock gated when idle), pin back to GPIO output low. During boot the pin is held
  low until the boot logo is in the panel's memory, so no garbage is shown.

## Key scanning

[AP30 unless tagged]

```
SysTick 10 ms ──► software timer, period 1 tick ──► key tick
                       1. sample the wheel phases
                       2. scan keys: Power (GPIO2_5) first, then the ladder (ADC channel 1)
                       3. start the next ADC conversion
TIMER0 every 200 µs ──► sample the wheel phases again (fast path)
UI ──► "get key event": wheel step first, then the pending key event (filtered by the key lock)
```

* **ADC rotation**: conversions run channel 1, 1, 1, 0 (keys three times, battery once). Ladder scans advance only on
  ticks with a fresh channel-1 sample, so ladder timings stretch by about 4/3 over the nominal tick counts
  [AP30 code; the stretch is computed, not measured, ?]. Power, a GPIO, advances on every tick.
* **Ladder decoding** (10-bit codes; key codes as the firmware uses them):

| ADC code | Key code | Button | Device measurement [WEB] |
|---|---|---|---|
| 0-69 | 0x004 | D-pad Right (also the boot loader's recovery key) | ~0 |
| 100-183 | 0x010 | D-pad Up | 120-121 |
| 200-309 | 0x008 | D-pad Left | 241 |
| 320-429 | 0x020 | D-pad Down | 365 |
| 442-559 | 0x002 | left pill button ("Select", spec name Function) | 488 |
| 560-679 | 0x100 | right pill button ("Start", spec name Play) | 610 |
| 700-849 | 0x040 | B | 733 |
| 850-949 | 0x080 | A | 855 (5 codes from the range edge) |
| ≥ 950 | none | released | |
| 70-99, 184-199, 310-319, 430-441, 680-699 | – | gaps: treated as "no new sample" | |

  The measurements are from the community project
  [nkahoang/hidizs-ap30-game-emu](https://github.com/nkahoang/hidizs-ap30-game-emu) (its FINDINGS notes) [WEB]; every
  value falls inside the firmware's ranges. Two ladder keys held together read as the lower-voltage one (priority
  Right > Up > Left > Down > Select > Start > B > A) [WEB, follows from the ladder]. Button names: D-pad Right is
  device-verified [AP30]; the pill-button names follow the community measurements and the stock UI roles.

* **Event word** = type in bits 31:28, key code in the low bits. Types, counted in scan steps:

| Type | Condition | Nominal (10 ms steps) | Ladder keys (≈ 4/3) |
|---|---|---|---|
| 1 press | same code for 2 steps (debounce) | 20 ms | ~27 ms |
| 2 long press | held 40 steps | 400 ms | ~530 ms |
| 3 repeat | every 12 steps after the long press | 120 ms | ~160 ms |
| 4 short release | released before 40 steps | | |
| 5 long release | released after 40 steps | | |

* Moving from one ladder key to another after the debounce keeps the first key's code until release.
* **One event slot**: scanning pauses while an event waits for the UI, so nothing is lost, but holds are not timed
  while the UI is busy.

## Power key

[AP30 unless tagged]

* GPIO2_5 (the SoC's PLAYON input), no pull, high = pressed, key code 0x001. It is read before the ladder and wins
  over any ladder key.
* For **5 s after USB power appears** the Power input is ignored (presumably plugging USB raises PLAYON for a while
  [?]).
* **Short or long release**: screen off (if unlocked, message 0x16) or wake / "locked" hint (if locked, message 0x18).
* **Held**: when Power is still down at a repeat step after more than 200 steps (first at ~2.08 s), the firmware
  requests **power-off** (message 0x1a); the request is repeated every 12 steps while the key stays down (a removed
  SDK guard, see [known_bugs.md](known_bugs.md)).
* **External 8 s reset**: holding Power for about 8 s resets the player through hardware outside the SoC's software,
  and repeats every ~10.5 s while held, under the loader and under the firmware alike [AP30, measured on a device].
  With D-pad Right held through it, the player lands in loader USB mode ([guides/recovery.md](../guides/recovery.md)).
  Details: [hardware/power.md](../hardware/power.md).
* **Wheel press = Power** [?]: the board has no separate Power tact switch; reviewers describe the wheel press as
  screen on/off and press-and-hold as power on/off, which is exactly the firmware's PLAYON behaviour. A push switch
  inside the encoder wired to PLAYON is very likely [AP30 board photos + WEB, ?].

## Volume wheel

[AP30 unless tagged]

* Phases **A = GPIO2_0**, **B = GPIO2_9**, inputs with the SoC pulls off (pull-ups external or in the encoder [?]).
* Sampled every 200 µs from TIMER0 and again on every key tick.
* Decoding: every change of A counts one step; after an A edge, A ≠ B gives event code **0x200**, A = B gives
  **0x400**. B changes alone are ignored.
* **0x200 lowers the volume, 0x400 raises it**; the volume handlers clamp to 0..100. Which physical direction is "up"
  follows from the wiring and is not tested.
* Ignored for the first **3 s after boot**.
* Steps go into two per-direction counters; the UI takes **one step per request** and the backlog is capped at one,
  so **fast turns lose steps** (see [known_bugs.md](known_bugs.md)). A wheel step restarts the backlight idle timer.
* Wheel steps arrive as type-4 (release) events with code 0x200 / 0x400.
* Steps per detent and detents per turn are unknown [?]; reviewers report 100 volume steps [WEB].
* In USB DAC mode the wheel is still read, but the events go nowhere (the Realtek chip plays the audio; see
  [usb_modes.md](usb_modes.md)).

## Screen-Off Button Settings (key lock filter)

When the screen is off the key lock is on, and the firmware filters keys by the "Screen-Off Button Settings" value
(configuration byte +0x1c; menu order from the V1.7.8 string table) [AP30]:

| Mode | Menu text | Keys accepted with the screen off | Wheel |
|---|---|---|---|
| 0 | Prev/Next Enabled | Power, Right, Left, A | blocked |
| 1 | Volume Keys Enabled | Power, Up, Down | accepted |
| 2 | All Buttons Disabled | Power only | blocked |
| 3 | All Buttons Enabled | everything except B | accepted |

* A rejected key shows the "locked" hint.
* This filter applies only when a two-entry table {80, 100} indexed by configuration byte +0x16 yields 100;
  otherwise every key while locked raises the wake / hint message. The meaning of +0x16 is open [AP30, ?].
* **Media shortcuts**: when a "media active" message (0x1aa, not identified) is set and the lock is on, short releases
  of Right / Left / right pill become next / previous / play-pause messages (0x1a7 / 0x1a8 / 0x1a9). With the lock
  off the same mapping applies to Right / Left only if configuration flag +0x2c is set [AP30, ?].
* **Quirk**: in mode 0 the right pill (play/pause) is not accepted, so play/pause with the screen off works only in
  mode 3 [AP30, from code; not tested on a device].
* **History**: early builds (reviewers' 1.2.9) disabled every control, wheel included, with the screen off. The
  setting arrived with the update described by the HIFIYF26 changelog, and reviewers say 1.3.5 fixed pocket control
  [WEB]. See [community/user_feedback.md](../community/user_feedback.md).

## Key codes and what they do

Roles in the stock UI [AP30 unless tagged]:

| Key | Code | Lists and menus | Now playing | Popups |
|---|---|---|---|---|
| D-pad Up / Down | 0x010 / 0x020 | move (library menu: 7-row pages; library lists slide) | – | move |
| D-pad Right / Left | 0x004 / 0x008 | page by one screen in lists [WEB] | track change and step seek (fast forward / rewind, commands 0xf2 / 0xf3; exact short/long split not confirmed [?]) | – |
| A | 0x080 | enter / open / apply | context actions | confirm |
| B | 0x040 | back one level; long press = main menu | back to the list; long press = main menu | cancel |
| left pill ("Select") | 0x002 | long press = options popup in library lists (add to favourites…); delete dialog in the file browser; in USB File Transfer, two presses within 1 s leave | favourites / music settings [WEB] | – |
| right pill ("Start") | 0x100 | long press in the library menu raises message 0x17a | play / pause | – |
| Power | 0x001 | screen off / on; hold 2 s = power off | same | same |
| wheel | 0x200 / 0x400 | volume down / up (volume popup) | volume | – |

The handler code names the 0x002 key "Back" in some screens and "Select" in others; the physical-button reading
(left pill) comes from the community measurements [AP30 + WEB, ?]. Reported differences between builds (Start
opening quick settings on some builds, holding Select opening Now Playing, etc.) are not yet compared in code
[WEB, ?].

## Bugs in this area

Full entries in [known_bugs.md](known_bugs.md#display-text-and-input):

* Power key held: the power-off request repeats every 120 ms [AP30].
* Ladder gaps: a button whose resistor drifts into a gap stops working [AP30, ?].
* Screen-off mode 0 refuses play/pause [AP30, ?].
* Fast wheel turns lose steps [AP30].
* The panel driver's fill-rectangle ignores its colour and always writes 0 [AP30, ?].
* The popup backdrop is dimmed with wrong colour maths (dark, greenish) [AP30, ?].
* Window clamping off by one in one mode; DMA started without a free-channel check [AP30].
* Marquee text can scroll two characters too far; one extra text line in a rectangle [AP30, ?].

## Open questions

* Exact panel controller part (JD9853 is an inference), panel frame rate, whether TE is routed anywhere.
* WR pulse width in ns; which clock the VOP timing register counts.
* Backlight polarity and the UI-level → duty-table mapping.
* Meaning of configuration bytes +0x16 and +0x2c, and of message 0x1aa.
* Encoder edges per detent, detents per turn, which direction is "up".
* Whether the wheel push switch is on PLAYON.
* Why Power is ignored for 5 s after USB power appears.
* Real ladder timings (the 4/3 stretch is derived).
* Key mapping and lock behaviour across the 0.0.0, 5.0.0 and V1.7.8 images.

## Sources

* [AP30] analysis of firmware V1.7.8: section 0 (key scan, encoder, ADC, PWM, frame buffer, LCD driver table),
  overlay 4 (panel driver), overlay 9 (USB key handler), overlay 32 (Settings); device observations (D-pad Right,
  8 s reset).
* [WEB] [nkahoang/hidizs-ap30-game-emu](https://github.com/nkahoang/hidizs-ap30-game-emu) FINDINGS notes (ladder
  measurements, key priority); reviews on [Head-Fi](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/) and
  [mobileaudiophile](https://mobileaudiophile.com/daps/hidizs-ap30-music-boy-review/) (key roles, screen-off history).
* [EM] [iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw) `ETUDE.md` (backlight polarity on the
  Echo Mini).
* [TRM] RKNanoD TRM V1.0 (VOP, DMAC, SAR-ADC, PWM, TIMER chapters).
