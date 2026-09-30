# HYROX Brisbane 2027 training app

Private training app for three athletes, **Fred** (owner, `fred`), **Will** (`will`) and **Grady** (`grady`), for HYROX Brisbane on Apr 3 or 4, 2027 (Open men, goal 1:25). The plan runs 27 weeks from Mon Sep 28, 2026.

Live at https://dreamystacks.github.io/hyrox/. It's installed on the athletes' iPhones as a home screen web app (standalone PWA). Deploying means pushing to `main`, and GitHub Pages publishes in about a minute.

## Working with Fred
- He's a systems and optimisation person who thinks top down: vision, then plan, then execution. Keep the overall goal visible and don't get lost in micro detail.
- Replies should be short and direct, with the answer first. No sugar coating, no em dashes. Don't use hyphenated compound modifiers in prose ("period-end", "role-based"); rephrase instead.
- If something is ambiguous and expensive to redo, ask first. Otherwise make the call and say what you chose.
- **Constraints:** the app must stay free, low friction, and iPhone first. Don't overbuild: he explicitly rejected Supabase and any paid backend.
- He tests on his iPhone and sends screenshots. iOS Safari standalone mode has quirks (see below). Always think "does this work on iOS as an installed web app".
- Don't change his training plan content without being asked. When the plan changes, update both `index.html` PLAN and `plan/HYROX_Brisbane_2027_Plan.xlsx`, and send him the updated Excel.
- Commit author: `Fred <fred.84@hotmail.com>`.

## Architecture (deliberately simple)
| File | Role |
|---|---|
| `index.html` | The whole app: HTML, CSS and JS in one file (~200 KB). No build step, no framework. |
| `sw.js` | Service worker. Pages are network first with `no-store`. **Bump `VERSION` on every deploy** (e.g. `hyrox-v30` to `hyrox-v31`). |
| `manifest.json` | PWA manifest. |
| `icon-{accent}-{dark\|light}-{180\|192\|512}.png` | App icons for each theme (the "Aurora Glow" design, "HYROX / Spring 2027"). |
| `img/ex/{key}-{0,1}.jpg` | Exercise photos, 480x320, from free-exercise-db (public domain, github.com/yuhonas/free-exercise-db). |
| `coach.json`, `coach-history/` | Written weekly by the AI coach scheduled task. Don't edit by hand. |
| `coach/PROMPT.md` | Copy of the coach task prompt (the live one sits in the scheduled task). |
| `apps-script/Code.gs` | Google Apps Script backend (key redacted; the real key is in the deployed script only). |
| `plan/HYROX_Brisbane_2027_Plan.xlsx` | Fred's source plan. Keep in sync with `PLAN`. |
| `tests/smoke.js` | Playwright smoke test. |
| `tests/swap.js` | Playwright check for a swapped week (Plan "Logged" tags, Today default, Done card, Up next). |
| `tests/nav.js` | Playwright check for the bar, the Coach view order, the Next report line (Toronto and Brisbane viewers), the Guides button and Back, and the info buttons. |
| `tests/grid.js` | Playwright check for the Plan season dots (27 x 7, states, caption row, deload dash, frame, compact height) and the week card (strip, stats line; no overflow at 390 and 360). |
| `tests/header.js` | Playwright check for the Plan header: dots and circles share states, today dot, frame follows column taps and arrows, circles scroll to and open the day card, stats line, 390 and 360 layout, first card position. |
| `tests/coach.js` | Playwright check for the Coach tab: empty state on week 1, seeded splits, runs and benchmarks (estimate, levers order, diverging bars with signs, clamp, target hit), measured full sim, coach.json card, viewing another athlete, light theme, 390 and 360. |
| `tests/plan.js` | Playwright check for the Plan tab as history: inline results on a swapped week, expand, Edit, Delete, Add session (prefill, returns to Plan), Settings backup rows. |

### Data and sync
- **Athletes:** `ATHLETES={fred,will,grady}` is the single source. Every per athlete loop (picker, `merge`, `markAllDirty`, segment controls) uses `Object.keys(ATHLETES)`, so adding someone is one line plus the coach prompt.
- **Local first.** Everything lives in `localStorage`, namespaced per athlete: `nsKey(a,name)` gives `hrx_${a}_${name}_v2`, and `k(name)` does the same for the active athlete. Main names: `logs`, `bench`, `checks` (+`checksT`), `unit` (`kg`/`lb`), `workout`, `emom`, `pick`, `wtload`.
- **Backend:** a Google Sheet "HYROX Database" in Fred's Drive, reached through a standalone Apps Script web app (Execute as Me, access Anyone).
  - Tabs: `Logs`, `Benchmarks` (athlete, test, week, time, updated_at), `State` (checks JSON).
  - Each athlete's phone stores the URL and key after setup (setup link `#sync=...`).
  - **Never commit the sync key or the /exec URL.**
