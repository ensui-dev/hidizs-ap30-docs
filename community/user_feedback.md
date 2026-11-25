# User feedback

Status: draft, 2026-11

What owners and reviewers say about the AP30: the problems they report (**pain points**) and what they wish it did
(**wishes**), grouped by topic and counted per source. The material comes from about 30 public reviews and forum
posts read in full between July and November 2026 (Head-Fi, mobileaudiophile, Moonstar Reviews, Ichos Reviews). Next
to each item this page says what the firmware analysis shows about it, so a reader can tell a hardware limit from a
firmware choice or a fixable bug. In short: the most reported pains are **Bluetooth limited to SBC (17)**, **output
power (16)**, **no Bluetooth receive mode (14)** and the **256 GB microSD limit (13)**; several firmware items (screen-off
controls, the USB prompt timeout, crashes on early builds) changed between firmware releases.

## Contents

- [How items are counted](#how-items-are-counted)
- [Top items at a glance](#top-items-at-a-glance)
- [Bluetooth](#bluetooth)
- [Audio output and sound](#audio-output-and-sound)
- [Storage and library](#storage-and-library)
- [Controls (buttons, wheel)](#controls-buttons-wheel)
- [Firmware quality and updates](#firmware-quality-and-updates)
- [Screen](#screen)
- [UI and navigation](#ui-and-navigation)
- [Apps (e-book, games)](#apps-e-book-games)
- [Build, case and ports](#build-case-and-ports)
- [USB (DAC mode, connection)](#usb-dac-mode-connection)
- [Wi-Fi and streaming](#wi-fi-and-streaming)
- [Battery and power](#battery-and-power)
- [Reviewer reports that add technical facts](#reviewer-reports-that-add-technical-facts)
- [Claims that do not match the device](#claims-that-do-not-match-the-device)
- [Open questions](#open-questions)
- [Sources](#sources)

## How items are counted

* An item's **count** is the number of distinct **(author, thread)** pairs that mention it. A *thread* is one source:
  a review with its comments, a forum thread, a showcase page. An author counts once per thread however often they
  repeat the point; the same author in two different threads counts twice.
* Similar points from different people are grouped under one item.
* Cross-posts (the same review posted on two sites) are counted once.
* Mentions by writers without hands-on use (an editorial written before launch) are shown as "+n no hands-on" and not
  counted.
* Totals: **68 pain items** from 232 mentions by 28 distinct (author, thread) contributors; **25 wishes** from 36
  mentions by 14 contributors [WEB].
* Source keys in brackets, e.g. **[CL]**, point to the [Sources](#sources) table at the end. Firmware remarks use the
  usual tags ([AP30] = our analysis; [?] = guess).

## Top items at a glance

```
Bluetooth SBC only            ████████████████▉ 17
Output power (61/137 mW)      ████████████████  16
No Bluetooth receive mode     ██████████████    14
microSD/library 256 GB        █████████████     13
No parametric EQ              ███████            7
Screen-off controls (early)   ███████            7
Firmware bugs and glitches    ███████            7
No touch screen               ███████            7
No Wi-Fi / streaming          ███████            7
Plastic edition build         ██████             6
Software immature             ██████             6 (+1)
```

| Kind of item | Pains | What decides it |
|---|---|---|
| Hardware choice (SBC-only Bluetooth chip, power, no touch, no Wi-Fi, screen size) | the largest counts | the board; firmware cannot change it |
| Firmware limit or bug (library size, gapless, cover art, sort key, USB prompt, screen-off controls, crashes) | many medium counts | the firmware; several changed between releases |
| Build and accessories (plastic shell, case thickness, cable) | small counts | the product, not the software |

## Bluetooth

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| **Bluetooth limited to SBC** (no LDAC / aptX / AAC) | **17** | ZG, IR, MS, CL, JR, PI, JA, CI, IB, CH, SS, MN, TT, IC, JQ, DE, QA | Bluetooth is a separate JieLi chip on a UART; the codec is that chip's business, not the RKNanoD's [AP30 + ?]. One reviewer's claim that "the SoC" causes the SBC limit is therefore not right [AP30] |
| **No Bluetooth receive (sink) mode** | **14** | IR, EB, MS, CL, GJ, JR, PI, IB, AB, MN, IC2, BE, JQ, QA | the firmware has only a transmit screen ("BT Music"); no receive code or strings in any AP30 or Echo Mini release [AP30 + EM] |
| Bluetooth volume low on low gain | 1 | QA | the gain setting seems to affect the Bluetooth path; how audio reaches the JieLi chip (likely analog, sampled after the DAC/amp) is not confirmed [?] |

Wishes: **Bluetooth receive mode, ideally with AAC (4)** [AD, PI, JQ, QA]; better codecs, LDAC (1) [JQ]; a phone app to
browse and control the player, HiBy Link style (1) [IR].

## Audio output and sound

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| **Output power limited** (61 mW SE / 137 mW BAL @ 32 Ω) | **16** | SU, MS, CL, PI, CI, IB, SL, CI2, AB, CH, SS, TT, IC, DD, JQ, DE | vendor figure, quoted by most reviews [WEB]; set by the RT6863 amplifier stage [AP30 + ?] |
| **No parametric EQ** (6 presets + 5-band graphic) | **7** | MS, CL, CI, CH, MN, RQ, TT | the EQ is software on the system core: presets feed a filter bank and up to 10 biquad filters [AP30]. In V1.7.8 the EQ is **skipped** for 192 kHz, DSD and ≥ 24-bit material [AP30] ([../firmware/known_bugs.md](../firmware/known_bugs.md)) |
| **No gapless playback** | **5** | CL, JR, AB, CH, MN | confirmed: every track change tears down the audio chain, reloads the decoder on core B, waits a fixed 80 ms and fades the last ~250 ms of the previous track; estimate 130-300 ms of silence [AP30]. **Partly fixed in V1.8.3:** gapless for FLAC → FLAC with the same rate, bit depth and channels (device-confirmed); every other transition unchanged [AP30]. [../firmware/audio_playback.md](../firmware/audio_playback.md#gapless-playback-v183) |
| No volume limiter | 1 | CH | the firmware has AVLS (volume limiter) code; whether it is reachable from the menus is not established [AP30 + ?] |
| PCM limited to 24-bit / 192 kHz | 1 | DD | matches the spec; DSD is converted to 44.1 kHz PCM, no native DSD or DoP output [AP30] |
| Slow track change (up to 3 s after next / previous) | 1 | CH | consistent with the full tear-down per track (decoder reload from flash, file re-parse, tag read) [AP30 + ?] |

Wishes: **more output power (3)** [CL, PI, SS]; gapless playback (1) [JR]; parametric EQ or more bands (1) [CI2].

## Storage and library

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| **microSD / library limited to 256 GB** | **13** | SU, EB, MS, CL, JR, PI, CI, AB, CH, SS, MN, TT, DE | cards above 256 GB are **not refused**; the limit is the library: at most **7,168 song records** and 28,672 files + folders per scan [AP30]. 7,168 CD-quality FLAC tracks ≈ 250 GB, probably the origin of "256 GB" [?]. A 512 GB card is reported to work [RQ] |
| Embedded cover art slow or fails to load | 5 | EB, JR, SL, RQ, IC | the cover decoder handles **baseline JPEG only** (no progressive) [AP30]; reviewers saw large (> 300 × 300) covers or some ID3 versions fail, and re-saving as ID3v2.3 helped [EB, JR] |
| Slow initial library scan | 5 | EB, SL, CH, JQ, QA | reports range from "under 40 s" [MS] to 3 min [CH] and 7-10 min [EB] for a full 256 GB card. The rebuild runs after an unclean shutdown, a format or a USB write [AP30] |
| Songs listed / shown by file name, not the title tag | 4 | CI, CI2, CH, MN | the tag reader extracts the title [AP30]; which string the song lists and Now Playing use is not yet documented [?] |
| Tiny internal storage (~210 MB) | 3 | CL, JR, BE | the user volume is 216 MiB of a ≈ 480 MiB flash; the rest holds two firmware copies, settings and library data [AP30] |
| Library rescans or asks for an update unprompted | 2 | SL, CH | rebuild triggers include any unclean stop; a crash and restart (see firmware bugs) would set the flag [AP30 + ?] |
| An artist's albums play alphabetically, not by year | 1 | EB | the library sorts with pinyin-style keys [AP30] |
| Cannot create playlists on the device (import only) | 1 | AB | |
| Cannot delete files on the device | 1 | QA | **contradicted** for V1.7.8: the folder browser has "Delete file" with a Yes/No dialog; the favourites popup's "delete" only removes the favourite [AP30] |
| No CUE sheet support | 1 | IR | the browser's file-type list includes CUE [AP30]; what it does with it is not documented [?] |
| Playing a folder queues everything, not just that folder | 1 | SS | |
| Some tracks lose their metadata | 1 | CH | |

Wishes: microSD cards above 256 GB (2) [EB, JR]; browse albums by cover art (1) [EB].

Favourites vanishing after a microSD swap is a known firmware behaviour (the library rebuild filters per-disk
favourites against a list that is not reloaded on a disk change) [AP30]; FiiO fixed similar bugs on the Echo Mini
([../related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md#bugs-fiio-fixed-that-match-ap30-symptoms)).

## Controls (buttons, wheel)

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| **Controls do not work with the screen off** (early firmware) | **7** | EB, CL, GJ, JR, CI, SL, AB | fixed by the "Screen-Off Button Settings" option (Prev/Next, Volume, all disabled, all enabled) listed in the `HIFIYF26` changelog and present in V1.7.8 [WEB + AP30]. Key events are filtered by a key lock that the backlight timeout sets [AP30] |
| Buttons / D-pad stiff | 3 | MS, DE, QA | |
| Buttons rattle / click loudly | 2 | IR, IC2 | |
| Volume wheel / push button feels fragile | 2 | SL, BE | |
| Buttons cannot be remapped | 1 | EB | key handling is per window; no remap setting [AP30] |
| Function / Play buttons very small | 1 | DE | |
| Only the power / wheel button wakes the screen | 1 | IC | |
| Volume wheel cannot scroll menus | 1 | QA | wheel steps reach the UI as key events, so list scrolling would be a per-window key mapping [AP30 + ?] |
| Volume wheel too small | 1 | CL | |
| Wheel turns by accident when pressed | 1 | CI | the wheel's push switch is probably the Power key [?] |

Wishes: customisable buttons (A = play/pause, Start/Select used in all apps) (2) [IR, EB]; pocket control with the
screen off (2) [EB, CI2]; softer, clickier D-pad (1) [MS]; wheel scrolls lists (1) [QA].

## Firmware quality and updates

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| **Firmware bugs and glitches** | **7** | SU, JR, PI, CH, SS, CB, QA | reports: freezes and self-restarts during playback or navigation (fixed by a factory reset for two reviewers) [SS, CB]; 24/96 and 24/88.2 FLAC files crashing `HIFIYF26` until a reset [JR]; B jumping to Now Playing, A and B swapped on stock firmware [CH]; folder bugs [PI]. Possibly related: V1.7.8 refuses APE > 96 kHz and DSD above ≈ DSD512 that 5.0.0 tried to decode [AP30]. [../firmware/known_bugs.md](../firmware/known_bugs.md) |
| **Software immature, needs polish** | **6** (+1 no hands-on) | CL, PI, AB, CH, TT, IC (+ MF) | |
| No automatic / OTA updates | 2 | MS, RQ | there is no network; updates are file copies [AP30] |
| Firmware update process unreliable | 1 | QA | the official method is a file on the internal storage; the updater checks nothing about free space or layout and aborts on any read failure [AP30]. [../firmware/update_process.md](../firmware/update_process.md) |

## Screen

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| **No touch screen** | **7** | ZG, SU, IR, MN, RQ, BE, DE | hardware: no touch controller [AP30] |
| Hard to read in sunlight / narrow viewing angles | 4 | JR, CH, MN, RQ | backlight is PWM with 5 user levels [AP30] |
| Low resolution, small text soft | 3 (+1 no hands-on) | IR, MS, JR (+ MF) | fonts are 1-bit bitmaps (12 and 16 px), so no anti-aliasing is possible without a new font format [AP30] |
| Small screen with thick bezels | 2 | GJ, IB | |

## UI and navigation

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| Menu structure / UI polish | 5 | IR, JR, IC, QA, PI, EB, CI2 (counted once per author and thread) | Start/Select not used consistently across apps; settings layout; home grid of six icons [WEB + AP30] |
| No dark theme | 4 | EB, JR, PI, CI2 | the UI is drawn from a fixed set of 478 images [AP30]; a theme would need new resources |
| Slow navigation / UI response | 4 | PI, SL, JQ, QA | |
| No search in the library | 2 | EB, SS | |
| Delay of 1-2 s when waking the screen | 1 | JR | |

Wishes: faster UI response, also in games (2) [JQ, QA]; dark theme / theme selection (1) [EB].

## Apps (e-book, games)

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| E-book reader impractical on a 2-inch screen | 5 | CL, GJ, PI, CH, JQ | |
| Games hard to play on the small screen / buttons | 4 | GJ, JR, CH, JQ | |
| E-book reader supports only TXT | 2 | JQ, QA | confirmed: the reader opens TXT only [AP30] |
| Games unresponsive | 2 | JQ, QA | games are silent and keep background music running [AP30] |
| Block puzzle game not full screen | 1 | PI | |

Wishes: EPUB / PDF support (1) [QA]; more and better games (1) [PI]. V1.7.8 has 29 games in the menu and 4 more
complete games without a menu entry [AP30] ([../firmware/games.md](../firmware/games.md)).

## Build, case and ports

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| Plastic edition build criticised | 6 | SL, CH, MN, RQ, CB, QA | |
| Thick / bulky with the case on | 4 | MS, CH, RQ, QA | |
| No clothing / belt clip or lanyard in the box | 3 | IR, JA, IB | Kickstarter bundles had a lanyard [WEB] |
| Ports crowded on one edge (USB-C between the two jacks) | 3 | PI, IC, QA | board layout: both jacks and USB-C sit on one edge [AP30] |
| Magnetic phone mount not secure on the move | 2 | JR, CH | |
| Battery visible through the transparent shell | 1 | DD | |
| Glued shell, poor repairability | 1 | PI | the battery is soldered, no connector [AP30] |
| Included case is hard plastic | 1 | PI | |

Wishes: better port placement (2) [PI, QA]; clip for clothing (1) [IB]; leather-like case (1) [CH]; repairable shell
and replaceable battery (1) [PI]; shock-absorbing TPU case (1) [PI].

## USB (DAC mode, connection)

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| Included USB-C cable directional / seems not to carry data | 3 | JR, CH, RQ | the short C-to-C cable is directional: printed end into the phone; wrong way round = charge only (Hidizs statement quoted by [JR]) [WEB] |
| No USB audio output to an external DAC | 3 | JR, SS, IC | the RKNanoD USB stack runs in device mode only [AP30] |
| USB DAC mode drains the player battery | 2 | MS, JR | USB DAC mode runs from the player's battery; DAC mode and charging are separate modes (Hidizs statement quoted by [JR]) [WEB] |
| USB connection prompt times out to storage mode | 2 | JR, PI | reviewers on early builds (`HIFIYF26`) saw ~3 s; in V1.7.8 the menu waits 60 s and then keeps the current choice (default file transfer) [WEB + AP30] |
| Volume wheel does nothing in USB DAC mode | 2 | JR, IC | expected: USB DAC mode is the separate Realtek ALC5686 chip and the wheel is wired to the RKNanoD, so only host volume applies [AP30] |
| USB DAC mode limited to 24-bit / 48 kHz | 1 | PI | the Realtek chip's own limits (not yet captured from its USB descriptors) [?]; the firmware's own, unused USB-audio overlay is 48 kHz / 16-bit [AP30] |

Wishes: USB prompt waits for the user's choice (2) [JR, PI]; higher USB DAC sample rates (1) [PI]; volume wheel works
in USB DAC mode (1) [JR]. [../hardware/usb.md](../hardware/usb.md), [../firmware/usb_modes.md](../firmware/usb_modes.md)

## Wi-Fi and streaming

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| **No Wi-Fi or streaming** | **7** | MS, CL, GJ, IB, RQ, BE, DE | hardware: no Wi-Fi chip on the board [AP30]. (The AP80 PRO MAX regulatory filing that lists the AP30 describes Wi-Fi, but it shows a different board [WEB].) |

## Battery and power

| Item | Count | Sources | What the firmware analysis says |
|---|---|---|---|
| Auto power-off / sleep timer maximum too short (120 min) | 1 | EB | confirmed: sleep timer off / 10 / 15 / 30 / 60 / 120 min, idle auto-off off / 1 / 5 / 10 min [AP30] |
| Battery drains fast at high volume / high load | 1 | MS | |
| Battery runtime shorter than expected | 1 (+1 no hands-on) | TT (+ MF) | measured runtimes: 9.6-11.2 h on 3.5 mm, 7.4-9 h on 4.4 mm, 7+ h on Bluetooth [MS, JR, CH, IC and others] |
| Warms up while charging and playing | 1 | MS | |

Wish: longer auto power-off timer, in hours (1) [EB].

## Reviewer reports that add technical facts

Single observations worth checking once (no counts):

| Report | Source | Status |
|---|---|---|
| 100 volume steps with an arc overlay | [CL], [JR] | not yet traced in code [?] |
| EQ presets Normal, Bass, Metal ("Heavy"), Pop, Jazz, Unique + Custom (60 / 300 / 1k / 3k / 6k Hz, ±6 dB in 3 dB steps) | [CL], [IC], [CH] | preset names match the V1.7.8 English strings [AP30] |
| EQ lowers the gain automatically to avoid clipping | [AB] | matches a pre-gain stage in the EQ [AP30] |
| Five DAC filters: fast / slow roll-off, minimum / linear phase, NOS | [CL] | the filter is a DAC register setting [AP30] |
| A button on Now Playing = A-B repeat | [EB] | matches the firmware's A-B repeat commands [AP30] |
| Full settings tree on build 1.3.5 (repeat modes, scan mode Accelerating / Constant, screen-off 15 s-30 min, brightness 1-5, power timers, filters, gain, Screen-Off Button Settings, About, Language, Reset) | [CH], [IC2] | matches the V1.7.8 string table [AP30] |
| Boot about 4-5 s, plus 2-3 s to the first song | [IC], [CH] | the "Updating Library" screen after an unclean stop lasts ~480 ms [AP30, measured] |
| Library scan of a 256 GB lossless card in under 40 s, kept across restarts | [MS] | rebuild only after unclean shutdown, format or USB write [AP30] |
| Key mapping differs between builds; holding the wheel = power; Start = play/pause or quick settings | [CL], [IC], [CH], [JR], [EB] | [../hardware/input.md](../hardware/input.md) |
| Updates needed the SD card, an on-device format and a reset | [QA] | official method is internal storage [WEB]; cause unknown [?] |
| microSD may need formatting on the device (FAT32 recommended from a PC) | [CH] | the FAT layer reads FAT16 / FAT32 / exFAT [AP30]; why some cards are not recognised is unknown [?] |
| Firmware builds seen: "1.2.9" (July), "1.3.5" (August), `HIFIYF26` | [EB], [CH], [GJ], [JR] | [../overview/firmware_releases.md](../overview/firmware_releases.md) |
| Hidizs was already working on new firmware in August 2026; reviewer requests (screen-off controls, UI tweaks) reached a pre-shipping update | [PI], [CI2] | `HIFIYF05` (2026-08-19) followed [AP30] |

## Claims that do not match the device

| Claim | Source | What is true |
|---|---|---|
| "HidizsOS is Linux-based" | [MS], [AB], [CI], [GJ] | bare-metal Rockchip RKnano SDK firmware, no Linux [AP30] |
| "The AP30 works as a Bluetooth receiver" | [ZG] | transmit only; 14 reviewers report no sink mode [AP30, WEB] |
| "No built-in storage, microSD only" | [ZG] | a 216 MiB internal user volume exists [AP30] |
| "The EQ runs at DAC level" | [MS] | the EQ is software on the system core; only the filter choice is a DAC setting [AP30] |
| "The AP30 pairs the CS43198 with an SGM amplifier" | [IC] (in an Echo Nano review; his AP30 review says RT6863) | RT6863 by marking [AP30] |
| "S/PDIF DoP supported" (spec list) | [PI], [AB] | no S/PDIF or DoP path in the firmware [AP30] |
| "Gapless: yes" (hifioasis spec summary) | [WEB](https://www.hifioasis.com/dap/hidizs-ap30-music-boy/) | not gapless up to V1.7.8; V1.8.3: FLAC → FLAC of the same format only [AP30] |
| "Internal memory only holds firmware files, no songs" | [BE] | the internal volume appears as "Internal" in the browser and e-book reader [WEB] |

## Open questions

* Which string the library lists show (file name or title tag), and whether that changed between builds [?].
* Whether the AVLS volume-limiter code can be reached from the UI [?].
* The exact cause of crashes on early builds (24/96 FLAC on `HIFIYF26`) and whether V1.7.8 still has them [?].
* The Realtek chip's supported USB DAC rates [?].
* Why some updates and microSD cards only work after an on-device format [?].

## Sources

All sources are public; authors are cited by their public handle. Tag [WEB] unless stated.

| Key | Author | Source |
|---|---|---|
| AB | Austin Brooks | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44196/) |
| AD | AdamPA1006 | [Head-Fi showcase comment](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/#js-comment-8577) |
| BE | Berian | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44585/) |
| CB | curiousBee | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44638/) |
| CH | ChifiLab | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44230/) |
| CI | Cinder | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44112/) |
| CI2 | Cinder | [Head-Fi Mid-Fi thread post](https://www.head-fi.org/threads/mid-fi-general-chat-for-all-discussions-and-general-chat-a-thread-for-all.972437/post-19229982) |
| CL | Chris Love | [mobileaudiophile review](https://mobileaudiophile.com/daps/hidizs-ap30-music-boy-review/) |
| DD | dynamicdb | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44864/) |
| DE | derici2800 | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/45351/) |
| EB | eboyoyoyoy | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/43790/) |
| GJ | GoldenJoe | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44020/) |
| IB | IceIceberg | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44119/) |
| IC | Ichos | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44646/) (also his [Echo Nano review](https://www.head-fi.org/showcase/snowsky-echo-nano.29229/review/45142/)) |
| IC2 | Ichos (Petros Laskis) | [Ichos Reviews, full original](https://ichos-reviews.com/hidizs-ap30-review/) |
| IR | IryxBRO | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/43735/) |
| JA | jant71 | [Head-Fi TWS thread post](https://www.head-fi.org/threads/everything-tws-and-wireless-with-a-dash-of-whatever-wired-thrown-in-for-flavor.978750/post-19223980) |
| JQ | JQuB3 | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/45296/) |
| JR | jreqtech | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44027/) |
| MF | Mahir Efe Falay (no hands-on) | [mobileaudiophile editorial](https://mobileaudiophile.com/editorial/hidizs-ap30-music-boy-editorial-the-sansa-clip-era-has-a-new-contender/) |
| MN | MayoNotes | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44388/) |
| MS | Moonstar Reviews | [moonstarreviews.net review](https://moonstarreviews.net/hidizs-ap30-music-boy-review/) |
| PI | Pietro (Kindlefirehditaly) | [mobileaudiophile review](https://mobileaudiophile.com/daps/hidizs-ap30-high-res-music-player-review-pietros-take/) |
| QA | QuietlyAmused | [mobileaudiophile review](https://mobileaudiophile.com/daps/hidizs-ap30-musicboy-review-you-win-little-you-lose-some-more/) (cross-posted on Head-Fi by savitr; counted once) |
| RQ | requiemreview | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44398/) |
| SL | SLOFLOisLONELY | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44117/) |
| SS | Sae Sakura | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44271/) |
| SU | suman134 | [Head-Fi discovery thread post](https://www.head-fi.org/threads/the-discovery-thread.586909/post-19192592) |
| TT | Tonytex | [Head-Fi review](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44472/) |
| ZG | Zerstorer_GOhren | [Head-Fi discovery thread, initial impression](https://www.head-fi.org/threads/the-discovery-thread.586909/post-19186211) |

Chris Love's review was also cross-posted on Head-Fi (Ceeluh7); it is counted once. Reviews that could not be read
automatically are listed in [../overview/sources.md](../overview/sources.md#head-fi-showcase-reviews).
[AP30] remarks: our analysis of firmware V1.7.8 (and the older images where named) and measurements on a device.
