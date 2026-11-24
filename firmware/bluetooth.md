# Bluetooth (firmware side)

Status: draft, 2026-11

Bluetooth on the AP30 is a separate JieLi chip with its own Bluetooth stack and firmware. The stock RKNanoD firmware
only switches it on and off with one GPIO and talks to it over a UART with a short ASCII command protocol: scan,
connect, disconnect, poll status, start and stop the stream. Audio does not travel over that UART; all evidence says
the JieLi samples the DAC's analog output and encodes SBC itself. This page describes the firmware side: where the
code lives, the power-up handshake, the states the firmware tracks, pairing and the paired list, the UI, timers and
what the firmware does on each module message. The byte format of the UART frames and the chip itself are on
[hardware/bluetooth.md](../hardware/bluetooth.md).

## Contents

- [Where the code is](#where-the-code-is)
- [Power-up handshake](#power-up-handshake)
- [Link layer as the firmware implements it](#link-layer-as-the-firmware-implements-it)
- [States and transitions](#states-and-transitions)
- [Pairing and the paired list](#pairing-and-the-paired-list)
- [Settings, screen and status bar](#settings-screen-and-status-bar)
- [Playback and volume](#playback-and-volume)
- [Remote keys](#remote-keys)
- [Bugs in this area](#bugs-in-this-area)
- [What the firmware cannot do](#what-the-firmware-cannot-do)
- [Open questions](#open-questions)
- [Sources](#sources)

## Where the code is

[AP30]

| Part | Location |
|---|---|
| BT Music screen (task 47) | overlay 112, loaded in the main code window; the playback engine is loaded alongside |
| link layer, status poll, power-off of the module | section 0 (resident) |
| Settings → Bluetooth (On / Off / Search / Paired) | overlay 32 |
| stream start / stop on playback start / stop | overlay 33 (playback engine) |
| persistent data | configuration block +0x1cc … +0x2d9 |

## Power-up handshake

[AP30]

1. Drive GPIO2_7 (module power), GPIO2_16 and GPIO2_17 (UART pins) low and wait 100 ms: a power-cycle reset of the
   module.
2. Mux GPIO2_16 to UART1A transmit and GPIO2_17 to receive; 115200 baud, 8N1; enable the receive interrupt only.
3. GPIO2_7 high, wait 100 ms, mark "Bluetooth on".
4. Wait up to **6 s** (6000 × 1 ms, watchdog kicked) for the module's ready frame `CV1`. The main loop is blocked
   during this wait.
5. No ready frame in time → power the module off again (pins low), show the failure, back to Settings.
6. After `CV1`: if a device is remembered and Bluetooth is set to On, send a connect to the last address; otherwise
   clear the scan list and start a scan.

While the module is off, GPIO2_7, GPIO2_16 and GPIO2_17 are GPIO outputs driven low (at boot, in the power-off path
and when Bluetooth is switched off) [AP30], presumably so the unpowered module is not fed through its UART pins [?].

## Link layer as the firmware implements it

[AP30]

* **Receive**: on the UART interrupt the firmware drains the FIFO into a 128-byte buffer until it has been empty for
  about 1 ms, then posts "frame received". Frames are delimited by **idle time**, not by a terminator or checksum.
  The parser looks for the first `C` in the first 100 bytes and decodes from there.
* **Transmit**: one pending frame of up to 10 bytes, sent byte by byte from the main loop (blocking on "TX FIFO not
  full").
* No acknowledgement or retransmission: the periodic status poll recovers the state.
* UART1A is also where the crash handler prints its register dump, and where the boot loader prints its banner: the
  module sees those bytes if it is powered at that moment. The stock firmware powers it only on demand [AP30].
* Frame format and the full command / event tables: [hardware/bluetooth.md](../hardware/bluetooth.md).

## States and transitions

The BT Music overlay keeps a small state machine [AP30; state names are descriptive]:

```
          power-up OK (CV1)
 OFF ───────────────────────────► IDLE ◄─────────────────────────────┐
  ▲                                │  │                               │
  │ Off in Settings,               │  │ remembered device            │ CTOK (disconnected),
  │ 45 s with no link              │  │ (boot / On)                  │ connect error (CLER/CHER),
  │ outside the BT screen,         │  ▼                               │ CT00 sent (cancel / unpair /
  │ power-off                      │ CONNECTING ── CLOK / CHOK / CH ──► CONNECTED
  │                                │  │  (retry after 5 s: CH06,       │
  │                                │  │   give up after 30 s)          │
  │                    Search / no │  ▼                               │
  │                    device      SCANNING ── user picks a result ──► CONNECTING
  │                                   (CSEN = done, CP00 after 30 s)
```

| Event (firmware side) | Frame sent | When [AP30] |
|---|---|---|
| start scan | `CS00` | BT screen opened with no remembered device; Search in Settings; after a disconnect |
| stop scan | `CP00` | user cancels; scanning longer than **30 s** |
| connect | `CL06` + 6-byte address | user picks a device; boot-time reconnect to the last device |
| retry connect | `CH06` + address | 5 s into a connect attempt (difference from `CL06` not known [?]) |
| disconnect / cancel | `CT00` | user cancels a connect; connecting longer than 30 s; "Disconnect / Unpair?" confirmed; a "linking" status while devices are paired and a link is flagged |
| status poll | `CQ00` | every **3 s** on the BT screen, every **5 s** elsewhere while the module is on |
| stream on / off | `CY0` + one byte | 0x00 when a link comes up and when playback pauses or stops; **0x14** when playback starts or resumes (the Echo Mini's stock firmware sends 0x1E [EM]; meaning of the byte unknown [?]) |
| unknown | `CC00` | long press of A while connected [?] |

Module messages and the firmware's reaction [AP30]: `CV1` ready (only during power-up); `CKKK` clears a "waiting"
flag; `CS` + address + name = one scan result; `CSEN` scan finished; `CSER` / `CLER` / `CHER` errors (connect errors
show "Disconnect" and return to idle); `CLOK` connect succeeded (device appended to the paired list and saved);
`CHOK` / `CH` connected; `CL` link attempt over; `CTOK` disconnected; status replies `CQO` (connected to this device;
address and name updated), `CQS` (scanning), `CQL` (linking), `CQI` (idle). Byte layouts:
[hardware/bluetooth.md](../hardware/bluetooth.md).

* **Auto power-off**: when the module is on but no device is connected for **45 s** outside the BT screen, the
  firmware powers it off by itself [AP30].
* **Reconnect bug**: the retry after 5 s was meant to choose between two frame variants, but the condition can
  practically never be true, so the retry always sends the `CH` variant (see [known_bugs.md](known_bugs.md#bluetooth))
  [AP30].

## Pairing and the paired list

[AP30 unless tagged]

* Scan results: at most **6** are kept; repeats are dropped by comparing the **byte sum** of the address (a weak test:
  two different addresses with the same sum collide). Names are UTF-8, up to 31 bytes are kept.
* Pairing = picking a scan result; the firmware sends the connect frame and, on success, appends the device to the
  paired list. No PIN or passkey handling exists in the firmware; whether the JieLi handles one by itself is unknown
  [?].
* Persistent fields in the configuration block (saved with the settings; persistence of every field not verified
  [?]):

| Offset | Content |
|---|---|
| +0x1cc | last device address, 6 bytes |
| +0x1d2 … | paired list: entries of 0x26 bytes = 6-byte address + 32-byte UTF-8 name |
| +0x2b6 | current device name |
| +0x2d7 | paired count |
| +0x2d8 | "connected" flag |
| +0x2d9 | "Bluetooth on" flag |

* "Has a remembered address" is tested two different ways in the code (first byte only vs sum of all 6 bytes), so
  an address starting with 0x00 is treated as empty in one path [AP30, ?].
* Unpair: "Unpair?" Yes/No → disconnect frame; the list entry is removed [AP30; removal details not traced, ?].

## Settings, screen and status bar

[AP30]

* **Settings → Bluetooth**: *Bluetooth On* (reconnect to the remembered device, or scan if there is none), *Off*
  (power the module down, pins low), *Search* (scan), *Paired* (list). The main menu's Bluetooth icon opens the same node ([ui_and_settings.md](ui_and_settings.md#main-menu-and-the-top-level-screens)) [?: start-node reading].
* **BT Music screen** (task 47, overlay 112): scan list, connection state and texts ("Scanning…", "Connect",
  "Connecting…", "Connected", "Disconnect?", "Unpair?", "No Paired Devices"), volume keys. It holds the backlight
  auto-off while shown.
* **Status bar**: Bluetooth off / on and not connected / connected icons.
* The power-off path always powers the module down first ([power_management.md](power_management.md)).

## Playback and volume

[AP30 unless tagged]

* The playback engine sends the stream-on frame when playback starts or resumes and stream-off when it pauses or
  stops.
* **While a link is up the firmware raises the DAC output level**: the CS43198 attenuation is reduced by 5-15 steps
  depending on the volume, and the volume is re-applied whenever the link state changes. A reviewer reports that
  Bluetooth loudness follows the analog gain setting [WEB]. Together with the missing digital audio link (no I2S to
  the module; the UART at 115200 baud carries ~11.5 kB/s against 176 kB/s for 16-bit / 44.1 kHz stereo) this says the
  JieLi **digitises the analog output** and encodes SBC itself [?: strong inference]. On the Snowsky Echo Mini, with
  the same protocol, two GPIOs route the analog signal to the module [EM]; on the AP30 no routing GPIO changes on
  connect, so the input is probably tapped permanently [?].
* The player volume (0..100) sets the level the module samples; the BT screen's volume keys change the same setting.
* Whether the wired outputs stay live during Bluetooth playback is not traced [?].

## Remote keys

Module messages forwarded to the player when it is in a matching state [AP30; the AVRCP reading is an inference, ?]:

| Module message | Forwarded as |
|---|---|
| `CP`, `CC` | play / pause |
| `CA`, `CB` | next / previous track |
| `CD`, `CU`, `CM` | ignored (remote volume down / up / mute? [?]) |

## Bugs in this area

Full entries in [known_bugs.md](known_bugs.md#bluetooth):

* Reconnect retry always sends the `CH` variant [AP30].
* Inconsistent "has address" test [AP30, ?].
* A screen-title copy reads past its source string (harmless) [AP30].
* Dead code: an uncalled power-on routine, list-select and volume routines [AP30].
* Scan de-duplication by address byte sum [AP30].

## What the firmware cannot do

* **Codecs** (SBC only): codec choice is entirely inside the JieLi chip; the protocol has no codec, bitpool or rate
  command in either direction [AP30; EM agrees]. The analog hand-off also caps quality at the JieLi's ADC.
* **Receive (sink) mode**: would need JieLi firmware with a sink role and a command to switch roles (no sink strings
  or frames in any AP30 or Echo Mini release [AP30 + EM]), an audio path from the JieLi to the headphones (not known
  to exist), and a way to reprogram the JieLi (unknown on this board) [?].

Both are frequent user requests; see [community/user_feedback.md](../community/user_feedback.md).

## Open questions

* JieLi part number (marking `FP00115-56C4`) and capabilities.
* Meaning of the `CY0` byte, of `CC00`, `CKKK`, `CD` / `CU` / `CM`, and the `CL06` / `CH06` difference.
* PIN / passkey pairing support.
* Where the JieLi audio input is tapped (DAC output, amplifier), and whether the wired outputs are muted.
* An unreferenced 8-byte frame `55 01 02 01 00 02 AA 00` in the image: leftover of another module protocol [?].

## Sources

* [AP30] analysis of firmware V1.7.8: overlay 112 (BT Music), section 0 (UART link, status poll, power-off), overlay
  32 (Settings), overlay 33 (stream start / stop), DAC volume code; English string table.
* [EM] [BasilSkyWalk/echopod](https://github.com/BasilSkyWalk/echopod) (its research and hardware notes): the
  same protocol on the Snowsky Echo Mini, analog routing GPIOs.
* [WEB] Hidizs product page (Bluetooth 5.3, SBC, transmit only); reviews (loudness follows gain; SBC-only and no-sink
  complaints, counted in [community/user_feedback.md](../community/user_feedback.md)).