- **Sync:** changes go into a dirty queue (`hrx_dirty_v1`, keys `type|athlete|id`) and are POSTed as `text/plain` JSON. The response is the full dataset, which `merge()` folds in. Last writer wins on `updatedAt`, and deletes are tombstones (`deleted:true`).
- **Changing Code.gs requires Fred to redeploy in Apps Script, which costs friction.** So prefer storing new data inside existing tabs. Example: body weight is stored as Benchmarks rows with `test="bw"`, where `week` is `"3"` for the Monday weigh-in and `"3b"` for Thursday, and `time` is `"82.4 kg"`. Locally that's bench keys `bw_3` and `bw_3b`.

### Plan and sessions
- `const PLAN=[...]` holds 27 weeks with keys week, date, phase, focus, mon, tue, fri, sat, sun, runKm, notes. Wed is rest, Thu is hockey (see `rawFor()`). Deload weeks are 4, 8, 12, 16 and 20. Benchmark weeks are 1, 8, 16 and 20.
- Display names (`DAY_NAME`, applied to `dayDefs` and `sessionLabel`): Legs lift + EMOM, Run + Arms, Rest, Hockey, Upper + EMOM, Sim, Recovery. `daySub` makes the short subtitle; `exParts`/`moveShort`/`exRowHTML` turn plan text into a short name plus chips. Plan text and item details sit behind "Show details" (`.src-d`, `.ex-d`); guides open from the ⓘ button (`ibtn`). Log select option values stay the internal names.
- `dayDefs` holds the day labels. Internal session names are legacy and must stay as they are, because they're stored in logs: `'Mon: Lower + sled'` and `'Fri: Upper + erg + arms B'`. `sessionLabel()` maps them to display names.
- `sessionItems(day,raw,w)` turns plan text into exercise items. Mon and Fri go through `emomSession()`, which is **line based and keeps the order of the source text**:
  - Monday is the main lift, then the secondary leg lift (hack squat in weeks 1 to 8, RDL in weeks 9 to 21), then the legs & grip EMOM.
  - Friday is pull + press, then `Then arms block B: ...`, then `Finisher: EMOM ...`.
  - "Main lift" resolves to Trap bar DL for weeks ≤ 8 and Back squat after.
- **Checklist keys are index based:** `w{week}-{Day}-{i}`, plus `-s{n}` for each set. If you reorder items, write a migration like `migrateChecks()`, which uses the `_v` field inside the checks object (currently 3).
- `parseSets()` handles sets, holds, rest (`REST_BY_KEY`) and 180 s for heavy lifts of 5 reps or fewer. It returns null for EMOM items.
- `guideKeys()` goes through `MATCHERS` to reach `GUIDES` keys. `EXPHOTO` maps muscles, `VIDQ` holds YouTube search queries, and `RETIRED_GUIDES` hides guides.

