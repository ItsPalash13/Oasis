## QuizV2 TrueSkill + Answer Flow Updates (2025-11-04)

### Summary
- Simplified answer socket to only pass `isCorrect` for ongoing updates.
- Added TrueSkill update service to adjust both user and question ratings on each answer.
- Added persistent TrueSkill change logs to both user and question models.
- Wired TrueSkill updates into the Quiz V2 answer flow.

### Files Changed
- `Backend/NodeOne/src/sockets/quiz_v2/QuizSession.ts`
  - Refactored `answer` handler:
    - Computes `isCorrect` then calls:
      - `updateUserChapterOngoingByUserIdChapterId({ updateData: { isCorrect } })`
      - `updateUserQuestionTrueskill({ userId, questionId, isCorrect })`
    - Emits `result` with `isCorrect` and proper `correctIndex`.
  - Removed unused imports/variables.

- `Backend/NodeOne/src/services/UserChapterSession.ts`
  - New method: `updateUserQuestionTrueskill({ userId, questionId, isCorrect })`.
    - Uses default `ts-trueskill` env (`new TrueSkill()`; no env vars).
    - Treats user as winner on correct; question as winner on incorrect.
    - Updates and saves:
      - `UserChapterTicket.trueSkillScore { mu, sigma }`
      - `QuestionTs.difficulty { mu, sigma }`
    - Appends changelog entries (see below) to both docs.
  - `updateUserChapterOngoingByUserIdChapterId` now accepts `{ isCorrect }` and no-ops ongoing merge when only correctness is provided.

- `Backend/NodeOne/src/models/UserChapterTicket.ts`
  - Added `tsChangeLogs: ITrueSkillChangeLogEntry[]` with default `[]`.
  - Changelog entry shape:
    - `{ timestamp, questionId, userId, isCorrect, beforeUts, beforeQts, afterUts, afterQts }`.

- `Backend/NodeOne/src/models/QuestionTs.ts`
  - Added `tsChangeLogs` with the same structure and default `[]`.

### Data Model Notes
- Existing documents will accept new `tsChangeLogs` arrays due to defaults; no migration required.
- TrueSkill defaults used (no env var overrides).

### Runtime Behavior
- On every `answer`:
  1. Determine correctness.
  2. Update session state via `{ isCorrect }` (server-side aggregation to be implemented separately).
  3. Update TrueSkill ratings for user and question.
  4. Append a changelog record to both the user's ticket and the question's TS doc.
  5. Emit result with `isCorrect` and the appropriate `correctIndex`.

### QA Checklist
- Answer flow functions without needing client-side session counters.
- TrueSkill ratings update deterministically for correct/incorrect outcomes.
- Changelog entries created per answer on both entities.
- Lint passes for modified files.


