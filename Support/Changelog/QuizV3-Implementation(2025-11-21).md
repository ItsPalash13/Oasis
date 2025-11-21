## QuizV3 Implementation - Batch Submission with Question Palette (2025-11-21)

### Summary
- Implemented QuizV3 with a simplified batch submission model (3 questions at once).
- Created `UserChapterSession` model (simpler than `UserChapterTicket`, no `maxStreak`).
- Questions selected around user's TrueSkill `mu ± 1` range.
- TrueSkill updates performed in batch at quiz end (not per answer).
- Added exam-style Question Palette component with status indicators.
- Implemented single-question display with Previous/Next navigation.
- Submit button moved to quiz header for constant access.
- Added temporary debug box for development (shows answer and TrueSkill data).

### Backend Changes

#### Models
- **File**: `Backend/NodeOne/src/models/UserChapterSession.ts`
  - New model: `IUserChapterSession` and `IOngoingSessionV3`.
  - `ongoing` field: Created with new `_id` on quiz start, completely removed on socket disconnect.
  - `ongoing` structure:
    - `questions`: Array of 3 question IDs
    - `answers`: Array of `{ questionId, answerIndex }`
    - `questionsAttempted`, `questionsCorrect`, `questionsIncorrect`, `currentScore`
  - `ongoing` is optional (can be removed entirely).
  - TrueSkill change logs supported (`tsChangeLogs`).

#### Routes
- **File**: `Backend/NodeOne/src/routes/level_v3.ts`
  - New endpoint: `POST /api/level_v3/start`
  - Returns `{ userChapterTicket: string }` (session ID).
  - Protected with `authMiddleware`.

- **File**: `Backend/NodeOne/src/routes/index.ts`
  - Registered: `router.use('/level_v3', levelV3Routes);`

#### Services

- **File**: `Backend/NodeOne/src/services/quizv3/userchapter-session/UserChapterSession.ts`
  - `startUserChapterSession`: Creates/updates session, always creates new `ongoing` object with new `_id`.
  - `getCurrentSessionBySocketTicket`: Retrieves session by socket ticket.
  - `updateUserChapterOngoing`: Updates ongoing session data.
  - `clearOngoingSession`: Uses `$unset` to completely remove `ongoing` field from document.

- **File**: `Backend/NodeOne/src/services/quizv3/questions/FetchQuestions.ts`
  - Fetches 3 questions around user's TrueSkill `mu ± 1` range.
  - Filters out already attempted questions.
  - Returns questions with mix of easier and harder difficulty.

- **File**: `Backend/NodeOne/src/services/quizv3/quiz/InitiateQuiz.ts`
  - Fetches 3 questions based on user's TrueSkill range.
  - Stores question IDs in `ongoing.questions`.
  - Initializes `ongoing.answers` array.
  - Returns questions with user and question TrueSkill data attached.

- **File**: `Backend/NodeOne/src/services/quizv3/quiz/SubmitQuiz.ts`
  - Processes all submitted answers at once.
  - Calculates scores (correct, incorrect, attempted).
  - Performs batch TrueSkill updates (skips unanswered questions).
  - Returns results with score breakdown.

- **File**: `Backend/NodeOne/src/services/quizv3/userchapter-session/TrueskillHandler.ts`
  - Batch TrueSkill update service.
  - Updates user and question ratings after all answers submitted.
  - Logs TrueSkill changes to `tsChangeLogs`.
  - Handles unanswered questions (skips for TrueSkill updates).

#### Sockets
- **File**: `Backend/NodeOne/src/sockets/quiz_v3/QuizSession.ts`
  - `initiate` handler: Sends all 3 questions at once.
  - `submit` handler: Receives all answers, processes batch submission.
  - `disconnect` handler: Calls `clearOngoingSession` to remove `ongoing` field.
  - Stores `sessionId` on socket for disconnect cleanup.

- **File**: `Backend/NodeOne/src/sockets/index.ts`
  - Registered: `quizV3Handler(socket);`