### Navigation (v42)
- Bottom bar: Plan · **Today** (raised centre button, app opens here) · Coach. Three tabs. There is no History, Log, Progress or Guides tab, no Progress tab and no Guides tab; the bar shares its width between however many tabs exist (`grid-auto-flow:column`). Settings has no Guides row.
- **Coach tab** (label Coach, spark icon; the internal view id is still `bench`, so `showView('bench')`, `renderBench`, `[data-view=bench]`). One question: am I getting better, and what does the coach say. Order: 1 hero "Projected finish" (`renderStanding`), 2 "Biggest levers" (`renderLevers`), 3 coach card with headline, first sentence, up to 2 tweaks, the always visible "Next report: Sat 6:52 PM" line (`nextReportAt`/`nextReportText`: the coach runs Saturdays 18:52 Toronto time, shown in the viewer's own time zone) and "Read full report" collapsed (full coach text plus `renderReport`), 4 "Race splits vs goal pace" (`renderSplits`), 5 "Fresh tests vs target" (`renderTests`, with "Log a retest" opening the entry table `renderBenchTable`), then the older blocks (progression curves, body weight, standards table) until they move.
- **Guides** are not a tab: the book button in the Today header (`[data-guides]`) opens the Guides view, and its Back button (`#guidesBack`) returns to Today. While Guides is open the Today tab stays highlighted. The ⓘ buttons open the guide modal over whatever view you are on and close back to it.
- Main loop: Today → Start → workout guides you (auto scrolls to the next exercise after the last set, RIR or EMOM) → Finish → finish sheet (RPE 1 to 10 + knee 0 to 10, one Save) → Today shows the Done card.
- `openFinish(payload)` is the only way a workout, hockey or legacy sim timer gets saved. The workout state is cleared only on Save (`after` callback); Back returns to the workout untouched; "More details" opens the full log form prefilled.
- The log form (`#log`) is only reached from the Plan tab: "+ Add session" (`#addSession`, under the day cards; the date is the last opened day card, else today if it is in the viewed week, else Monday; the session is that weekday's session or Other) or the Edit button inside an expanded day card. Save and Cancel both return to Plan (Save jumps to the saved date's week). Do not add other entry points.
- Plan cards show "Start" only for today or missed days of the current week (logged with today's date); "Log hockey" on Thursdays. Future and past weeks show nothing.
- **Sessions are matched by stored session name, never by date.** `weekSessions(week)` maps session name to the logs of that plan week (`Rest day` ignored). Plan cards use it (`loggedTag`): "✓ Logged" when done on the card's own date, "✓ Logged Tue" when the session was done on another weekday (swapped days). The day chip (Mon, Tue...) is filled lime when that session was done on any day of the week (`.day-chip.done`, same map), and today's chip has a ring (`.day-head.today`), so both can show at once. Plan rows are a plan, not a tracker: no tick circles (`.exercise.np`). Today's default session, `upNext` and the Start eligibility use the same map: a session already done this week is skipped, and when a day was displaced by a swap, Up next shows "Up next · Mon's session". Plain missed days are not nagged in Up next (Today's hint covers them). Covered by `tests/swap.js`.
- Today holds: header, one compact week line, weigh-in row when due, one session card (the title is the session picker: a styled row with a chevron over an invisible native `select#sessionPick`; Start right under it, rest day link at the bottom), Up next. Season ticks, day strip and run km bar live in the Plan week header.

### Features map (search these function names)
- **Today:** `renderToday`, `planPos`, session picker (`k('pick')`), weigh-in row (`bwDue`). Once a log exists for today, the pickers and buttons are replaced by `doneCard` (stats, stations, runs, weights vs last time via `prevLoadBefore`, notes); `upNext` stays below. "Log rest day" (`logRestDay`) saves a log with session `Rest day` (duration 0); it shows as done but never counts as a workout in the Plan tab or the coach.
- **Guides:** `addRules()` adds `std` (Race standard box + rulebook footer) and `dbl` (collapsed Doubles rules) to some `GUIDES` entries.
- **Workout mode:** `startWorkout`, `renderWorkout`, `woTickFn`, `completeSet`, `finishWorkout`, rest and hold timers, the EMOM runner (`emomRun`, `beepOnce`), and the feel prompt (`20+`/`10-20`/`missed`).
  - All state is in `k('workout')` and timestamp based (survives app close): `rest`, `work` (hold), `rep` (running rep or item timer, `t0` in workout elapsed ms), `times` (per item key), `sim` (`t0`, `marks`), `notes` (per item key), `wnote`, `rir`, `loads`, `feel`, `min`.
  - Sticky `.wo-sticky` bar (safe area aware, opaque once scrolled) holds the clock, Notes, Minimize and the active strip (EMOM, rep, sim Next, rest).
  - Saturday sims run inside workout mode (`simSegments` + sim card + pinned Next). The old `openTimer` modal only resumes timers started before v35.
  - Timed items (`timedKind`): run reps with a distance (Tue intervals) and single run or station items get Start/Stop.
  - Minimize (`minimizeWorkout`) keeps timers running; `#woPill` reopens. The SW never reloads while `woState()` exists.
  - Units: Settings sets the main unit (`setUnit`); tapping a unit label in workout mode switches only that exercise (`setExUnit`, stored in `k('eunit')`, read by `unitFor(ek)`). Loads lines are always written in the main unit (`toMain`), so the coach format never mixes units.
  - Sled loader (`sledHTML`): sled push/pull cards take the empty sled weight plus 45/25/10 lb plate counts, remembered per exercise in `k('sledcfg')` (kg + plate counts). `sledTotal` is what gets logged. `RACE_WT` shows kg and lb.
  - `wtInfo` strips plan weights from workout titles; the plan number becomes the first suggestion ("Plan weight") and `RACE_WT` shows the HYROX Open race weight as a reference.
  - Finish writes notes: `Workout …`, `Sim week N · total …`, `Runs: …`, `Loads (u): Name 100 (3/3 · RIR 2)`, `Note: …`, `Exercise: …`; station splits go to the stations field (exact seconds kept by `collectStations`).
- **Weights:**
  - `LOADABLE` holds each exercise's weight increment. `suggestLoad` checks the coach override first, then applies progression rules and the 80% deload.
  - `parseLoads` reads the notes line `Loads (kg|lb): Name 100 (3/3) · ...` (optional ` · RIR 0|1|2|3+` inside the brackets, returned as `rir`), which is appended to the log notes when a workout finishes.
  - RIR rule in `suggestLoad`: 0 = repeat, 1 to 2 = +1 increment, 3+ = +2 increments, missed sets = repeat, no RIR = old rule. Deloads unchanged.
- **Sim timer (legacy):** `openTimer` modal; new sims start in workout mode.
- **Plan tab is also the history:** `renderPlan` = viewing banner (`#planSeg`, only when viewing someone else), season dots (also the week selector), ONE week card (`.week-hero`: static `.week-nav` with prev, `#weekJump` select, next, then `#weekHero` filled by `renderPlan`), 7 day cards, Add session. There is no "Plan" heading. Design rule: the season is shown once (dots), the week once (card), no duplicate counts. Day cards show the result inline (`cardLogs` picks logs by stored session name in that plan week plus non session logs on their own date; `resInline` chips: duration, RPE, km @ pace, top 2 loads, note preview, Rest day logged). Expanding a card shows `didHTML` blocks (stats, stations, runs, weights, notes, Edit and Delete via `editLog`/`deleteLog`) above the plan text. The old History tab, month calendar, session list and week filter are gone. Export backup, Import backup and Clear all workouts live in the Settings sheet (`#exportBtn`, `#importRow`/`#importFile`, `#clearBtn`) and are excluded from the sheet's auto close rule like `#unitBtn`.
- **Coach tab** (view id `bench`):
  - **Season dots** (top of the Plan tab, `renderSeasonGrid(who)` into `#gridWrap`): caption row "SEASON" left, "Day N / 189 · X trained" right (Barlow numbers). 27 columns (plan weeks) x 7 rows (Mon to Sun) = 189 round dots (about 10 to 11px, 3px gap), minimalist. Built from `seasonStates(who)` and `dayStatesFor(W,L,todayIso)`, the same source as the day circles. States: `trained` (lime: a non Rest day log on that date, or that day's session logged by stored name anywhere in that plan week) > `rest` (dim lime: Wed, Sun without the optional run, Thu from week 26, or a logged Rest day, once passed) > `missed` (grey) > `future` (faint). Today has a ring (`.now`); untrained today is amber (`b-today`), trained today stays lime plus ring. The dots are the week selector: each column is a button (full column height hit area), the selected week has a rounded lime frame with a faint fill (`.sgm-col.sel`, an outline, no fixed position pseudo elements), tapping a column sets `currentWeek`. Deload weeks (4, 8, 12, 16, 20) get a tiny muted amber dash under the column (absolute `:after`). No legend, no collapse, no 27 tick bar. Fred rejected a big 30px version and a triple tracking header: keep it small. Not on Today on purpose.
  - **Week card**: nav row, then one line with the week focus (ellipsis) plus the Deload or Benchmark badge, the benchmark and race week notices, the 7 day circles (`button.td-day[data-jump]`, same `dayStatesFor` states; tapping one opens that day card and jumps to it with `window.scrollTo({behavior:'instant'})`, because smooth scrolling gets cancelled by the focusout realign script at the end of the page), then one stats line (`sessions done by stored name / planned`, `run km / target`, `RPE avg`) with the thin km bar. No eyebrow, no "Week N:" prefix, no "x / 7 days" pill.
  - Coach card and weekly report: `renderCoach`, `renderReport`.
  - Levels and standards: `renderStanding` (finish ladder), `renderCurves`, `renderStdTable` (constants `STD`, `FINISH`, `RUNPACE`).
  - **Coach maths (`coachModel(who)` is the single source for hero, levers and splits):** goal per item = Intermediate + 0.69 x (Advanced - Intermediate) (`goalOf`, `GOAL_T`), from `STD` per station, `RUNPACE` per km (about 5:53) and `ROXZ` for total transitions (about 6:18); the goal total is about 1:25:00 (`GOAL_TOTAL`). Estimate = sum of the latest full volume split per station (`stationSeries`, gated by `qualSat`) + 8 x the average of all logged 1 km sim runs (`simRuns`: `Runs:` lines of Sat sims in weeks whose plan text says 1 km or full sim, `runs1k`) + goal transitions. It needs all 8 stations and at least 2 timed runs, otherwise the hero shows `-:--:--` with the pill "UNLOCKS WEEK N" (`firstFullVolWeek`, computed from PLAN). When `latestFullSim` exists the hero shows that measured total and keeps the estimate as a small line. Levers are stations and runs behind goal, ranked by seconds lost (runs = 8 x (avg - goal pace)), max 3. Splits bars are diverging around a centre axis, scale +/- 45 s, orange (`--behind`, darker in light mode) to the right with a + sign for behind, `--g2` to the left with a - sign for ahead; direction is never colour only. Fresh tests (`BENCH` except sim) show the latest time, a meter of the gap closed from the earliest logged retest to the `BENCH` target, and never compare to `STD` levels.
- **Levels rule:** `STD`/`FINISH` levels are in race (fatigued) times. Only logged sim data meets them: station splits from full volume sims (`stationSeries`) and full sim totals (`latestFullSim`). Fresh benchmarks (`BENCH`) are only compared to their own target ("X s to target" / "Target hit ✓").
  - Body weight: `renderBW`, plotted as a weekly average line with a dot per weigh-in.
- **Settings sheet:** athlete switch, a "Viewing" segment (`#setSeg`, `setSegRender`, only when sync is set up; the only place to look at Will or Grady, no "(you)" label; it stays in place and is not a `.set-row`), and while viewing someone else Plan and Coach show a "Viewing X, read only · Back to me" pill (`viewBanner`). Then theme, sync, weight unit, Export backup, Import backup, Clear all workouts (confirm), check for updates.
- **Themes:** 5 accents (`ACCENTS`) × Dark, Light or Auto, set through `data-theme="{accent}-{mode}"` on `<html>`. Use the CSS variables `--g1/--g2` (gradient), `--lime` (accent), `--bg`, `--card`, `--text` and `--muted`. Fonts are SF Pro (system) for text and Barlow Condensed (`--font-num`) for numbers.

### AI coach (weekly scheduled task)
- The scheduled task "HYROX weekly AI coach" runs Saturdays at 6:52 PM America/Toronto (`trig_014ofjxYnXwYGhiNEjs8D3rf`).
- It reads the Sheet through the Google Drive connector and the plan from this repo, then writes `coach.json` and `coach-history/`.
- The app loads `coach.json` with no-store: `loadCoach`, `coachFor`, tweaks on Today cards, and `loads` that pre-fill weight fields.
- **`coach/PROMPT.md` is the live prompt, not a copy.** The scheduled task reads it from the repo at run time, so whatever is on `main` is what the coach follows on Saturday.
- **Any change to log formats, session names or stored data must update `coach/PROMPT.md` in the same commit.** That covers the notes lines (`Loads`, `Runs`, `Sim week`, `Note:`), the stations string, session names such as `Rest day`, Benchmarks or `bw` rows, `PLAN` keys, and `coach.json` fields.
- **Commit messages are how the coach chat stays in sync.** It reads the git log, so write descriptive messages: what changed, why, and the coach impact (or "coach impact: none").

## iOS gotchas we already hit
- **No `position:fixed` pseudo-elements inside the fixed, scrolling `#workout` overlay.** iOS painted them over the content and the screen went blank except the sticky rest bar. Put gradients directly on the element's background instead.
- **Bottom tab bar:** iOS standalone can leave the layout viewport short after the keyboard closes. The small script before `</body>` realigns the bar using `visualViewport`. Don't use `screen.height` for this, because it overshoots and cuts the bar off.
- **Keep settings rows that toggle in place** (like the kg/lb unit) out of the "any `.set-row` click closes the sheet" rule, or the screen jumps.
- **Cache:** the SW is network first and auto reloads on update, except during a workout. Users have "Check for updates" in Settings. If Fred reports old behaviour, first check that his screenshot shows the current version.
- **Viewport:** `maximum-scale=1, user-scalable=no` stops double tap zoom, which Fred asked for.

## Test and deploy
1. Run `node tests/smoke.js` (plus `node tests/swap.js` for anything touching Plan, Today or Up next, `node tests/grid.js` and `node tests/plan.js` for the Plan grid, week header or day cards, and `node tests/nav.js` for the bar, the Coach view or the Guides button). They need `playwright`, and Chromium sits at `/opt/pw-browsers/chromium` in Claude's cloud sandbox. Add targeted Playwright checks for what you changed, and look at screenshots at 390x844.
2. Use `p.clock.install()` to pin dates, because the app depends on the current plan week. Wait about 4 s after picking an athlete so the splash clears.
3. Bump `VERSION` in `sw.js`, commit, and push to `main`.
4. Never run `pkill -f` with a broad pattern in the sandbox; it kills the shell. Start servers with `setsid`.
