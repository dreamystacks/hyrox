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

### Features map (search these function names)
- **Today:** `renderToday`, `planPos`, session picker (`k('pick')`), weigh-in row (`bwDue`). Once a log exists for today, the pickers and buttons are replaced by `doneCard` (stats, stations, runs, weights vs last time via `prevLoadBefore`, notes); `upNext` stays below. "Log rest day" (`logRestDay`) saves a log with session `Rest day` (duration 0); it shows as done but never counts as a workout in History or the coach.
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
- **History:** `renderHistory`, `renderCalendar` (month grid).
- **Progress:**
  - Coach card and weekly report: `renderCoach`, `renderReport`.
  - Levels and standards: `renderStanding` (finish ladder), `renderCurves`, `renderStdTable` (constants `STD`, `FINISH`, `RUNPACE`).
  - **Levels rule:** `STD`/`FINISH` levels are in race (fatigued) times. Only logged sim data meets them: station splits from full volume sims (`stationSeries`) and full sim totals (`latestFullSim`). Fresh benchmarks (`BENCH`) are only compared to their own target ("X s to target" / "Target hit ✓").
  - Body weight: `renderBW`, plotted as a weekly average line with a dot per weigh-in.
- **Settings sheet:** athlete switch, theme, sync, weight unit, check for updates, guides.
- **Themes:** 5 accents (`ACCENTS`) × Dark, Light or Auto, set through `data-theme="{accent}-{mode}"` on `<html>`. Use the CSS variables `--g1/--g2` (gradient), `--lime` (accent), `--bg`, `--card`, `--text` and `--muted`. Fonts are SF Pro (system) for text and Barlow Condensed (`--font-num`) for numbers.

### AI coach (weekly scheduled task)
- The scheduled task "HYROX weekly AI coach" runs Saturdays at 6:52 PM America/Toronto (`trig_014ofjxYnXwYGhiNEjs8D3rf`).
- It reads the Sheet through the Google Drive connector and the plan from this repo, then writes `coach.json` and `coach-history/`.
- The app loads `coach.json` with no-store: `loadCoach`, `coachFor`, tweaks on Today cards, and `loads` that pre-fill weight fields.
- If you change the data model or the plan structure, update the task prompt too (`coach/PROMPT.md` holds the copy).

## iOS gotchas we already hit
- **No `position:fixed` pseudo-elements inside the fixed, scrolling `#workout` overlay.** iOS painted them over the content and the screen went blank except the sticky rest bar. Put gradients directly on the element's background instead.
- **Bottom tab bar:** iOS standalone can leave the layout viewport short after the keyboard closes. The small script before `</body>` realigns the bar using `visualViewport`. Don't use `screen.height` for this, because it overshoots and cuts the bar off.
- **Keep settings rows that toggle in place** (like the kg/lb unit) out of the "any `.set-row` click closes the sheet" rule, or the screen jumps.
- **Cache:** the SW is network first and auto reloads on update, except during a workout. Users have "Check for updates" in Settings. If Fred reports old behaviour, first check that his screenshot shows the current version.
- **Viewport:** `maximum-scale=1, user-scalable=no` stops double tap zoom, which Fred asked for.

## Test and deploy
1. Run `node tests/smoke.js`. It needs `playwright`, and Chromium sits at `/opt/pw-browsers/chromium` in Claude's cloud sandbox. Add targeted Playwright checks for what you changed, and look at screenshots at 390x844.
2. Use `p.clock.install()` to pin dates, because the app depends on the current plan week. Wait about 4 s after picking an athlete so the splash clears.
3. Bump `VERSION` in `sw.js`, commit, and push to `main`.
4. Never run `pkill -f` with a broad pattern in the sandbox; it kills the shell. Start servers with `setsid`.
