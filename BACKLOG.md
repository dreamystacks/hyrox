# HYROX app backlog

Single source of truth for app work. Fred writes app feedback in his training notes on a line starting with `App:` (the coach ignores those lines). The brain chat reads them from the Sheet and moves them here. Code works from this file. Keep entries short; move finished items to Done with the commit subject.

## Open
- [ ] Wednesday coach check-in that can adjust Fri and Sat (decide after 2 or 3 adaptive Saturday reports)
- [ ] Monday ankle test (knee to wall distance, cm) stored like body weight in Benchmarks rows, only if Fred wants to track the mobility routine
- [ ] Guided mobility mode (auto timer through the daily 3), only if the tick list is not enough

- [ ] EMOM rest left per minute (one tap at the end of each minute), only if Fred wants it (v194 records one value per move)
- [ ] Zone 2 range: the app uses 130 to 140 bpm, Garmin's zones (max HR 191, LTHR 171) put zone 2 at about 115 to 134; pick one
- [ ] Plan edits: move a session to another weekday (v159 only edits this week's text)

## Open (Fred to do)
- [ ] Redeploy the web app with the v193 Garmin.gs (per set heart rate), then import the next lifting session and check the ♥ per set

## Open (device checks)
- [ ] Confirm on iPhone after v189 and v190: no bounce when tapping a reps box, tab bar back at the bottom after a workout
- [ ] Confirm on iPhone: screen stays awake through a whole workout, the lock screen and island Next button works, EMOM beeps keep going with the screen locked

## Done
- [x] Keyboard bounce and stuck empty space in workout mode (v189); tab bar stuck mid screen after a workout (v190)
- [x] EMOM heart rate per move from the watch minute laps, notes folded (v191); calories split per watch activity (v192)
- [x] Heart rate per set: set tick times plus the watch heart rate stream (v193, needs the redeploy); EMOM rest left in the report (v194)
- [x] Adaptive coach: weekly per athlete plan changes from coach.json, badges on every surface, Settings toggle (v123)
- [x] Timer stays visible while typing notes (workout screen follows the visual viewport)
- [x] Bar weight input for barbell lifts (per side + bar = total)
- [x] Gym lane length setting, sled distances rounded to whole lengths, real distance logged
- [x] "App:" notes prefix ignored by the coach
- [x] Mobility routine: daily 3 on Today, full 9 on Wednesday
- [x] Saturday sim lines show real numbers: half volume distances, lane rounding for sleds and burpees, sled plate target (`satDetail`), also in the workout sim card
- [x] Workout dock: big bottom button for the next action, tap lock, sim and rep double tap guards, mis tapped laps dropped (v68)
- [x] Screen wake lock with video fallback, lock screen and Dynamic Island Next control via Now Playing, Settings toggle (v68)
- [x] Last time line (load, sets, RIR, note) and official HYROX distance on every exercise, EMOM totals (v68)
- [x] Assisted pull-up toggle (v68)
- [x] Race standards in metric and imperial everywhere in workout mode (v69)
- [x] Two mat lines (16 m long, 12 m short): every mat distance shows lengths and back and forth count (v70)
- [x] Plan: "Did Fri's session" on the day a swapped session was done (v72); Rest day logs no longer hide the real result on a card (v73)
- [x] Workout: compact top strip, no jump when a notes box gets focus, no Plan content showing through with the keyboard up (v73)
- [x] Plan: Friday EMOM erg targets in metres instead of calories, DB bench 3 x 8 instead of 3 x 5 (Fred, Oct 11)
- [x] Plan week as a diary: each card shows what was done that date, planned session as a grey line, one colour rule for chips, circles and dots (v74)
