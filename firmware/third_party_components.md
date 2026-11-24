# Third-party components

Status: draft, 2026-11

The AP30 firmware image is mostly Rockchip's RKNanoD SDK plus Hidizs' own code, but its audio decoders come from
well-known open-source projects (libmad, FFmpeg, libsndfile, Xiph Tremor, Speex, RealNetworks Helix) and a
proprietary WMA decoder, and it statically links Arm's C micro-library. This page lists what is in the image, where,
the upstream base and its licence as stated by the upstream project, and what notices the images carry (none). It
reports facts and what the sources say; it is not a legal assessment.

## Contents

- [Components](#components)
- [Present in which release](#present-in-which-release)
- [Licence notices in the images](#licence-notices-in-the-images)
- [How the codec modules are built and loaded](#how-the-codec-modules-are-built-and-loaded)
- [Fonts](#fonts)
- [Not in the image](#not-in-the-image)
- [Related chips with their own firmware](#related-chips-with-their-own-firmware)
- [Library revisions and changes worth knowing](#library-revisions-and-changes-worth-knowing)
- [Open questions](#open-questions)
- [Sources](#sources)

## Components

Function counts are those of the V1.7.8 overlays. Core-B overlays run on the second Cortex-M3 core
([core_b_codecs.md](core_b_codecs.md)).

| Component | Where in the image | Upstream base | Licence (as stated upstream) | Evidence |
|---|---|---|---|---|
| **MP3 decoder** | core-B overlay 71 (279 functions) | **libmad 0.15.1b** (Underbit Technologies) | GPL v2 or later; a commercial licence is offered by Underbit ([underbit.com](https://www.underbit.com/products/mad)) [WEB] | byte match with Rockchip's MP3 library, whose debug info names its own directory `libMad` and keeps libmad header guards [AP30] |
| **FLAC decoder** | core-B overlay 76 (248) | FFmpeg n0.8 FLAC decoder | LGPL 2.1 or later | Rockchip library + firmware comparison [AP30] |
| **APE decoder** | core-B overlay 78 (266) | FFmpeg v0.6 APE decoder | LGPL 2.1 or later | same [AP30] |
| **ALAC decoder** | core-B overlay 77 (286) | FFmpeg n2.1 ALAC decoder | LGPL 2.1 or later | same; FFmpeg's LGPL header survives in Rockchip's ALAC sources [AP30] |
| **WAV MS-ADPCM** | core-B overlay 74 (209) | libsndfile MS-ADPCM code, a pre-2007 version | LGPL 2.1 or later | Rockchip WAV library; no exact upstream copy exists (libsndfile's public history starts later) [AP30] |
| **Noise suppression** (inside the WAV module) | core-B overlay 74 | Speex 1.2beta3 preprocessor and filter bank + kiss_fft | BSD-style (3-clause) | the library's macro info names `speex-1.2beta3` [AP30] |
| **OGG Vorbis** | core-B overlay 75 (343) | Xiph Tremor, "lowmem" branch (2007), with libogg framing | BSD-style (3-clause) | Rockchip OGG library; the Tremor headers keep their licence block in Rockchip's sources [AP30] |
| **AAC decoder** | core-B overlay 73 (303) | RealNetworks Helix fixed-point AAC (2005, LC only) | RPSL 1.0 or RCSL; the Helix file headers offer no GPL option | Rockchip AAC library [AP30] |
| **DSD to PCM** (DSF, DSDIFF) | core-B overlays 79, 80 (229, 246) | probably Maxim Anisiutkin's SACD Decoder and Sebastian Gesemann's dsd2pcm, with constants from the Philips DST reference code | SACD Decoder: LGPL 2.1+ in its 2011-2014 releases, GPL later ([Kodi copy](https://github.com/xbmc/audiodecoder.sacd)); dsd2pcm: BSD (as quoted in [FFmpeg's dsd.c](https://ffmpeg.org/doxygen/7.1/dsd_8c_source.html)); Philips DST: ISO MPEG-4 reference-software notice "must be included in all copies of derivative works" [WEB] | structure and field names of Rockchip's DSD libraries; **not confirmed by a code comparison** [?] |
| **WMA decoder + DRM** | core-B overlay 72 (355) | Microsoft WMA porting kit (assumed) | proprietary | identified by behaviour (HRESULT error codes, ASF parser, SHA-1 / DES / RC4 DRM code); no library or symbols in any public reference [AP30, ?] |
| **Arm C micro-library** (C library, soft float, 64-bit helpers, math `pow` in the DSD modules) | section 0, and **a separate copy in every core-B overlay** | Arm's embedded compiler toolchain | Arm end-user licence: target libraries may be redistributed in object form as part of an application ([Arm compiler end-user licence](https://www.keil.com/Content/eula/mdkeula.html)) [WEB] | runtime helpers inside every module [AP30] |
| **Rockchip RKNanoD SDK**: OS layer, drivers, GUI, file system, codec glue, core-B runtime, EQ and fade libraries, JPEG / BMP decoders | everywhere | Rockchip "RKNanoD MP3 SDK V1.3" (2016) | proprietary (Rockchip copyright headers) | [AP30] |
| **Fonts** (12 px, 16 px) | font blobs | Rockchip SDK fonts, a few glyphs redrawn by Hidizs; the 16 px font's 6,763 GB2312 hanzi are bit-identical to **HZK16** | unclear (see [Fonts](#fonts)) | [AP30] |
| **Hidizs' own code**: UI changes, 33 games, AP30 drivers | section 0, overlays | – | proprietary | [AP30] |

## Present in which release

All three official AP30 images contain every codec module [AP30]:

| Module | 0.0.0 (`HIFIYF26.IMG`, 2026-07-23) | 5.0.0 (`HIFIYF05.IMG`, 2026-08-19) | V1.7.8 (`HIFIYF18.IMG`, 2026-10-19) |
|---|---|---|---|
| 71 MP3 (libmad) | yes: 212 identical, 61 moved, 6 changed of 279 | yes, same counts | yes (baseline) |
| 73 AAC (Helix) | yes: 303 / 303 identical | yes: 303 / 303 identical | yes |
| 74 WAV + noise suppression | yes | yes | yes |
| 75 OGG (Tremor) | yes | yes | yes |
| 76 FLAC (FFmpeg) | yes (60 functions changed) | yes | yes |
| 77 ALAC (FFmpeg) | yes | yes | yes |
| 78 APE (FFmpeg) | yes | yes | yes |
| 79 / 80 DSD | yes | yes | yes |
| 72 WMA | yes | yes | yes |

## Licence notices in the images

**No AP30 image carries a licence notice, an attribution, a licence text or a source offer** [AP30]:

* A byte search (ASCII and UTF-16LE) of each whole image for "GPL", "libmad", "Underbit", "FFmpeg", "Xiph", "Speex",
  "libsndfile", "RealNetworks", "Helix", "Copyright", "(C)", "©" and "License" finds nothing relevant. The only hits
  are "vorbis" as a file-type tag, "Rockchip" in the header vendor field, a "Microsoft OS string Descriptor" in USB
  code, and in 5.0.0 / V1.7.8 three bytes "GPL" that happen to occur inside Thumb machine code [AP30].
* The string tables (277 / 289 / 307 records in 21 languages) have no licence or open-source entry; the About page
  shows version, date and storage only; none of the 478 image names mentions a licence [AP30].
* The AP30 user manual on the Hidizs Download Center ends with warranty and support sections, and the download page
  mentions no open source, licences or source code [WEB, visual check].
* Rockchip's codec libraries themselves contain no licence strings; only some of Rockchip's SDK headers keep the
  upstream licence blocks (FFmpeg, Tremor) [AP30, from public SDK copies].
* The firmware files are published on public Google Drive folders linked from the
  [Hidizs Download Center](https://www.hidizs.net/pages/download-center) (V1.7.8 and the "11-Game" 5.0.0) and from a
  Head-Fi post (0.0.0); no login is needed [WEB].

The RECHO community firmware for the Snowsky Echo Mini (`HIFIEC90.IMG`, 0.10.1) also carries no licence text; its
site says the source is not yet published "pending resolution of legal issues with IPs used in this firmware"
([recho.atzkey.workers.dev](https://recho.atzkey.workers.dev/)) [WEB]. Its two font blobs are byte-identical to the
AP30's, Hidizs' redrawn glyphs included [AP30].

## How the codec modules are built and loaded

* In Rockchip's SDK project each core-B codec is its own build target: the codec library, the core-B runtime and the C
  micro-library are linked into one program with its own vector table, exported as a byte array and pulled into the
  main firmware [?: SDK project structure seen in public SDK copies].
* The AP30 matches this: overlays 71-80 are each linked at 0x01000000 and carry their own runtime and library copy;
  at run time core A copies one module into core B's RAM and starts core B; the two exchange data through the hardware
  mailbox and shared-memory structures [AP30].
* The update file still ships everything as **one image**, installed and verified as one unit [AP30].

## Fonts

Compared glyph by glyph (300 random code points per range, best shift ±3 px) [AP30]:

| Candidate | 16 px font | 12 px font |
|---|---|---|
| GNU Unifont 15.1.05 | CJK 0 / 300 exact; ASCII 7 / 94 | CJK 0 / 300 |
| WenQuanYi Bitmap Song 1.0.0-RC1 | CJK 0 / 300 | CJK 4 / 300; ASCII 36 / 94 exact |
| **HZK16** (16×16 Song, UCDOS era) | **all 6,763 GB2312 hanzi bit-identical** | – |
| HZK12 | – | 0 / 400 exact |

* The 16 px font's Chinese glyphs are the classic HZK16 bitmaps (compared with the copy in
  [shanshanjade/HZK16](https://github.com/shanshanjade/HZK16)), which reached the AP30 through Rockchip's SDK font.
  HZK16 circulates without any licence statement; its origin and owner are unclear [WEB, ?].
* The 12 px font's CJK source is unknown; an embedded bitmap of a common system font is a plausible, unchecked guess
  [?].
* Hidizs redrew Vietnamese and a few other glyphs [AP30]. Format: [formats/resources.md](../formats/resources.md).

## Not in the image

* The Xvid MPEG-4 video decoder (in the SDK) and FreeRTOS (in Rockchip's separate wireless-audio SDK) are not in any
  AP30 image; the AP30 has no video overlay [AP30].
* Rockchip's spectrum-analyser and random-number libraries are not linked; the shuffle uses its own simple generator
  [AP30].

## Related chips with their own firmware

| Chip | Firmware | In the RKNanoD image? |
|---|---|---|
| Realtek ALC5686 (USB DAC mode, `0bda:4a35`) | in the chip (its data sheet describes embedded flash; no external flash visible next to it) | no: no Realtek string, ID or blob [AP30] |
| JieLi Bluetooth chip (marking `FP00115-56C4`) | its own flash; linked by a UART | no: no JieLi strings [AP30]. JieLi publishes some SDKs openly (for example [fw-AC63_BT_SDK](https://gitee.com/Jieli-Tech/fw-AC63_BT_SDK), Apache-2.0), with the Bluetooth stack as closed libraries [WEB, ?]; which SDK built the AP30's chip is unknown |

See [hardware/usb.md](../hardware/usb.md) and [hardware/bluetooth.md](../hardware/bluetooth.md).

## Library revisions and changes worth knowing

Facts that matter when comparing the firmware with the upstream projects [AP30]:

* **Mixed library builds**: ALAC combines parts from two Rockchip library builds (2015 and 2016); APE, FLAC and the
  DSDIFF library are newer revisions than any public Rockchip SDK copy (APE version limit 4170; FLAC with a new seek
  and new error messages; DSDIFF without debug output, 9,408-byte frames, frame-aligned seek, two filter tables of
  315 / 129 taps).
* **DSD output** is always converted to 44.1 kHz PCM (the SDK library used 176.4 / 88.2 kHz).
* **WAV**: a later, debug-heavy build with an IEEE-float path and a sample-rate whitelist extended to 256 / 352.8 /
  384 kHz; the DTS-in-WAV rejection is no longer called.
* **OGG**: page CRC check and page sequence check removed in the AP30 build; Rockchip's fixed-size comment buffers
  replace Tremor's dynamic allocation (see [known_bugs.md](known_bugs.md#ogg-vorbis-decoder)).
* **MP3**: several upstream error checks removed (bad Huffman data, Layer II mono bitrate limit); mixed-block granules
  decoded the wrong way round (see [known_bugs.md](known_bugs.md#mp3-decoder)).
* **AAC**: Helix's mid-side overflow handling and part of the intensity-stereo scaling are missing.
* **Semihosting output**: the OGG and WMA modules link the C library's `printf`, whose character output is a
  semihosting breakpoint; without a debugger this faults core B on the error paths that print.

Public reference copies used in this comparison have their own quirks (for example the commonly used Arduino Helix
copy adds bounds checks and changes a clip constant); see [known_bugs.md](known_bugs.md#errors-in-public-reference-material).

## Open questions

* Whether Rockchip or Hidizs hold a commercial libmad licence or an RCSL licence for Helix (unknown, private).
* Confirmation of the DSD libraries' origin by a code comparison with the 2011-2014 SACD Decoder.
* Whether the Echo Mini's official firmware carries notices (no official Echo Mini image checked for this).
* Source of the 12 px CJK glyphs.

## Sources

* [AP30] analysis of the firmware images 0.0.0, 5.0.0 and V1.7.8 (overlays 71-80, section 0, fonts, string tables,
  image names); byte searches; glyph comparisons; comparison with Rockchip's codec libraries from public SDK copies.
* [WEB] upstream projects: [libmad](https://www.underbit.com/products/mad), [FFmpeg legal](https://ffmpeg.org/legal.html),
  [RPSL 1.0](https://opensource.org/license/rpsl-1-0), [Arm compiler end-user licence](https://www.keil.com/Content/eula/mdkeula.html),
  [HZK16 copy](https://github.com/shanshanjade/HZK16), [GNU Unifont](https://unifoundry.com/pub/unifont/unifont-15.1.05/font-builds/),
  [WenQuanYi](https://downloads.sourceforge.net/project/wqy/wqy-bitmapfont/1.0.0-RC1/wqy-bitmapsong-bdf-1.0.0-RC1.tar.gz);
  [Hidizs Download Center](https://www.hidizs.net/pages/download-center); [RECHO](https://recho.atzkey.workers.dev/);
  public Rockchip SDK copies such as [xinghuaman/RKNanoD_MP3_V1.3_20161102](https://github.com/xinghuaman/RKNanoD_MP3_V1.3_20161102).

*This page records facts and what the upstream sources state. It is not legal advice.*
