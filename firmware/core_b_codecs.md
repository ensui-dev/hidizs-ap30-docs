# Core B: runtime, mailbox protocol and codec modules

Status: draft, 2026-11

The RKNanoD's second Cortex-M3 ("core B", the calculation core) is used by the stock firmware **only to decode
audio**. There are ten codec modules, overlays 71-80, each a complete core-B program linked at 0x01000000: a vector
table, a small **runtime** shared by all modules (start-up, interrupts, SysTick, mailbox driver, a file client and a
buffered reader), and one decoder library. Core A loads the right module from flash and starts core B **for every
track**, then drives it through the 4-channel hardware **mailbox**: control commands on channel 1, file data on
channel 2 (core B asks, core A reads the file and writes the bytes straight into core-B RAM), a clock-change hold on
channel 0 and debug text on channel 3. This page documents that runtime, the full protocol and each module. All facts
are from V1.7.8 [AP30] unless tagged otherwise.

## Contents

- [Memory and hardware seen by core B](#memory-and-hardware-seen-by-core-b)
- [Starting and stopping core B](#starting-and-stopping-core-b)
- [The core-B runtime](#the-core-b-runtime)
- [The mailbox](#the-mailbox)
- [Channel 0: system](#channel-0-system)
- [Channel 1: decoder control](#channel-1-decoder-control)
- [Info struct](#info-struct)
- [Channel 2: file service](#channel-2-file-service)
- [Channel 3: debug text](#channel-3-debug-text)
- [Error handling](#error-handling)
- [The PCM hand-off](#the-pcm-hand-off)
- [The codec modules](#the-codec-modules)
- [Accelerators](#accelerators)
- [Module lineage across releases](#module-lineage-across-releases)
- [Open questions](#open-questions)
- [Sources](#sources)

## Memory and hardware seen by core B

| Range | What | Use by the stock modules |
|---|---|---|
| 0x00000000 | alias of HIGHRAM0 (core B's view only) | the module's vector table is at the module start, so core B boots from it |
| 0x01000000-0x0101ffff | HIGHRAM0, 128 KiB | module code (code part of overlays 71-80) |
| 0x01020000-0x0105ffff | HIGHRAM1, 256 KiB | module data; first 0x90 bytes = clock block from core A; stack top 0x01022000; RAM vector table at 0x01022000; bss, input buffers, PCM buffers |
| 0x01060000 | HIFIACC accelerator | FLAC, ALAC, APE modules |
| 0x01070000 | DMAC2 (2 channels) | FLAC, ALAC, APE modules (feeding HIFIACC) |
| 0x40110000 | mailbox | all modules |
| 0x60010000 / 0x60050000 | IMDCT36 / SYNTH accelerators | MP3 module |
| 0x03000000-0x0309ffff | core A's SYSRAM | core B reads the file descriptor there |

[TRM memory map + AP30.] Every RAM bank is visible to both cores at the same address, and nothing in the SoC stops
core B from touching any peripheral, including the clock and reset unit [TRM]. The SoC side of the dual-core design
(power domain, clocks, resets, register bits) is described in [../hardware/dual_core.md](../hardware/dual_core.md).

## Starting and stopping core B

Core A does this in the playback engine (overlay 33) [AP30]:

**Power up (when the player service starts the first track):**
1. Power the core-B domain (PD_HIGH) on; the stock code does not poll the power status.
2. Enable the mailbox clock, the bridge between the domains, every HIGHRAM bank clock, the domain's bus and matrix
   clocks and core B's bus clock.
3. Release the resets of the mailbox, the bridge, the bus matrix and both HIGHRAMs; **keep core B in reset**.
4. Clear the B→A mailbox status, enable the B→A interrupts core A wants (channels 0 and 3 here; 1 and 2 are handled by
   the playback engine), register the handlers.

**Start (every track):**
1. Hold core B in reset (clock/reset id 0x32 in the firmware's numbering).
2. For MP3 only: enable the IMDCT36 and SYNTH clocks and release their resets.
3. Load the module with the overlay loader: code to 0x01000000, data to 0x01020000 (BSS is not loaded; the module
   clears it itself).
4. Wait 5 ms, clear the "ready" flag.
5. Copy a 0x90-byte **clock-information block** to 0x01020000. The modules use only +0x20 (core-B SysTick clock, Hz)
   and +0x24 (core-B bus clock, Hz), for delay loops and the SysTick period [EM; AP30 copies the whole block]. It is
   never refreshed after a later clock change, so core-B delays are off after one [AP30 + EM].
6. Release core B's reset.
7. Wait for B→A channel 0 command 1 "ready": 200 000 polls of at least 1 µs (≥ 0.2 s). On timeout core A logs (to
   nowhere) and carries on.
8. Send the file descriptor on channel 2 (command 0x65) and wait for 0x66.

**Stop (every track end, user skip or stop):**
1. A→B channel 2 command 0x74 with data 1: core B shuts down its accelerator interrupts and DMA and answers 0x75
   (wait ≥ 2 s).
2. Assert core B's reset and gate its bus clock; for MP3 also re-assert the IMDCT36/SYNTH resets and gate them.
3. The domain stays powered; HIGHRAM keeps its contents until the next load overwrites them.

**Power down (when the player service ends):** resets of the bus matrix, both HIGHRAMs, core B and the mailbox
asserted; every clock of the domain, core B's bus clock and the mailbox clock gated; the domain powered down
(HIGHRAM contents lost); mailbox channels 0 and 3 disabled and unregistered [AP30].

Core B therefore runs **only while the music player or BT Music service exists** and a track is playing. Games are
silent, and with no music playing core B and HIGHRAM are idle [AP30].

Cost per start: 31-115 KiB copied from flash (module table below) + 5 ms fixed wait + BSS clear + ready + descriptor +
OPEN (header parse). [EM] measured OPEN at ~5 ms for WAV/FLAC, ~20-100 ms for MP3 (frame scanning) and ~65 ms for
Vorbis set-up with the same modules under its own core A.

## The core-B runtime

Every module links its own copy of one runtime, so the modules are fully independent programs [AP30]. Layout of the
MP3 module (overlay 71) as an example; the other modules have the same parts at other offsets:

| Offset in module | Part |
|---|---|
| 0x000-0x08c | vector table: 35 entries; reset handler at 0x2998 (address 0x00002999 in core B's low alias), everything else a default handler |
| 0x08c-0x168 | short delay, PSR read, fault handler that dumps registers over UART1 |
| 0x168-0x38c | UART hex/char helpers; **file client**: open / seek / read / write / close as B→A channel 2 messages |
| 0x3fe-0x564 | MP3 accelerator interrupt set-up and tear-down |
| 0x564-0xc32 | board init: interrupt and SysTick set-up, the channel 0 hold handler, debug print family, microsecond delay |
| 0xe10-0x1360 | DMA set-up, interrupt layer: RAM vector table at 0x01022000 |
| 0x1360-0x1ae0 | main program: decode service (channel 1), file-service reply handler (channel 2), scatter loader (BSS clear), the main loop |
| 0x1ae0-0x2338 | SysTick layer; C library (64-bit divide, memory and string functions, soft float for printf) |
| 0x2338-0x2c20 | **buffered file reader** (ping-pong input buffers, seek, buffer switch), reset handler, SysTick list, FLAC seek helpers |
| 0x2c20-0x2ccc | codec glue: a dispatcher for the codec sub-functions (open / decode / seek / close / info) |
| 0x2ccc-0x8160 | the MP3 decoder library |
| 0x8160-0x8f20 | message bitmap, SysTick handler, **mailbox driver** (enable / clear / read / write per channel), printf engine |

[AP30, analysis of overlay 71.] Behaviour of the runtime:

- **Start-up**: the reset handler clears BSS (MP3: 0x1d0e8 bytes from 0x0102c648), sets VTOR to its RAM table at
  0x01022000, registers SysTick and the A→B mailbox interrupts (IRQs 9-12, exceptions 25-28), and sends B→A channel 0
  command 1 "ready" [AP30].
- **Main loop**: waits for channel 1 commands and runs the decoder. In each module the loop is a jump table over the
  command number; the open-time checks differ per module (below) [AP30].
- **Input buffering**: a compressed-file buffer of 88 KiB (0x15c00) in the MP3 runtime, used as two halves; when
  one half is used up the reader switches and refills the other **synchronously**: it sends a read request and spins
  (up to 3 s) until core A has answered. Core B decodes nothing during a refill [AP30]. Read size per request:

| Module | Input buffer (each of 2) | Sectors per request | Highest HIGHRAM1 use |
|---|---|---|---|
| MP3 (71) | 9 KiB (0x2400) | 18 | ~139 KB |
| WMA (72) | 16 KiB | 32 | ~115 KB |
| AAC (73) | 8 KiB | 16 | ~141 KB |
| WAV (74) | not identified [?] | | |
| OGG (75) | 8 KiB | 16 | ~141 KB |
| FLAC (76) | 36 KiB (0x9000) | 72 | ~99 KB |
| ALAC (77) | 32 KiB | 64 | ~215 KB |
| APE (78) | 32 KiB | 64 | ~232 KB |
| DSDIFF (79) | 27.6 KiB (0x6e40) | ~55 | ~98 KB |
| DSF (80) | 32 KiB | 64 | ~98 KB |

  [AP30; "highest use" = top of the input buffers − 0x01020000.] With APE alone using ~232 KB of the 256 KB HIGHRAM1,
  two stock modules cannot be resident at the same time [AP30].
- **Debug output**: some modules are debug builds that send their log as channel 3 print requests (the WAV module and
  three others); the rest have their prints compiled out [AP30]. Faults go to a handler that dumps registers on UART1
  or spins [AP30].
- **A trap in two modules**: the OGG and WMA modules link the C library's standard `printf`, whose character output
  is a semihosting breakpoint (`BKPT 0xAB`, "write character"). Without a debugger attached, that breakpoint faults,
  so any decoder error path that prints would crash core B [AP30; untested on a device]. Lesson for custom core-B
  code: do not link a semihosting stdio.

## The mailbox

The TRM lists the mailbox only as a feature (four elements, each a command word, a data word and a flag that raises an
interrupt on the other core); it has no register chapter [TRM]. The layout below is the one both stock drivers use
[AP30 core A and core B; EM]:

| Offset | Direction | Register |
|---|---|---|
| +0x00 | A→B | interrupt enable, bit *ch* |
| +0x04 | A→B | status, bit *ch* = message pending, write 1 to clear |
| +0x08 + 8·ch | A→B | command word of channel *ch* |
| +0x0c + 8·ch | A→B | data word of channel *ch* |
| +0x28 | B→A | interrupt enable |
| +0x2c | B→A | status |
| +0x30 + 8·ch | B→A | command word |
| +0x34 + 8·ch | B→A | data word |

- Four channels per direction, one slot each (no FIFO). Sending = write the command word, then the data word; the
  Echo Mini study found that the data write raises the flag [EM; order confirmed on both AP30 sides, trigger
  unverified].
- Nothing checks whether the previous message on a channel was consumed: the protocol relies on strict
  request/response lock-step [AP30].
- Interrupts: channel *n* = IRQ 9 + *n* (vectors 0x19-0x1c) on both cores; each core sees the line for messages
  towards it [TRM + AP30].

| Channel | IRQ | Core A handler | Core B handler |
|---|---|---|---|
| 0 | 9 | system: ready, hold acknowledge | hold handshake |
| 1 | 10 | playback engine: decoder status | decoder control |
| 2 | 11 | playback engine: file service | file replies |
| 3 | 12 | print request | print done |

Notation below: `A→B chN cmd [data]`. Pointers in data words are absolute addresses valid on both cores.

## Channel 0: system

| Dir | Cmd | Data | Meaning |
|---|---|---|---|
| B→A | 1 | 0 | READY: runtime initialised (once per start) |
| A→B | 2 | 0 | HOLD: core A is about to change clocks |
| B→A | 3 | 0 | HOLD_ACK: core B is parked in its channel 0 handler |
| A→B | 4 | 0 | HOLD_EXIT: clocks changed, continue |

The hold handshake runs only while core B is running. Core A waits up to ~50 ms for HOLD_ACK, suspends DMAC1 channels
0-4 (channel 5, the I2S feed, keeps running), reprograms the PLL and dividers, sends HOLD_EXIT and resumes the DMA.
Core B spins in its handler re-reading the A→B command register for 4, at most 1000 × 5 µs = 5 ms; then it gives up,
sets a "frequency change timeout" flag and continues, possibly while the clock is still changing [AP30].

## Channel 1: decoder control

A→B (sent by the core-A front-ends):

| Cmd | Data | Meaning | Reply (B→A ch1) | Core-A wait |
|---|---|---|---|---|
| 1 | 0 | **OPEN**: parse the stream described by the last descriptor | 3 opened (data = &info) or 2 failed | ≥ 20 s |
| 4 | 0 | **DECODE** the next block | 5 decoded (data = &info) or 6 end of stream / error | none (asynchronous) |
| 0xb | position in ms | **SEEK** | 0xc (data 0 = ok, 1 = failed) | ≥ 0.2 s |
| 0xd | 0 | **CLOSE** the decoder | 0xe | ≥ 3 s |
| 7 | | re-initialise the runtime's file buffer (no reply) | | not sent by stock core A |
| 9, 0xcb, 0xcd | | accepted, no action in the stock modules | | not sent |

Extra B→A messages on channel 1:

| Cmd | Data | Meaning | Core-A answer |
|---|---|---|---|
| 8, 10 | &info | full info copies (answers to 7 / 9 in some builds) [?] | flags only |
| 0xf | &{u32 pos, u32 aux, u32 handle} | set a handle's file position (and a second per-file field) in core A's file table | A→B **ch2** 0x10, data 0 |
| 0x11 | handle | read back that handle's position fields into the block given by the last 0xf | A→B **ch2** 0x12, data = that block |

0xf / 0x11 look like saving and restoring file positions for fast seeking (FLAC seek helpers sit next to them) [?].
Their replies travel on channel 2, so channel 2 carries traffic from two layers [AP30].

**OPEN fails** in V1.7.8 for: more than 2 channels (not checked by the WAV, ALAC and APE modules), APE above 96 kHz,
DSF above about DSD256 (the DSDIFF module has no limit), and any library parse error [AP30].

## Info struct

The decoder keeps an info struct in core-B RAM; core A copies it to **0x03048ad8** in its channel 1 handler on
replies 3, 5, 8 and 10 [AP30; EM agrees on the first nine words]:

| Offset | Field | Notes |
|---|---|---|
| +0x00 | current time, ms | |
| +0x04 | total length, ms | |
| +0x08 | bit rate | |
| +0x0c | bits per sample | |
| +0x10 | sample rate, Hz | |
| +0x14 | channels | |
| +0x18 | (unused) | |
| +0x1c | PCM pointer (core-B address) | source of the get-buffer copy |
| +0x20 | PCM frames in that buffer | |
| +0x24 | buffer-ready flag | set by core A on 3 / 5 / 6 |
| +0x28 | decode-requested flag | core A's book-keeping |
| +0x2c | end-of-stream flag | set by core A on 6 |

The OPEN reply already carries a first block (the WAV module returns 4096 frames of silence) [EM]; core A zero-fills
its first output buffer as well [AP30].

## Channel 2: file service

Core B pulls the compressed stream from core A. A→B messages:

| Cmd | Data | Meaning | Reply | Core-A wait |
|---|---|---|---|---|
| 0x65 | &descriptor (core-A RAM, 0x03048b08) | "this is the file to decode"; core B reads the struct itself | B→A 0x66 | ≥ 5 s |
| 0x74 | 1 | stop: de-initialise accelerator interrupts and DMA | B→A 0x75 | ≥ 2 s |

**Descriptor** (core B reads it from core A's RAM) [AP30; EM]:

| Offset | Field |
|---|---|
| +0x00 | u8 handle 0, u8 handle 1, u8 handle 2, u8 pad |
| +0x04 | u32 file size |
| +0x08 / +0x0c / +0x10 | u32 position of handle 0 / 1 / 2 |
| +0x14 | u32 codec id (0-9, as in [audio_playback.md](audio_playback.md#codec-selection)) |

AAC (2) and ALAC (7) open the MP4 file three times (sample table, chunk offsets, data); DSDIFF (8) and DSF (9) fill
handle 1 as well, but the runtime reads the extra handles only for codecs 2 and 7 [AP30].

B→A requests, each answered on A→B channel 2 with "request + 1":

| B→A cmd | Data → block in core-B RAM | Core A action | Reply / data | Core-B wait |
|---|---|---|---|---|
| 0x69 seek | {i32 offset, u32 whence, u8 handle} | seek the open file; **write the resulting absolute position into word 0** of the block | 0x6a / result (0 = ok) | 3 s |
| 0x6b read | {u32 dest, u32 size, u8 handle} | read **straight into core-B RAM** at dest; **write the new position into word 1** | 0x6c / bytes read | 3 s |
| 0x6d write | {u32 handle, u32 src, u32 size} | write | 0x6e / result | 3 s |
| 0x6f tell | handle | | 0x70 / current offset | |
| 0x71 length | handle | | 0x72 / file size | |
| 0x73 close | handle | close the file | 0x74 / result | |
| 0x66 | 0 | acknowledge of 0x65 | (none) | |
| 0x75 | 0 | acknowledge of stop | (none) | |
| 0x68 | 0 | after a runtime file-layer re-init [?] | ignored | |
| 0xd3 | 0 | answer to A→B 0xd1 (never sent by stock core A) | ignored | |

- The position write-back is mandatory: the runtime copies it into its per-handle position table; without it the
  stream continues at the wrong offset [EM].
- Core A runs the file system **inside the mailbox interrupt** (IRQ 11), with other audio work held off [AP30].
- **Ambiguity**: A→B channel 2 0x74 means both "close result" (data = the close result) and "stop" (data = 1). The
  runtime treats 0 as a plain completion and anything else as the stop request, so a close that returned non-zero
  would be read as "stop" [AP30, both sides].

## Channel 3: debug text

| Dir | Cmd | Data | Meaning |
|---|---|---|---|
| B→A | 5 | pointer to a NUL-terminated string in core-B RAM | print request; core B keeps a busy flag |
| A→B | 6 | 0 | printed, buffer free |

Core A services print requests from every wait loop and sends the text to **UART0**, which V1.7.8 never initialises
(its pins carry the DAC's I2C bus), so nothing comes out [AP30].

## Error handling

- Every core-A wait is a counted poll loop (1 µs delay + watchdog kick + print service per iteration). On timeout it
  logs (compiled out) and **carries on as if the reply had arrived**: no core-B reset, no retry [AP30].
- OPEN failure is the only error reported upward (message 0x4f, "codec open error") [AP30].
- Core-B file-request timeouts print a timeout message (to nowhere) and use whatever is in the reply slot [AP30].
- Core A never polls core B's lock-up status bit, which the SoC provides [AP30 + TRM].
- Several malformed-file cases can hang or fault core B (WMA files of 2 GB or more, the semihosting printf paths, an
  assert compiled as an endless loop); see [known_bugs.md](known_bugs.md).

## The PCM hand-off

1. Core B decodes one block into one of its two PCM buffers in HIGHRAM1 and sends B→A channel 1 command 5 with &info.
2. Core A's channel 1 handler copies the info words and, when the audio service is waiting, requests PendSV.
3. Core A's front-end takes the frame count, **immediately sends DECODE** (core B starts the next block into its other
   buffer), and copies the ready block with a DMAC1 memory-to-memory transfer into one of two 36 KiB ping-pong
   buffers in core-A RAM (0x030361bc / 0x0303f1bc), sleeping with WFI until done. Copy length = bits per sample ×
   frames / 16 DMA units.
4. PendSV widens the samples in place and DMAC1 channel 5 feeds I2S1 ([audio_playback.md](audio_playback.md)).

[AP30.]

## The codec modules

Sizes from the image's section table (code and data are copied from flash at every start; BSS is cleared by the
module) [AP30]:

| Ov | Format | Code | Data | Load per start | Decoder (generic description) | Licence of the upstream | Hardware help |
|---|---|---|---|---|---|---|---|
| 71 | MPEG-1/2 audio layers I-III | 0x8f68 | 0xc648 | 85 KiB | integer (fixed-point) MPEG audio decoder from an open-source project, modified by Rockchip | GPL-2.0+ | IMDCT36 + SYNTH, fed by CPU stores (its DMA hooks are empty) |
| 72 | WMA (ASF) | 0x1626c | 0x67c0 | 115 KiB | proprietary Windows Media Audio decoder (Microsoft-style HRESULT error codes), ASF parser, LPC-envelope path, inverse MDCT over an FFT; **DRM code linked** (licence parsing, SHA-1, DES, RC4) used only for protected files | proprietary (assumed) | none |
| 73 | AAC in MP4/M4A/3GP, ADTS | 0x12184 | 0x24dc | 82 KiB | fixed-point AAC-LC decoder plus an MP4 box parser; a 27,728-byte constant table at the end of the code | RPSL / RCSL | none |
| 74 | WAV: PCM, MS-ADPCM, IMA-ADPCM | 0x8dd0 | 0x4e30 | 55 KiB | Rockchip PCM/ADPCM reader, an ADPCM routine from an open-source audio-file library, and a noise-suppression library with an FFT (linked; whether playback ever uses it is unclear [?]); ADPCM encoder set-up for recording is also present | LGPL-2.1+ / BSD | none; a debug build (prints over channel 3) |
| 75 | Ogg Vorbis | 0xf5d8 | 0xd184 | 114 KiB | integer, low-memory Vorbis decoder with Ogg framing | BSD | none; links semihosting printf |
| 76 | FLAC | 0x5af4 | 0x24b8 | 32 KiB | FLAC decoder derived from a large open-source multimedia library, with a fast seek | LGPL-2.1+ | HIFIACC (fixed LPC filter) + DMAC2; keeps its debug prints |
| 77 | ALAC in MP4/M4A | 0x7180 | 0x23a4 | 37 KiB | ALAC decoder from the same multimedia library, with the MP4 parser | LGPL-2.1+ | HIFIACC (adaptive FIR) + DMAC2 |
| 78 | Monkey's Audio (APE) | 0x5978 | 0x2464 | 31 KiB | APE decoder from the same multimedia library (accepts file versions up to 4170) | LGPL-2.1+ | HIFIACC (NN filters, compression > 1000) + DMAC2 |
| 79 | DSDIFF (.dff) | 0x5ad8 | 0x2290 | 31 KiB | DSD file parser + DSD-to-PCM FIR converter (44.1 kHz out), C math library | LGPL-2.1+ / BSD [?] | none |
| 80 | DSF | 0x59d8 | 0x2308 | 31 KiB | same family as 79; refuses more than ~DSD256 | LGPL-2.1+ / BSD [?] | none |

[AP30, analysis of overlays 71-80; library code byte-identical to the RKNanoD SDK copy in ReChord for MP3, AAC, WAV,
OGG, ALAC and APE (426 of 1747 functions); FLAC, DSDIFF, DSF are different builds; no library exists in the SDK copy for
WMA.] Upstream projects, versions and licence analysis: [third_party_components.md](third_party_components.md).

Notes per module [AP30]:

- **MP3 (71)**: the only module using the IMDCT36 and SYNTH blocks; core A powers them around each start and stop.
  The decoder handles layer I/II too, with a few upstream checks removed; see [known_bugs.md](known_bugs.md).
- **WMA (72)**: the largest module; no symbols or library anywhere in public references, so its structure was found
  from behaviour. The DRM path runs only for protected files.
- **AAC (73)**: AAC-LC only (no HE-AAC found) [?]; streams with more than 2 channels are refused.
- **WAV (74)**: no "more than 2 channels" check; multichannel WAV is not refused.
- **OGG (75)**: fixed comment buffers (8 comments, 36 bytes each) without bounds checks; see [known_bugs.md](known_bugs.md).
- **FLAC (76)**: the V1.7.8 build has no long seek trace; the 0.0.0 and 5.0.0 builds have a reworked seek with 15
  "FLAC seek" debug strings (see lineage).
- **ALAC / APE (77, 78)**: bump allocators that do not stop on overflow; no channel check.
- **DSDIFF / DSF (79, 80)**: every DSD rate becomes 44.1 kHz PCM; the converter takes a gain in dB.

## Accelerators

| Block | Base | IRQ | What it does | Used by |
|---|---|---|---|---|
| IMDCT36 | 0x60010000 | 7 | MP3 36-point inverse MDCT: 18 words in, computation starts on the write, 36 words out at +0x48; enable +0x800, acknowledge +0x80c | module 71 |
| SYNTH | 0x60050000 | 1 | MP3 sub-band synthesis: channel/phase register +0x804, history RAM at +0x1000; enable +0x800, acknowledge +0x80c | module 71 |
| HIFIACC | 0x01060000 | 34 (not used: completion seen through DMAC2 and polling) | fixed-point engine: FFT/IFFT 64-1024, MAC, FLAC fixed-coefficient FIR (order 1-32), ALAC adaptive FIR (order 1-32), APE NN filters; register block per instance at stride 0x3c: +0x00 DMA control, +0x04 interrupt control, +0x10 clear, +0x28 ALAC configuration (order, quantisation, bits per sample), +0x2c FLAC LPC configuration (order, quantisation) | modules 76, 77, 78 |
| DMAC2 | 0x01070000 | 40 | 2-channel DMA in core B's domain (request 0 = HIFIACC receive, 1 = transmit) | modules 76, 77, 78 |

[TRM ch. 26-28 + AP30 + EM.] The FFT and MAC functions of HIFIACC are not used by any stock module [AP30]. The FLAC,
ALAC, APE and DSF modules write the clock and reset unit themselves to enable HIFIACC and DMAC2 [AP30]. The TRM's
IMDCT/SYNTH chapters show 0x6204xxxx addresses, which contradict its own memory map and the firmware; the firmware's
addresses are the ones above [TRM vs AP30]. Register-level notes: [../hardware/dual_core.md](../hardware/dual_core.md).

## Module lineage across releases

The modules are linked at a fixed address, so identical code gives identical bytes. Comparing the code of each module
with the official Echo Mini images and the three AP30 images [AP30 + EM]:

| Module | 0.0.0 (YF26, 2026-07-23) | 5.0.0 (YF05, 2026-08-19) | V1.7.8 (YF18, 2026-10-19) |
|---|---|---|---|
| MP3, WMA | Echo Mini V3.8.0+ generation | same as 0.0.0 | older generation (Echo Mini V1.2.5-V3.7.0) |
| AAC | older (all three AP30 images identical) | same | same |
| WAV | older (= Echo Mini V1.2.5-V1.7.0) | same | matches no Echo Mini build |
| OGG | V3.8.0+ generation | same | older (= Echo Mini V2.4.0-V3.7.0) |
| FLAC | V3.8.0+ generation (reworked seek) | same | older (= Echo Mini V1.4.x-V1.7.0, V3.6.0-V3.7.0) |
| ALAC, APE | V3.8.0+ generation | same | match no Echo Mini build |
| DSDIFF | older (= V1.5.0-V3.3.0) | V3.8.0+ generation | older (same as 0.0.0) |
| DSF | older (= V3.4.0) | V3.8.0+ generation | older (same as 0.0.0) |

- The AP30 and the Echo Mini share one core-B code base; every AP30 module except V1.7.8's WAV, ALAC and APE is
  byte-identical to some Echo Mini release [AP30 + EM].
- **V1.7.8 went back to the older generation** of most modules, two months after the factory image used the newer
  ones. Hidizs' changelog for V1.7.8 says "playback stutter fixed"; a decoder rollback is a plausible part of that fix
  [?]. Bugs that the Echo Mini fixed in its V3.8.0 decoders may be back in V1.7.8 if they live on core B [?].
- The Echo Mini numbers its modules 72-81 up to V1.4.6 and **73-82 from V1.5.0** (AP30 number + 2); the Echo Mini
  V4.0.0 replaced its ALAC module (large MP4 boxes), which no AP30 image has [EM].
- No release of either product added a codec module [AP30 + EM].

More on the Echo Mini: [../related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md).

## Open questions

- Does writing the data word (not the command word) raise the mailbox flag on the AP30? [EM says yes, unverified]
- Meaning of channel 1 replies 8 / 10 and of channel 2 message 0x68 [?].
- The WAV module's input-buffer size [?].
- Is there a global exclusive monitor (do LDREX/STREX work across cores)? The TRM does not say [?].
- Do all peripheral interrupt lines reach core B's NVIC? The TRM's "20 external interrupts" per NVIC contradicts its
  own 41-line table and core B's use of IRQ 40 [TRM vs AP30].
- Does a decoder error path in the OGG or WMA module really fault core B through the semihosting breakpoint
  (device test) [?].

## Sources

- [AP30] analysis of firmware V1.7.8: core-A playback engine (overlay 33), front-ends 41-57, core-B modules 71-80;
  version comparison with the 5.0.0 and 0.0.0 images.
- [TRM] Rockchip RKNanoD TRM V1.0 (memory map, mailbox feature list, HIFIACC / SYNTH / IMDCT chapters, DMAC).
- [EM] [berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw) `ETUDE.md` §1.1-1.4 (mailbox
  protocol, core-B start), §68 / §113 (accelerators), §18 / §21 (timings), measured with the stock modules under its
  own core A; official Echo Mini images (module comparison).
- [WEB] [brnomt/ReChord](https://github.com/brnomt/ReChord): the RKNanoD SDK copy with the codec libraries; its mailbox
  guide agrees with the channel layout.
- [WEB] [BasilSkyWalk/echopod](https://github.com/BasilSkyWalk/echopod): replacement Echo Mini firmware that runs its
  own open-source decoders on core B, one per core-B image at 0x01000000, like the stock design.
