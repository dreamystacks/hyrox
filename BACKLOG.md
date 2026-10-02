# HYROX app backlog

Single source of truth for app work. Fred writes app feedback in his training notes on a line starting with `App:` (the coach ignores those lines). The brain chat reads them from the Sheet and moves them here. Code works from this file. Keep entries short; move finished items to Done with the commit subject.

## Open
- [ ] Assisted pull-up mode: Will does pull-ups on the assisted machine (Oct 2, 70 lb assist, RIR 1), but the app reads the number as added weight and would suggest +5 lb, which means more help. Add a per exercise "assisted" toggle that flips the progression (lower is better) and writes the name as "Assisted pull-up" in the Loads line. Coach prompt already handles it from the note until this ships.
- [ ] Wednesday coach check-in that can adjust Fri and Sat (decide after 2 or 3 Saturday reports)
- [ ] Coach overrides for sets and reps (today it only changes loads, EMOM moves and volume trims; decide after 2 or 3 reports)
- [ ] Monday ankle test (knee to wall distance, cm) stored like body weight in Benchmarks rows, only if Fred wants to track the mobility routine
- [ ] Guided mobility mode (auto timer through the daily 3), only if the tick list is not enough
- [ ] Sat sim sled stations ignore the gym lane (Monday EMOM only for now)

## Done
- [x] Timer stays visible while typing notes (workout screen follows the visual viewport)
- [x] Bar weight input for barbell lifts (per side + bar = total)
- [x] Gym lane length setting, sled distances rounded to whole lengths, real distance logged
- [x] "App:" notes prefix ignored by the coach
- [x] Mobility routine: daily 3 on Today, full 9 on Wednesday
