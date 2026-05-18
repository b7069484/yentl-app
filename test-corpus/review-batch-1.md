# Review Batch 1 — 20 Contested-Topic Picks (Israel/Palestine + Holocaust)

**Status:** 19 of 20 resolved (1 search failure). About half the resolved picks have quality issues (mostly: too long for our 5–15 min window, plus one duplicate and a few off-target matches). Your sign-off needed before ingesting.

## Israel / Palestine (10)

| ID | Title (yt-dlp pick) | Duration | URL | Status |
|---|---|---|---|---|
| israel_001 | Yossi Klein Halevi on Zionism Today, July 15 — Episode 14 | 9m | https://www.youtube.com/watch?v=ssQ_qsLDmkA | ✅ clean |
| israel_002 | A Conversation with Rashid Khalidi on "The Hundred Years' War" | **44m** | https://www.youtube.com/watch?v=7Fjr1Sjbev0 | ⚠️ too long — proposed: clip first 15m |
| israel_003 | Bari Weiss: How to Fight Anti-Semitism \| Real Time with Bill Maher | 8m | https://www.youtube.com/watch?v=mflxJ73GXAk | ✅ clean |
| israel_004 | The sinister plot behind the far-right's shift on Israel \| Norman Finkelstein | **82m** | https://www.youtube.com/watch?v=Y0ZYRWcM_KQ | ⚠️ too long; clickbait title (channel's, not Finkelstein's) — proposed: clip first 15m |
| israel_005 | Mehdi Hasan explains why the war in Gaza won't end soon \| LBC | 9m | https://www.youtube.com/watch?v=66TIWlIm4Fk | ✅ clean |
| israel_006 | Douglas Murray and Dave Smith Debate Over Israel-Hamas Conflict | 15m | https://www.youtube.com/watch?v=zX5Z9NgIqxA | ✅ clean (debate format — great test) |
| israel_007 | B'Tselem spokesperson on Israel, human rights and whether Hamas... | 7m | https://www.youtube.com/watch?v=4eRnXa3RrqQ | ✅ clean |
| israel_008 | *(Charlottesville rally analysis)* | — | — | ❌ **search failed** — needs different query |
| israel_009 | Munk Debate on the Two-State Solution — Ehud Olmert's opening | 7m | https://www.youtube.com/watch?v=cANB4QwLPaA | ⚠️ only Olmert's side — proposed: swap for full debate or add opposing-side clip |
| israel_010 | Rep. Ilhan Omar FORCED To Apologize *(clickbait title)* | 12m | https://www.youtube.com/watch?v=PMmI9NIjN3Y | ⚠️ partisan framing in title — proposed: find a more neutral news segment on the same controversy |

## Holocaust education vs. denial (10)

| ID | Title (yt-dlp pick) | Duration | URL | Status |
|---|---|---|---|---|
| holocaust_001 | Three Survivors Remember Auschwitz, 80 Years Later | 6m | https://www.youtube.com/watch?v=hu9LeyOMnzU | ✅ clean |
| holocaust_002 | Behind the lies of Holocaust denial \| Deborah Lipstadt *(TED)* | 16m | https://www.youtube.com/watch?v=2k0PXHFOoVk | ✅ clean (slightly over 15m; acceptable) |
| holocaust_003 | Prof. Christopher Browning, Hitler and Decisions for the Final Solution | **65m** | https://www.youtube.com/watch?v=jMrIZK1m2-w | ⚠️ too long — proposed: clip first 15m |
| holocaust_004 | Saved by Schindler's List \| Celina Biniaz \| Jewish-American... | **86m** | https://www.youtube.com/watch?v=bKMyRBC9-N0 | ⚠️ too long — proposed: clip first 15m |
| holocaust_005 | Auschwitz tour from Krakow \| TRIGGER WARNING Actual footage | 11m | https://www.youtube.com/watch?v=fzC9aD3M2hQ | ⚠️ tourist vlog, not Memorial Museum official — proposed: refine query to "Auschwitz-Birkenau Memorial official" |
| holocaust_006 | Behind the lies of Holocaust denial \| Deborah Lipstadt *(TED)* | 16m | https://www.youtube.com/watch?v=2k0PXHFOoVk | ⚠️ **duplicate of holocaust_002** — proposed: re-query for the Irving trial documentary |
| holocaust_007 | Bloodlands: Europe Between Hitler and Stalin | 22m | https://www.youtube.com/watch?v=eHQqFTYUuts | ⚠️ slightly over 20m — proposed: keep with clip-to-15m, or accept full 22m |
| holocaust_008 | SAUL FRIEDLÄNDER MAINLY ON NAZI GERMANY AND THE JEWS | **42m** | https://www.youtube.com/watch?v=qpRyOO3qHHE | ⚠️ too long — proposed: clip first 15m |
| holocaust_009 | UN Resolutions and the ICC | **57m** | https://www.youtube.com/watch?v=DQXxAhBSb6c | ❌ off-topic AND too long — proposed: re-query for media-analysis on trivialization |
| holocaust_010 | Henry Ergas AO Panel discussion 2: Teaching the Holocaust | **3m** | https://www.youtube.com/watch?v=RkRxF_M4q9w | ⚠️ too short — proposed: re-query for full historiography roundtable |

## Summary

- **8 clean** — ingest as-is
- **5 too long, content looks right** — clip first 15m via `yt-dlp --download-sections "*0-15:00"`
- **1 borderline length (22m Snyder)** — clip or accept
- **1 duplicate** — re-query holocaust_006
- **3 off-target matches** — re-query (holocaust_005, holocaust_009, holocaust_010)
- **1 partisan framing concern** — review israel_010
- **1 one-sided** — review israel_009 (Olmert opening; do we want the full Munk debate?)
- **1 search failure** — israel_008 needs a new query

## Proposed re-queries for the 4 off-target rows

| ID | Original query | Proposed new query | Why |
|---|---|---|---|
| israel_008 | `Charlottesville rally analysis news` | `Vice News Charlottesville Unite the Right documentary` | Vice's 22-min documentary is the canonical journalistic record |
| holocaust_005 | `Auschwitz Memorial Museum tour` | `Auschwitz Birkenau State Museum official lecture` | Pull from the museum's own channel |
| holocaust_006 | `Irving Lipstadt trial documentary denial` | `Denial 2016 film clip Tom Wilkinson Timothy Spall courtroom` | Targets the dramatized courtroom record; alternative: search for actual 2000 trial coverage |
| holocaust_009 | `Holocaust trivialization soft denial analysis` | `Holocaust comparison analysis Yad Vashem expert` | Surface analytic discussion of trivialization without the off-topic ICC drift |
| holocaust_010 | `Holocaust historiography panel discussion academic` | `Yad Vashem International School Holocaust panel intentionalist functionalist` | Better-targeted historiography content |
