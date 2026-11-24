# Sources

Status: draft, 2026-11

Every external source this collection relies on, grouped by kind, with its version, a public link where one exists,
its licence for code projects, and what it was used for. Facts taken from these sources carry the tags [TRM], [DS],
[EM] or [WEB] (see [conventions.md](conventions.md)). Facts tagged **[AP30]** come from our own analysis of the
official firmware images (V1.7.8 unless another version is named) and from measurements on a retail device; they have
no external link.

## Contents

- [Rockchip SoC documents](#rockchip-soc-documents)
- [Datasheets of the other chips](#datasheets-of-the-other-chips)
- [Rockchip tools and repositories](#rockchip-tools-and-repositories)
- [Hidizs: product, firmware, campaign](#hidizs-product-firmware-campaign)
- [Regulatory records](#regulatory-records)
- [Community projects](#community-projects)
- [Snowsky Echo Mini: official firmware and pages](#snowsky-echo-mini-official-firmware-and-pages)
- [Reviews and forum posts about the AP30](#reviews-and-forum-posts-about-the-ap30)
- [Looked at, not applicable](#looked-at-not-applicable)
- [Not linked on purpose](#not-linked-on-purpose)

## Rockchip SoC documents

| Source | Version, date, size | Link | Used for |
|---|---|---|---|
| **Rockchip RKNanoD TRM** | V1.0, 2015, 427 pp. | [rockchip.fr](https://rockchip.fr/Rockchip%20RKNanoD%20TRM%20V1.0.pdf) | **the register map** (tag [TRM]): address map, interrupt list, DMA request list, register summaries for CRU, GRF, PMU, DMAC, ACODEC, SDMMC, eMMC, I2S, VOP, SPI, SARADC, timers, GPIO, WDT, PWM, I2C, UART, EBC, SFC. Every base address and interrupt number found in the AP30 code matches it. One known difference: the TRM shows the I2S transmit FIFO as a window at +0x400, the firmware's audio DMA writes +0x24 |
| RKNanoD datasheet | **V1.8**, 2022, 39 pp. (latest) | [rockchip.fr](https://rockchip.fr/RKNanoD%20datasheet%20V1.8.pdf) | packages (-N QFN68, -G LFBGA121, -L LQFP128), pin tables, electrical data |
| RKNanoD datasheet | V0.1, 2015, 33 pp. | [rockchip.fr](https://rockchip.fr/RKNanoD%20datasheet%20V0.1.pdf) | feature inventory (6 UART, 2 timers, 3 I2C, 2 I2S, 5 PWM, 2 SPI, SFC, 2 DMACs with 6 + 2 channels, 4-channel mailbox, 8-channel 10-bit SAR-ADC, RAM per core) and the pin-mux tables for QFN68 and LFBGA121. No register map |
| RKNanoD datasheet | V1.2, V1.7 | [V1.2](https://rockchip.fr/RKNanoD%20datasheet%20V1.2.pdf), [V1.7](https://rockchip.fr/RKNanoD%20datasheet%20V1.7.pdf) | intermediate revisions, not used |
| RKNanoC datasheet | V1.7, 2013, 25 pp. | [rockchips.net](https://rockchips.net/wp-content/uploads/2025/08/RKNanoC-datasheet-V1.7.pdf) | **not the AP30's chip**; used to show why the `RKNANOC` USB ID is a leftover (1× Cortex-M3 100 MHz, 224 KB SRAM, one UART / I2C / I2S) |
| Qiita: "Rockchip RKNanoD" notes (eggman) | — | [qiita.com](https://qiita.com/eggman/items/7822981acba166469e49) | memory map from the system core's view; pointers to SDK trees; not checked further |

## Datasheets of the other chips

| Chip | Source | Link | Notes |
|---|---|---|---|
| Cirrus Logic **CS43198** DAC | datasheet DS1156F2 (Dec 2022) | [statics.cirrus.com](https://statics.cirrus.com/pubs/proDatasheet/CS43198_DS1156F2.pdf) | registers, filters, volume, DSD/DoP support of the chip (tag [DS]) |
| Richtek **RT6863** amplifier | none public found | — | role from the Hidizs spec sheet only |
| Realtek **ALC5686** USB audio codec | datasheet Rev 0.10 (2019), only via third-party copies | — (no official link) | describes an embedded flash; product class only |
| NXP **PCF8563** / **PCF85163** RTC | NXP datasheets | [PCF8563](https://www.nxp.com/docs/en/data-sheet/PCF8563.pdf) ([archived](https://web.archive.org/web/20261106054103/https://www.nxp.com/docs/en/data-sheet/PCF8563.pdf)), PCF85163 (discontinued, no longer on nxp.com; HGSEMI clone [via LCSC](https://www.lcsc.com/product-detail/C20618054.html)) | register map the AP30's AnalogTek AT85163S follows (no AnalogTek datasheet found) |
| Jadard **JD9853**-class panel controller | none located | — | the AP30 panel's init sequence fits this family [?] |
| JieLi Bluetooth SoC | probably **AC6956C4** (marking suffix `-56C4`) [?]: datasheet copy at LCSC | [AC6956C4 at LCSC](https://www.lcsc.com/product-detail/Microcontroller-Units-MCUs-MPUs-SOCs_JieLi-Tech-AC6956C4_C5339900.html); marking convention: [kagaimiq/jielie "chip marks"](https://kagaimiq.github.io/jielie/chips/chip-marks.html) | an example of a public JieLi SDK: [Jieli-Tech fw-AC63_BT_SDK](https://gitee.com/Jieli-Tech/fw-AC63_BT_SDK) (Apache-2.0), for another JieLi family |
| Alpha & Omega **AO3415** P-MOSFET (`AFCP` part) [?] | AOS datasheet and marking description PD-00120 | [datasheet](https://www.aosmd.com/sites/default/files/res/datasheets/AO3415.pdf), [marking](https://www.aosmd.com/sites/default/files/res/markings/AO3415.pdf) | `AF` = AO3415 product code; the AP30 part may be a second source |
| Will Semiconductor **WSP6580Q** audio switch (`A80Q` part) [?] | distributor listing (datasheet not fetched) | [LCSC C2941901](https://www.lcsc.com/product-detail/Analog-Switches-Multiplexers_WILLSEMI-Will-Semicon-WSP6580Q-16-TR_C2941901.html) | candidate only: name and 16-lead QFN fit the marking |

## Rockchip tools and repositories

| Source | Licence | Link | Used for |
|---|---|---|---|
| **rkdeveloptool** | GPL-2.0 | [github.com/rockchip-linux/rkdeveloptool](https://github.com/rockchip-linux/rkdeveloptool) | Rockusb command layout; it knows the family (`RKNANO` = `071b:3226`, and accepts any `2207:xxxx` loader such as the AP30's `2207:262d`); `rl` hangs on the AP30's loader 4.16 |
| rkbin | binary blobs | [github.com/rockchip-linux/rkbin](https://github.com/rockchip-linux/rkbin) | `RKBOOT/RKNANO.ini`: an empty boot-merger recipe for chip `RKNANO` (unchanged since 2013); no RKNano binaries |
| u-boot (`next-dev`) | GPL-2.0 | [github.com/rockchip-linux/u-boot](https://github.com/rockchip-linux/u-boot) | Rockusb opcode list (`include/rockusb.h`, `f_rockusb.c`), the IDB RC4 key (`tools/rkcommon.c`), `RKNANO` in the boot merger |
| kernel | GPL-2.0 | [github.com/rockchip-linux/kernel](https://github.com/rockchip-linux/kernel) | `drivers/mailbox/rockchip-mailbox.c`: same mailbox register layout as the RKNanoD |
| Rockchip Rockusb wiki | — | [opensource.rock-chips.com](https://opensource.rock-chips.com/wiki_Rockusb) ([archived copy](https://web.archive.org/web/20260503124531/https://opensource.rock-chips.com/wiki_Rockusb)) | MaskROM / loader background |
| Radxa rkdeveloptool / RKDevTool guides | — | [rkdeveloptool](https://docs.radxa.com/en/zero/zero3/low-level-dev/rkdeveloptool), [RKDevTool](https://docs.radxa.com/en/zero/zero3/low-level-dev/rkdevtool) | generic usage; warnings that apply to the AP30 too (loader must match the SoC, one device at a time) |
| RKDevTool (Windows) v2.86 / v2.96 + DriverAssistant v5.14 | proprietary | [v2.96](https://dl.radxa.com/tools/windows/RKDevTool_Release_v2.96_zh.zip), [v2.86](https://dl.radxa.com/tools/windows/RKDevTool_Release_v2.86.zip), [DriverAssistant](https://dl.radxa.com/tools/windows/DriverAssitant_v5.14.zip) | **not executed**; the program contains an RKNano device class and PID `262D`, so it is a Windows option for loader mode. Never use its erase, "upgrade firmware" or loader-download functions on the AP30 |
| Rockbox `utils/rknanoutils` (rkboottool, rkload) | GPL-2.0+ | [GitHub mirror](https://github.com/Rockbox/rockbox/tree/master/utils/rknanoutils) (git.rockbox.org needs a login) | RKnanoFW container parsing (first reading of the format) |

> **Warning**
> Rockchip tools can erase the whole flash or replace the boot loader. On the AP30 never run `rkdeveloptool ef`,
> never download a loader (`db` / `ul`, or the RKDevTool equivalents), and never write physical sectors 0..0x1FFF.
> The safe recovery path is described in [../guides/recovery.md](../guides/recovery.md).

## Hidizs: product, firmware, campaign

| Source | Link | Used for |
|---|---|---|
| Hidizs Download Center | [hidizs.net/pages/download-center](https://www.hidizs.net/pages/download-center) | links the V1.7.8 and 11-Game firmware folders; no mention of licences or source code |
| Drive folder "AP30 Firmware-V 1.7.8" | [drive.google.com](https://drive.google.com/drive/folders/1UtbNfDBERrcP6VWIMiwKfIeSnyiECXn8) | `HIFIYF18.IMG` + PDF instructions |
| Drive folder "11-Game Firmware" | [drive.google.com](https://drive.google.com/drive/folders/1eh8GAXxhXflLeVO4Y43jqXNZsKySmr3K) | `HIFIYF05.IMG` + instructions |
| Drive folder "AP30-HIFIYF26 Firmware-0727" (linked from reviews, not from the Download Center) | [drive.google.com](https://drive.google.com/drive/folders/1FS4LT7nPmJlrgBJD76_OU4EqBXUDNuzb) | `HIFIYF26.IMG` + instructions |
| AP30 user manual (image-only PDF, 20 pp.) | [drive.google.com](https://drive.google.com/file/d/1YyFsvKg82BAYunghygT7IgAAgt5OGPsx/view) | controls, no licence section |
| Hidizs blog: Kickstarter launch | [hidizs.net](https://www.hidizs.net/blogs/news/ap30-music-boy-kickstarter-launch-wearable-hi-res-music-player) | launch date 2026-07-23 |
| Kicktraq campaign page | [kicktraq.com](https://www.kicktraq.com/projects/hidizs/ap30-music-boy-the-first-truly-wearable-hi-res-music-player/) | campaign dates and size |
| GDM (Japan) article | [gdm.or.jp](https://www.gdm.or.jp/crew/2026/0805/646849) | campaign coverage |
| Head-Fi AP30 showcase (vendor highlights posted by Zerstorer_GOhren) | [head-fi.org](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/) | spec sheet text, output power, editions |
| hifioasis AP30 page | [hifioasis.com](https://www.hifioasis.com/dap/hidizs-ap30-music-boy/) | spec summary; its "potentially a track limit of 10,000 tracks" compares with the firmware's 7,168 song records [AP30] |

The official firmware files themselves (sizes, hashes, changes): [firmware_releases.md](firmware_releases.md).

## Regulatory records

The AP30 has no filing of its own; it is a listed model of the AP80 PRO MAX records ([../hardware/board_ap30.md](../hardware/board_ap30.md)).

| Record | Link |
|---|---|
| fccid.io grantee search "hidizs"; grantees 2A7ZP (DongGuan Hidizs Technology) and 2ANW4 (Hidizs Technology) | [search](https://fccid.io/search.php?q=hidizs), [2A7ZP](https://fccid.io/2A7ZP), [2ANW4](https://fccid.io/2ANW4) |
| FCC ID 2A7ZP-AP80PROMAX (grant 2025-12-23; test report lists AP30 among the "listed models") | [fccid.io](https://fccid.io/2A7ZP-AP80PROMAX) |
| FCC EAS generic search (official; refused automated access) | [apps.fcc.gov](https://apps.fcc.gov/oetcf/eas/reports/GenericSearch.cfm) |
| ISED REL search, company "hidizs" (35096-AP80PROMAX, 30393-AP80) | [sms-sgs.ic.gc.ca](https://sms-sgs.ic.gc.ca/equipmentSearch/searchRadioEquipments?&lang=en) |
| Japan Giteki 222-260312 (AP80 PRO MAX family incl. AP30) | [fccid.io/giteki](https://fccid.io/giteki/222-260312) |

## Community projects

Full descriptions, findings and where we agree or disagree: [../related/community_projects.md](../related/community_projects.md).

| Project | Device | Licence | Link |
|---|---|---|---|
| hidizs-ap30-game-emu (nkahoang) | AP30 | MIT | [github.com/nkahoang/hidizs-ap30-game-emu](https://github.com/nkahoang/hidizs-ap30-game-emu) |
| echo-mini-newfw, `ETUDE.md` (iamcheyan) | Echo Mini | MIT | [github.com/iamcheyan/echo-mini-newfw](https://github.com/iamcheyan/echo-mini-newfw) |
| echo-mini-newfw, `ETUDE.md` (berettavexee; further along) | Echo Mini | MIT | [github.com/berettavexee/echo-mini-newfw](https://github.com/berettavexee/echo-mini-newfw) |
| echo-mini-opus (berettavexee) | Echo Mini | see repository | [github.com/berettavexee/echo-mini-opus](https://github.com/berettavexee/echo-mini-opus) |
| ReChord (brnomt) | Echo Mini | GPL-3.0 (repository licence) | [github.com/brnomt/ReChord](https://github.com/brnomt/ReChord) |
| EchoPod (BasilSkyWalk) | Echo Mini | GPL-3.0 | [github.com/BasilSkyWalk/echopod](https://github.com/BasilSkyWalk/echopod) |
| RECHO | Echo Mini | closed source, no licence | [recho.atzkey.workers.dev](https://recho.atzkey.workers.dev/) |
| snowsky-echo-mini-recovery (TheMVS) | Echo Mini | see repository | [github.com/TheMVS/snowsky-echo-mini-recovery](https://github.com/TheMVS/snowsky-echo-mini-recovery) |
| Echo-Mini-Customizer (BlackVllad) | Echo Mini | see repository | [github.com/BlackVllad/Echo-Mini-Customizer](https://github.com/BlackVllad/Echo-Mini-Customizer) |
| flame-ocean-website (losses) | Echo Mini | see repository | [github.com/losses/flame-ocean-website](https://github.com/losses/flame-ocean-website) |

## Snowsky Echo Mini: official firmware and pages

Used for the Echo Mini comparison ([../related/snowsky_echo_mini.md](../related/snowsky_echo_mini.md)); tag [EM].

| Source | Link | Notes |
|---|---|---|
| FiiO forum: "ECHO MINI-firmware download" (FiiO staff, 2025-01-21, updated 2026-10-24) | [forum.fiio.com](https://forum.fiio.com/note/showNoteContent.do?id=202501210934383987154&tid=17) | the download page: 27 zips on FiiO's CDN, bilingual changelogs, 8 GB `HIFIECnn.IMG` vs 512 MB `MINIVnnn.IMG` instructions |
| fiio.com release announcements, V1.2.5 … V4.0.0 | e.g. [V1.2.5](https://www.fiio.com/newsinfo/996673.html), [V1.6.0](https://fiio.com/newsinfo/1036917.html), [V4.0.0](https://fiio.com/newsinfo/1150611.html) | all link the forum page; the V1.6.0 post confirms that unlisted release |
| FiiO support: "How to update the firmware for ECHO MINI" | [freshdesk](https://fiiosupport.freshdesk.com/support/solutions/articles/69000869715-how-to-update-the-firmware-for-echo-mini-) | instructions only |
| FiiO forum: ECHO firmware, ECHO NANO firmware | [ECHO](https://forum.fiio.com/note/showNoteContent.do?id=202602051101498161611&tid=17), [ECHO NANO](https://forum.fiio.com/note/showNoteContent.do?id=202605161533005115232&tid=17) | sibling Snowsky products on the same CDN; not analysed |
| Head-Fi Echo Mini thread | [head-fi.org](https://www.head-fi.org/threads/fiio%E2%80%99s-innovative-sub-brand-snowsky-pure-music-player-echo-mini-is-officially-released.975162/page-31) | user reports per version |

## Reviews and forum posts about the AP30

Read for [../community/user_feedback.md](../community/user_feedback.md) (2026-11-22/23). Cited by public handle.
"Partial" = only part of the page could be read.

### Long-form reviews (outside Head-Fi)

| Author | Site | Date | Link |
|---|---|---|---|
| Moonstar Reviews | moonstarreviews.net | 2026-08-04 | [review](https://moonstarreviews.net/hidizs-ap30-music-boy-review/) |
| Chris Love | mobileaudiophile | 2026-08-06 | [review](https://mobileaudiophile.com/daps/hidizs-ap30-music-boy-review/) |
| Pietro (Kindlefirehditaly) | mobileaudiophile | 2026-08-11 | [review](https://mobileaudiophile.com/daps/hidizs-ap30-high-res-music-player-review-pietros-take/) |
| QuietlyAmused | mobileaudiophile | 2026-11-12 | [review](https://mobileaudiophile.com/daps/hidizs-ap30-musicboy-review-you-win-little-you-lose-some-more/) |
| Mahir Efe Falay (editorial, no hands-on) | mobileaudiophile | 2026-06-25 | [editorial](https://mobileaudiophile.com/editorial/hidizs-ap30-music-boy-editorial-the-sansa-clip-era-has-a-new-contender/) |
| Ichos (Petros Laskis) | ichos-reviews.com | 2026-09-16 | [review](https://ichos-reviews.com/hidizs-ap30-review/); also [Echo Nano review](https://ichos-reviews.com/fiio-snowsky-echo-nano-review/) comparing the AP30; site answers 403 Forbidden as of 2026-11-24, no archived copy |

### Head-Fi showcase reviews

Showcase: [reviews tab](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/reviews). All links below are
`https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/<id>/`.

| Author | Date | Review id |
|---|---|---|
| derici2800 | 2026-11-04 | [45351](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/45351/) |
| JQuB3 | 2026-11-01 | [45296](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/45296/) |
| savitr (cross-post of QuietlyAmused's review) | 2026-10-27 | [45229](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/45229/) |
| dynamicdb | 2026-10-05 | [44864](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44864/) |
| Ichos | 2026-09-21 | [44646](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44646/) |
| curiousBee | 2026-09-21 | [44638](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44638/) |
| Berian | 2026-09-17 | [44585](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44585/) |
| Tonytex | 2026-09-10 | [44472](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44472/) |
| requiemreview | 2026-09-04 | [44398](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44398/) |
| MayoNotes | 2026-09-04 | [44388](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44388/) |
| Sae Sakura | 2026-08-26 | [44271](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44271/) |
| ChifiLab | 2026-08-23 | [44230](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44230/) |
| Austin Brooks | 2026-08-21 | [44196](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44196/) |
| IceIceberg | 2026-08-16 | [44119](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44119/) |
| SLOFLOisLONELY | 2026-08-16 | [44117](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44117/) |
| Cinder | 2026-08-15 | [44112](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44112/) |
| jreqtech | 2026-08-10 | [44027](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44027/) |
| GoldenJoe | 2026-08-10 | [44020](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/44020/) |
| Ceeluh7 (cross-post of Chris Love's review) | 2026-08-09 | [43994](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/43994/) |
| eboyoyoyoy | 2026-07-26 | [43790](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/43790/) |
| IryxBRO | 2026-07-23 | [43735](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/review/43735/) |

Not readable automatically (bot challenge), so not used: reviews by suicideup (43724), Jamsblast (43746),
Sam Reviews (43565), cleg (43703), Lexfireview (43772), Zerstorer_GOhren (43762), SatorArepo (43738) and Dad Reviews
(43542).

### Head-Fi forum posts

| Author | Thread, post | Link |
|---|---|---|
| Zerstorer_GOhren | The discovery thread!, "HIDIZS AP30 MUSIC BOY: An Initial Impression" (2026-07-06) | [post](https://www.head-fi.org/threads/the-discovery-thread.586909/post-19186211) |
| suman134 | The discovery thread! (pre-launch, 2026-07-13; partial) | [post](https://www.head-fi.org/threads/the-discovery-thread.586909/post-19192592) |
| dexter audio | The discovery thread!, quick review (partial; embeds a [YouTube video](https://www.youtube.com/watch?v=ApqgSETewdw), not watched) | [post](https://www.head-fi.org/threads/the-discovery-thread.586909/post-19200887) |
| Cinder | Mid Fi general chat (2026-08-19) | [post](https://www.head-fi.org/threads/mid-fi-general-chat-for-all-discussions-and-general-chat-a-thread-for-all.972437/post-19229982) |
| jant71, Saraugie | Everything TWS and Wireless | [jant71](https://www.head-fi.org/threads/everything-tws-and-wireless-with-a-dash-of-whatever-wired-thrown-in-for-flavor.978750/post-19223980), [Saraugie](https://www.head-fi.org/threads/everything-tws-and-wireless-with-a-dash-of-whatever-wired-thrown-in-for-flavor.978750/post-19223970) |
| somnarium | The PENON official thread | [post](https://www.head-fi.org/threads/the-penon-official-thread.934523/post-19204318) |
| XTF1, AdamPA1006 and others | comments on the AP30 showcase (SoC identification, wishes) | [comments](https://www.head-fi.org/showcase/hidizs-ap30-music-boy.29215/#js-comment-8557) |
| Ichos | review of the Snowsky Echo Nano, mentions the AP30 | [review](https://www.head-fi.org/showcase/snowsky-echo-nano.29229/review/45142/) |

Further discovery-thread and Watercooler posts that only link reviews or are short impressions were looked at but
gave no separate facts.

## Looked at, not applicable

* [rockchip-linux/rknn-toolkit2](https://github.com/rockchip-linux/rknn-toolkit2) and the
  [RKNN Toolkit user guide (RK1808)](https://repo.rock-chips.com/rk1808/doc/Rockchip_User_Guide_RKNN_Toolkit_EN.pdf):
  NPU model tools for RK3xxx / RK1808 chips. The RKNanoD has no NPU.
* rockchip-linux `mpp`, `rknpu`, `rknpu2`, `RKNPUTools`, `gstreamer1-iep`: video and NPU software, nothing for the
  RKNano.
* Head-Fi threads of other Hidizs players (AP60, AP80, AP100) and unrelated showcases: no AP30 content.

## Not linked on purpose

Copies of Rockchip's RKNanoD and RKNanoC SDKs (an "MP3 SDK V1.3" of 2016-11, a "Wireless Audio SDK V1.5" built on
RKOS / FreeRTOS, and an RKNanoC SDK) circulate in public repositories without a licence. One of them is vendored inside
the ReChord project. This collection describes the SDK's structure in its own words where that explains the AP30
firmware ([../related/rockchip_rknano_family.md](../related/rockchip_rknano_family.md)) but does not link, quote or
reproduce those copies.