### Frontend Changes

#### API Integration
- **File**: `Frontend/ReactOne/src/features/api/chapterAPI.js`
  - Added `startGameV3` mutation: `POST /api/level_v3/start`.

- **File**: `Frontend/ReactOne/src/components/ChapterCard.jsx`
  - Modified to use `useStartGameV3Mutation`.
  - Navigates to `/quiz_v3/:quizId` on chapter click.

#### Routing
- **File**: `Frontend/ReactOne/src/App.jsx`
  - Added route: `/quiz_v3/:quizId` with `QuizWrapper_v3` component.

#### Quiz Components

- **File**: `Frontend/ReactOne/src/Layouts/Quiz_v3/Quiz.jsx`
  - **State Management**:
    - `currentQuestionIndex`: Tracks which question is displayed.
    - `questionStates`: Array tracking `visited`, `answered`, `markedForReview` for each question.
    - `questionRefs`: Refs for scrolling to specific questions.
    - `paletteOpen`: Controls Question Palette visibility.
    - `debugBoxOpen`: Controls temporary debug box visibility.
  
  - **Features**:
    - Single question display (one at a time).
    - Previous/Next navigation buttons.
    - Mark for Review functionality (bookmark icon per question).
    - Submit button in quiz header (always visible).
    - Question Palette integration (collapsible right panel).
    - Temporary debug box (bottom right, shows answer and TrueSkill data).
  
  - **Socket Flow**:
    - On mount: Connect, emit `initiate` with `sessionId`.
    - Receive `questions` event with all 3 questions.
    - On submit: Emit `submit` with all answers array.
    - Receive `results` event with score breakdown.
    - On disconnect: Socket cleanup handled by backend.

- **File**: `Frontend/ReactOne/src/Layouts/Quiz_v3/QuestionPalette.jsx`
  - **Status Indicators** (2 columns, compact layout):
    - Not Visited (grey)
    - Not Answered (orange with flag icon)
    - Answered (green with flag icon)
    - Marked for Review (purple with circle icon)
    - Answered & Marked for Review (combined indicators)
  
  - **Question Number Grid**:
    - Scrollable grid of question numbers (01, 02, 03...).
    - Color-coded based on state.
    - Clicking number jumps to that question.
    - Current question highlighted.
  
  - **Props**:
    - `currentIndex`: Current question index.
    - `questionStates`: Array of question states.
    - `onNavigate(index)`: Callback to navigate to question.
    - `totalQuestions`: Total number of questions.
    - `onToggle`: Toggle palette visibility (handled by parent).
    - `isOpen`: Palette open state.

  - **Styling**:
    - Compact status indicators (32px boxes, smaller icons).
    - Two-column layout for status indicators.
    - Border radius on status indicator boxes.
    - Scrollable question grid.

### UI/UX Features

#### Question Palette Panel
- Material-UI `Drawer` component (right side, persistent).
- Collapsible with toggle button.
- Toggle button positioned:
  - Inside drawer (top right) when open (close icon).
  - Fixed on right edge when closed (chevron left icon).
- Main content area adjusts width when palette opens/closes.
- No overlapping or overflow issues.

#### Quiz Header
- Back button (left side).
- Submit button (right side, always visible during quiz).
- Submit button shows: "Submit Quiz".

#### Navigation
- Previous button (disabled on first question).
- Next button (disabled on last question).
- Direct navigation via Question Palette.

#### Debug Box (Temporary)
- Fixed position (bottom right).
- Toggle button (BugReport icon when closed).
- Close button inside box (top right).
- Displays:
  - Current question number.
  - Correct answer(s).
  - User TrueSkill (μ, σ).
  - Question TrueSkill (μ, σ).
- Marked with `[TEMPORARY DEV DEBUG]` label.

### Data Flow

