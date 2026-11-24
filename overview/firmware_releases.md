# Firmware releases

Status: draft, 2026-11

Three official AP30 firmware files are known: `HIFIYF26.IMG` (header date 2026-07-23), `HIFIYF05.IMG` (2026-08-19,
the "11-Game Firmware", found as the factory firmware on a retail unit) and `HIFIYF18.IMG` (2026-10-19, **V1.7.8**, 29
games). All three are 29,360,132-byte RKnanoFW containers with valid checksums. This page gives their identity
(dates, versions, sizes, SHA-256, section counts), what changed between them, how the `HIFIYFnn` naming works, and
one non-Hidizs file that uses the same container (`HIFIEC90.IMG`, the RECHO community firmware for the Echo Mini).
The container format itself is described in [../formats/rknanofw_container.md](../formats/rknanofw_container.md).

## Contents

- [The files](#the-files)
- [Where they come from](#where-they-come-from)
- [Container facts per file](#container-facts-per-file)
- [What changed between releases](#what-changed-between-releases)
- [Version numbers: header, UI, file name](#version-numbers-header-ui-file-name)
- [File names: HIFIYFnn and ECHOMINI](#file-names-hifiyfnn-and-echomini)
- [The non-Hidizs file: HIFIEC90.IMG (RECHO)](#the-non-hidizs-file-hifiec90img-recho)
- [Open questions](#open-questions)
- [Sources](#sources)

## The files

| File | Hidizs name | Header date | Header version | Size (bytes) | SHA-256 |
|---|---|---|---|---|---|
| `HIFIYF26.IMG` | "AP30-HIFIYF26 Firmware-0727" (Drive folder title) | 2026-07-23 | 0.0.0 | 29,360,132 | `ca8c991ec33dc98ebe4381c1db91262ad73f8eec098adccedb6d8028be3429b0` |
| `HIFIYF05.IMG` | "AP30 Music Boy 11-Game Firmware" | 2026-08-19 | 5.0.0 | 29,360,132 | `d69ca5012ff13fbf55d22dbb517a3419938e0673530d75452d6a82ee07c9cfc3` |
| `HIFIYF18.IMG` | "AP30 Music Boy V1.7.8 Firmware" | 2026-10-19 | 8.0.0 | 29,360,132 | `c7601873cb3be8d1320225c69669e504576f7bcb1126595a9040492338e79840` |

All hashes and header fields [AP30, read from the files]. The factory firmware found on the internal flash of a
retail unit (both slots) is byte-identical to the public `HIFIYF05.IMG` [AP30, device read-out]. No build older than
`HIFIYF26.IMG` and none newer than V1.7.8 is known (2026-11).

```
2026-07-23        2026-08-19              2026-10-19
HIFIYF26 ───────► HIFIYF05 ─────────────► HIFIYF18 (V1.7.8)
0.0.0             5.0.0 (factory)         8.0.0
1 game            11 games                29 games (+4 hidden)
277 strings       289 strings             307 strings
```

## Where they come from

| File | Published at | Notes |
|---|---|---|
| `HIFIYF26.IMG` | a public Google Drive folder ["AP30-HIFIYF26 Firmware-0727"](https://drive.google.com/drive/folders/1FS4LT7nPmJlrgBJD76_OU4EqBXUDNuzb), linked from reviews (Chris Love on mobileaudiophile, IceIceberg on Head-Fi) and reportedly from Head-Fi; **not** on the Hidizs Download Center | file dated "Jul 23", instructions document "Jul 27" [WEB] |
| `HIFIYF05.IMG` | [Hidizs Download Center](https://www.hidizs.net/pages/download-center) → [Drive folder "11-Game Firmware"](https://drive.google.com/drive/folders/1eh8GAXxhXflLeVO4Y43jqXNZsKySmr3K) | file and instructions dated "Sep 28" [WEB] |
| `HIFIYF18.IMG` | Hidizs Download Center → [Drive folder "AP30 Firmware-V 1.7.8"](https://drive.google.com/drive/folders/1UtbNfDBERrcP6VWIMiwKfIeSnyiECXn8) | file dated "Oct 18" (one day before its header date, probably a time-zone effect [?]), PDF instructions "Oct 27" [WEB] |

The folders are public; no login is needed [WEB]. Drive shows no year on these dates.

### Hidizs changelogs [WEB]

| File | Changelog (Hidizs instructions, as quoted) |
|---|---|
| `HIFIYF26.IMG` | improved DSD256 compatibility; fixed a blank screen in Favorites; new **Screen-Off Button** setting (Function → System Settings → Screen-Off Button Settings) so buttons work with the screen off; fixed A/B input recognition; updated translations |
| `HIFIYF05.IMG` | "11-Game Firmware": the ten extra games |
| `HIFIYF18.IMG` | V1.7.8: 29 games; playback stutter fixed; Custom EQ fixed |

**Oddity:** the `HIFIYF26.IMG` instructions describe fixes, yet by content it is the oldest build of the three (fewest
games and strings, oldest header date) [AP30]. Its header date equals the Kickstarter launch day [WEB + AP30]. It was
probably the update offered to early reviewers on top of an even earlier pre-release build that is not public [?].

## Container facts per file

| | `HIFIYF26` | `HIFIYF05` | `HIFIYF18` (V1.7.8) |
|---|---|---|---|
| Header vendor / model | "Rockchip" / "RKnano SDK 1.0" | same | same |
| `header.size` (image + padding, = offset of the header copy) | 0x1b24000 | 0x1b3c000 | 0x1b90000 |
| Total file | 0x1c00000 + 4-byte CRC | same | same |
| Checksum, header copy, zero padding | all valid | all valid | all valid |
| Boot stages 0-2 | empty | empty | empty |
| Code stage (stage 3) size | 0x15a664 | 0x1649f8 | 0x188714 |
| Section slots in the code stage | **83** | **93** | **113** |
| Slots that contain code | 61 | 71 | 91 |
| Second-core codec modules | slots 71-80 (10 decoders) + slot 70 | same | same |
| Game overlays | slot 81 (one game) | slots 81-91 (11 games) | slots 81-111 (29 menu games + 4 hidden) |
| "BT Music" (Bluetooth output screen) | slot 82 | slot 92 | slot 112 |
| Font blobs | 12 px (0x201c06 B) + 16 px (0x211c06 B) | same sizes | same sizes |
| GBK table blob | 0x1ca34a B | same | same |
| String table: languages × records | 21 × **277** | 21 × **289** | 21 × **307** |
| String record size | 0x102 B | 0x102 B | **0x112 B** (more child slots in the menu tree) |
| Image resources | 478 images, 296 × 240 boot screen, blob 0x127a526 B | same | same |

All values [AP30]. Layouts: [../formats/stage3_sections.md](../formats/stage3_sections.md),
[../formats/resources.md](../formats/resources.md).

The BT Music overlay has the same size (0x168a B of code) in all three files, and the code-page tables, fonts and
image resources keep their sizes [AP30]: the releases differ in code and strings, not in artwork.

## What changed between releases

### HIFIYF26 (0.0.0) → HIFIYF05 (5.0.0)

* **Games: 1 → 11** [AP30]. `HIFIYF05` has game overlays 81-91. A reviewer lists the eleven games that the update
  brought (Retro Block Puzzle, Snake, Box Pusher, Brick Breaker, Block Shooter, Tank Battle, Gomoku, Minesweeper, Maze,
  Sudoku, Make 24; "production units will have all 11 games built in") [WEB]; these are exactly the first eleven
  games of V1.7.8's game menu (overlays 81-91) [AP30]. `HIFIYF26`'s single game overlay is about the size of the
  block-puzzle game, so it is probably the block game the Kickstarter page advertised [?].
* **Strings: 277 → 289 records** (same record layout) [AP30].
* **Second-core decoders:** both images carry the same generation of decoder modules for MP3, WMA, OGG, FLAC, ALAC and
  APE, and the same AAC and WAV modules. `HIFIYF05` also has newer DSDIFF and DSF modules [AP30]. That generation
  matches the Echo Mini's V3.8.0 rebuild (2026-07-18), including a long FLAC seek debug trace (15 "FLAC seek:"
  strings) [AP30 + EM]. See [../related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md).
* Compared with V1.7.8, the `HIFIYF26` MP3 module has 212 of 279 functions identical, 61 moved, 6 changed; its FLAC
  module has about 60 changed functions; AAC is identical (303 / 303) in all three files [AP30].
* USB connection prompt: reviewers on `HIFIYF26` saw the "USB Audio / File Transfer" prompt vanish after about 3 s
  [WEB]; in V1.7.8 the timeout is 60 s [AP30]. Not yet checked in the older images' code [?].

### HIFIYF05 (5.0.0) → HIFIYF18 (V1.7.8, 8.0.0)

* **Games: 11 → 29 in the menu, plus 4 hidden games** that have code and windows but no menu entry (a pipe-flying
  game, a bomb-laying maze game, a dot-eating maze chase and a dig-and-climb gold game) [AP30]. Game list:
  [../firmware/games.md](../firmware/games.md).
* **Strings: 289 → 307 records**, and the record grows from 0x102 to 0x112 bytes (29 instead of 21 child slots per
  menu node), needed by the longer game menu [AP30]. A Traditional Chinese string that used the Simplified characters
  for "games" in 5.0.0 is corrected in V1.7.8 [AP30].
* **Decoders rolled back.** V1.7.8 carries **older** second-core decoders than the two earlier AP30 images: its MP3,
  WMA, AAC, OGG, FLAC, DSDIFF and DSF modules are byte-identical to Echo Mini modules from before FiiO's V3.8.0
  rebuild; its WAV, ALAC and APE modules match no known Echo Mini release; the FLAC seek trace is gone [AP30 + EM].
  Hidizs's changelog says "playback stutter fixed"; going back to the older decoders is a plausible way that fix was
  made [?].
* **Heavy files refused:** 5.0.0 opened APE files above 96 kHz and DSF/DFF above about DSD512; V1.7.8 rejects them
  with a decoder-open error [AP30]. Such files were too heavy to decode in real time and were a likely stutter source
  [?].
* **EQ skipped for hi-res:** V1.7.8 skips the per-block EQ / effect call when the sample rate is 192 kHz, the file is
  DSD, or the bit depth is 24 or more [AP30; "bit depth" reading of the field: ?]. 5.0.0 applied it whenever an EQ
  preset was active. So the custom EQ probably has no effect on hi-res playback in V1.7.8 [?]; it looks like a CPU
  budget fix for the stutter [?]. Details: [../firmware/known_bugs.md](../firmware/known_bugs.md).
* "Custom EQ fixed" (changelog): the specific change was not isolated [?].
* Port offsets: a community project that patches V1.7.8 found 18-24 of its 25 patch-point functions again in 5.0.0
  by masked signatures, shifted by 0x280-0x678 bytes (not a constant shift) [WEB].

### Unchanged in all three

* Container, header vendor/model, fonts, GBK table, image set (478 images), the ten codec modules' set (MP3, WMA, AAC,
  WAV, OGG, FLAC, ALAC, APE, DSDIFF, DSF), the AAC module bytes [AP30].
* No licence notice, attribution or source offer for the open-source code inside the decoders, in any of the three
  images (code, strings, About page, image names) [AP30]. See
  [../firmware/third_party_components.md](../firmware/third_party_components.md).
* The update logic that accepts `ECHOMINI.IMG` and `HIFIYFnn.IMG` (checked in V1.7.8; the template strings are in all
  three [AP30]).

## Version numbers: header, UI, file name

Three numbering schemes exist and none maps cleanly onto another:

| Scheme | Values seen | What it is |
|---|---|---|
| Header version field (BCD major.minor.rev) | 0.0.0, 5.0.0, 8.0.0 | written by the image builder; the firmware stores the installed value in its settings and returns it from a Rockchip vendor SCSI command ("fw version 5.0.0 → 8.0.0" seen after updating a device) [AP30] |
| Header date (BCD) | 2026-07-23, 2026-08-19, 2026-10-19 | build date; shown on the About page [AP30]. Not used by the updater [AP30] |
| Public version | "V1.7.8" | Hidizs's name for `HIFIYF18.IMG` [WEB] |
| UI versions reported by reviewers | "1.2.9" (July 2026), "1.3.5" (August 2026) | pre-release / review builds; which files they correspond to is unknown [WEB, ?] |
| File number | 26, 05, 18 | not chronological; any `HIFIYF00`-`89` name is accepted [AP30] |

The Echo Mini shows the same pattern: its header version is the release number only by accident (V1.2.5 = 5.0.0,
V1.6.2 = 0.6.2, most others 0.0.0) [EM].

## File names: HIFIYFnn and ECHOMINI

At boot the firmware scans the volume for an update file [AP30]:

1. `ECHOMINI.IMG` first;
2. then `HIFIYF00.IMG` … `HIFIYF89.IMG`; the last one found wins and its number is stored.

The scan uses two name templates in the firmware's data. The second template is the Snowsky Echo Mini's own name,
left in place when Hidizs changed the first one [AP30 + EM]:

| Firmware | Template 1 | Template 2 |
|---|---|---|
| AP30 (all releases) | `HIFIYF00.IMG` | `ECHOMINI.IMG` |
| Echo Mini 8 GB (every version) | `HIFIEC00.IMG` | `ECHOMINI.IMG` |
| Echo Mini 512 MB (V3.7.0 and later) | `MINIV100.IMG` | `MINIMINI.IMG` |

Consequences:

* An AP30 accepts any `HIFIYFnn.IMG` and also `ECHOMINI.IMG`; installing a rebuilt V1.7.8 under the name
  `ECHOMINI.IMG` was proven on a device [AP30].
* **An Echo Mini firmware named `ECHOMINI.IMG` would also be picked up by an AP30.** The container check would pass
  (same format), but the Echo Mini firmware is built for a different board (320 × 170 panel, two CS43131 DACs, other
  pins). Never put an Echo Mini image on an AP30 under that name [?: not tried; the result would at best be a
  non-working image, recoverable through loader mode].
* No Echo Mini build accepts `HIFIYF*.IMG`, so an AP30 image on an Echo Mini is ignored by name alone [EM].
* "YF" probably is Hidizs's product/project code; its meaning is unknown [?].

How the update then proceeds (checks, FW2-then-FW1 write order): [../firmware/update_process.md](../firmware/update_process.md).

> **Warning**
> Installing any image rewrites both firmware slots. Keep an official image at hand and know the recovery path
> (D-pad Right + Power with USB connected → loader USB mode, [../guides/recovery.md](../guides/recovery.md)) before
> trying anything unofficial. The hidden boot area (physical sectors 0..0x1FFF) is never written by updates and must
> never be written by hand; never use `rkdeveloptool ef` or download random loaders.

## The non-Hidizs file: HIFIEC90.IMG (RECHO)

`HIFIEC90.IMG` is **not an AP30 firmware**. It is RECHO 0.10.1, a closed-source community firmware for the Snowsky
Echo Mini, published at [recho.atzkey.workers.dev](https://recho.atzkey.workers.dev/) [WEB]. It is listed here because
it uses the same RKnanoFW container, so tools for the AP30 format read it too.

| Field | Value [AP30, read from the file] |
|---|---|
| Size | 5,242,884 bytes (`header.size` 0x450000) |
| SHA-256 | `1269a40033ca02e47ddfd091d50327d95c08c8c26fa59914fca5b483e933a560` (matches the hash on the RECHO site [WEB]) |
| Header date / version | 2026-10-23 / 0.10.1 |
| Header vendor / model | "RECHO" / "2d11bdcd" (the stock images say "Rockchip" / "RKnano SDK 1.0") |
| Checksum, header copy, padding | valid |
| Blobs | code stage (0x3b8e8 B) + three font blobs; **no** string table, GBK table or image resources |
| Code stage | 91 section slots (the Echo Mini's count), 9 with code, one second-core module (slot 78) |

* The file name follows the Echo Mini pattern `HIFIECnn`, which the AP30 updater does **not** accept, so an AP30
  ignores it [AP30].
* RECHO says it plays FLAC and MP3 on the second core with its hardware accelerators, WAV, and has a 10-band EQ;
  source code "will be published after the project matures"; no licence is stated [WEB]. More:
  [../related/community_projects.md](../related/community_projects.md).

## Open questions

* Which internal builds the reviewers' "1.2.9" and "1.3.5" were, and whether a build older than `HIFIYF26` was ever
  public [?].
* Which game is in `HIFIYF26`'s single game overlay (size suggests the block-puzzle game) [?].
* The exact code change behind "Custom EQ fixed" in V1.7.8 [?].
* Whether V1.7.8 brings back decoder bugs that FiiO fixed in the Echo Mini's V3.8.0 decoders (OGG "unsupported
  format" on Previous track, missing APE/WMA tags, missing MP3 covers) [?: device test needed].
* The USB prompt timeout and key mapping in the older images (code comparison not done) [?].
* Where V1.7.8's WAV, ALAC and APE modules come from (a Hidizs-only build, or an Echo Mini build not in the public
  archive) [?].

## Sources

* [AP30] analysis of `HIFIYF26.IMG`, `HIFIYF05.IMG` and `HIFIYF18.IMG` (headers, section tables, string tables,
  function-level comparison of the three images); device read-out of the factory firmware; update and downgrade tests
  on a retail device.
* [EM] comparison with all 26 official Echo Mini releases: [../related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md).
* [WEB] [Hidizs Download Center](https://www.hidizs.net/pages/download-center) and the Drive folders linked above;
  [Hidizs Kickstarter launch post](https://www.hidizs.net/blogs/news/ap30-music-boy-kickstarter-launch-wearable-hi-res-music-player);
  reviews quoting the changelogs and versions:
  [Austin Brooks](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44196/),
  [ChifiLab](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44230/),
  [jreqtech](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44027/),
  [eboyoyoyoy](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/43790/),
  [Ichos](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44646/),
  [Chris Love](https://mobileaudiophile.com/daps/hidizs-ap30-music-boy-review/),
  [IceIceberg](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44119/).
* [WEB] [nkahoang/hidizs-ap30-game-emu](https://github.com/nkahoang/hidizs-ap30-game-emu) `docs/FINDINGS.md` (5.0.0
  port offsets); [RECHO](https://recho.atzkey.workers.dev/).
