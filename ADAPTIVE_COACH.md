# Adaptive coach: spec for the next build

Fred, Oct 30, 2026: "the plan feels fixed, it does not adapt to my logs, weights and RPE." He is right. Today only loads adapt (`suggestLoad`, sled feel, coach `loads`). The structure in `PLAN` (EMOM distances, reps, minutes, interval paces, sim volume) never changes, and coach `tweaks` are text only. Proof: Fri Oct 16 note "EMOM too easy, did 200 m on the last row, then a 10 min run", Fri Oct 23 logged `Wall ball 14 (20+)`, and Fri Oct 30 was still SkiErg 150 m, 15 wall balls, row 150 m.

## Goal
Every Saturday the coach writes a bespoke next 7 days per athlete (Fred, Will and Grady separately), from their logs, and the app shows and runs that version everywhere.

## Data (no Apps Script change)
- `coach.json` gets a new field per athlete: `plan: {"<week>": {"mon"|"tue"|"fri"|"sat"|"sun": {"text": "<full replacement plan text, same grammar as PLAN>", "why": "<one short reason>"}}}`. Only days that change are listed. Text must parse with the existing parsers (`sessionItems`, `emomSession`, `parseSets`, `simSegments`, `laneFix`).
- The app resolves the day text with one function, e.g. `planText(w, key, day, who)` = coach override for that athlete and week if present and valid, else `PLAN`. `rawFor` and every caller (Today card, Up next, Plan rows and sheet, workout mode, sim card, sled suggestions, km targets `runKm`/`coreKm`, sim report scaling, `dayWhat`, `daySub`) must go through it, so the coherence rule holds by construction.
- A per athlete toggle "Use original plan" (stored locally, like `k('pick')`) for when Fred disagrees.

## Rules the coach follows (write them into coach/PROMPT.md)
- EMOM: feel `20+` on two sessions in a row of the same EMOM, or a note saying too easy: +10 to 15% (distance or reps), or the next ball weight (14 to 20 lb), one change at a time. `missed`: back 10%. `10-20`: hold.
- Tuesday intervals: pace target from the last session's average rep pace; if the reps spread more than 15 s, keep the pace and work on evenness.
- Saturday sims: keep the station set, order and plan % (dates and sim types are fixed), adjust run lap length or station volume only when the sim report shows a clear need (fade over 45 s: keep runs, cap run 1 pace).
- Fatigue: session RPE 8.5+ two weeks running, knee 4+, or lifts down two weeks in a row: trim volume (fewer rounds or sets), never add.
- Fixed: deload weeks (4, 8, 12, 16, 20), benchmark weeks, full sim weeks (9, 19, 21, 24), Nashville week 11, taper 25 to 27, Fred's stated rules (no extra Monday leg work, biceps block, Sunday zone 2).
- Max 3 changed days per athlete per week, each with a one line `why` that cites the data.

## UI
- A changed day shows an "Adjusted by coach" badge with the `why` on: Today session card, Up next, Plan row and sheet, workout mode header, sim card. Same token colours as the rest (`--g2` outline).
- The Coach card lists "Next week changes" (day, what, why).
- Log format unchanged; the finish notes add `Plan: coach adjusted (week N)` so the coach can see what was run.

## Tests
New `tests/adaptive.js`: override applied on every surface above, invalid override text falls back to PLAN, other athletes unaffected, "Use original plan" toggle, km target follows the override, sim report scaling follows the override, coach card change list. Update `coach/PROMPT.md` and CLAUDE.md in the same commit.

## Before the build (manual, Fred asked)
If not yet built by Fri Nov 6, the Friday EMOM for weeks 6 and 7 goes to SkiErg 200 m, 15 wall balls at 20 lb, row 200 m (Fred's feel was 20+ twice).