#### Quiz Start
1. User clicks chapter → `POST /api/level_v3/start` → receives `userChapterTicket`.
2. Navigate to `/quiz_v3/:quizId`.
3. Socket connects, emits `initiate` with `sessionId`.
4. Backend fetches 3 questions around user's `mu ± 1`.
5. Backend stores questions in `ongoing.questions`.
6. Frontend receives all 3 questions, displays first question.

#### During Quiz
1. User navigates between questions (Previous/Next or Palette).
2. User selects answers (stored in `selectedAnswers` state).
3. User can mark questions for review.
4. Question states update (visited, answered, markedForReview).

#### Quiz Submission
1. User clicks "Submit Quiz" in header.
2. Frontend sends all answers: `{ answers: [{ questionId, answerIndex }], sessionId }`.
3. Backend processes batch submission:
   - Calculates scores.
   - Updates TrueSkill for user and questions (batch, skips unanswered).
   - Removes `ongoing` field.
4. Frontend receives results with score breakdown.
5. Results screen displays: Total XP, Correct, Incorrect, Attempted, Accuracy.

#### Disconnect Handling
- On socket disconnect, backend calls `clearOngoingSession`.
- `ongoing` field is completely removed from `UserChapterSession` document.

### Key Differences from QuizV2

1. **Question Delivery**: 3 questions at once (vs. one at a time).
2. **Submission**: Batch submission at end (vs. per-answer submission).
3. **TrueSkill Updates**: Batch at end (vs. per answer).
4. **Session Model**: `UserChapterSession` (simpler, no `maxStreak`).
5. **Ongoing Field**: Created with new `_id` on start, removed entirely on disconnect.
6. **UI**: Single question display with navigation (vs. immediate feedback).
7. **Question Palette**: Exam-style palette with status indicators.
8. **Question Selection**: Based on user's TrueSkill range (`mu ± 1`).

### Files Changed

#### Backend
- `Backend/NodeOne/src/models/UserChapterSession.ts` (new)
- `Backend/NodeOne/src/routes/level_v3.ts` (new)
- `Backend/NodeOne/src/routes/index.ts`
- `Backend/NodeOne/src/services/quizv3/userchapter-session/UserChapterSession.ts` (new)
- `Backend/NodeOne/src/services/quizv3/questions/FetchQuestions.ts` (new)
- `Backend/NodeOne/src/services/quizv3/quiz/InitiateQuiz.ts` (new)
- `Backend/NodeOne/src/services/quizv3/quiz/SubmitQuiz.ts` (new)
- `Backend/NodeOne/src/services/quizv3/userchapter-session/TrueskillHandler.ts` (new)
- `Backend/NodeOne/src/sockets/quiz_v3/QuizSession.ts` (new)
- `Backend/NodeOne/src/sockets/index.ts`

#### Frontend
- `Frontend/ReactOne/src/features/api/chapterAPI.js`
- `Frontend/ReactOne/src/components/ChapterCard.jsx`
- `Frontend/ReactOne/src/App.jsx`
- `Frontend/ReactOne/src/Layouts/Quiz_v3/Quiz.jsx` (new)
- `Frontend/ReactOne/src/Layouts/Quiz_v3/QuestionPalette.jsx` (new)

### QA Checklist
- [x] Quiz starts successfully with 3 questions.
- [x] Questions selected around user's TrueSkill range.
- [x] Navigation between questions works (Previous/Next and Palette).
- [x] Mark for Review functionality works.
- [x] Question Palette displays correct states.
- [x] Submit button accessible from header.
- [x] Batch submission processes all answers.
- [x] TrueSkill updates only for answered questions.
- [x] `ongoing` field removed on disconnect.
- [x] Results screen displays correct score breakdown.
- [x] Debug box toggle works (temporary feature).
- [x] No horizontal overflow issues.
- [x] Palette toggle button doesn't overlap content.

### Notes
- Debug box is temporary and should be removed before production.
- Question count is currently 3 (can be adjusted in `FetchQuestions.ts`).
- TrueSkill range is `mu ± 1` (can be adjusted in `FetchQuestions.ts`).
- Unanswered questions are skipped for TrueSkill updates (by design).

