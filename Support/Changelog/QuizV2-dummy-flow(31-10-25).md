# Quiz v2 (Dummy) - Integration Report

## Overview
- Adds a minimal Quiz v2 loop that serves random dummy questions over sockets.
- Start flow: client calls `POST /api/level_v2_dummy/start` → receives `userChapterTicket` → maps to `session.id` → stores in Redux → navigates to `/quiz_v2/:quizId`.
- Existing v1 quiz remains intact; v2 is additive and easily reverted.

## Backend

### Routes registry
- File: `Backend/NodeOne/src/routes/index.ts`
  - Registers `router.use('/level_v2_dummy', levelV2Routes);`

### Start endpoint
- File: `Backend/NodeOne/src/routes/level_v2_dummy.ts`
  - `POST /api/level_v2_dummy/start` returns `{ userChapterTicket: string }` (16-digit ID).

### Socket bootstrap
- File: `Backend/NodeOne/src/sockets/index.ts`
  - On `connection`, registers `quizV2DummyHandlers(socket)` on the default namespace.

### Dummy quiz handlers
- File: `Backend/NodeOne/src/sockets/quiz_v2_dummy/quiz.ts`
  - `QUESTIONS`: 4 sample Q/A items.
  - `initiate` → emits `question` `{ id, ques, options }` with a random question.
  - `answer` `{ id, answerIndex }` → emits `result` `{ isCorrect, correctIndex, correctOption }`.

## Frontend

### API (RTK Query)
- File: `Frontend/ReactOne/src/features/api/chapterAPI.js`
  - Adds `startGame` mutation: `POST /api/level_v2_dummy/start`.

### Redux slice
- File: `Frontend/ReactOne/src/features/auth/quizSessionSlice.js`
  - Stores v2 `session` (`setquizSession`, `clearquizSession`).

### Chapter card behavior
- File: `Frontend/ReactOne/src/components/ChapterCard.jsx`
  - On click (when `chapter.status !== false`):
    1) Calls `startGame().unwrap()`
    2) Maps `{ userChapterTicket }` → `{ data: { session: { id } } }` if needed
    3) `dispatch(setquizSession(session))`
    4) `navigate('/quiz_v2/:quizId')`
  - Old v1 `onClick`/navigate lines are commented for easy revert.

### Chapters grid
- File: `Frontend/ReactOne/src/Layouts/Chapters/Chapter.tsx`
  - Delegates click behavior to `ChapterCard` (no embedded v2 logic).

### App routing
- File: `Frontend/ReactOne/src/App.jsx`
  - Adds `QuizWrapper_v2` and route:
    - `<Route path="/quiz_v2/:quizId" element={<ProtectedRoute><QuizWrapper_v2 socket={socket} /></ProtectedRoute>} />`
  - Comment explains how to revert to only v1.

### Quiz v2 UI
- File: `Frontend/ReactOne/src/Layouts/Quiz_v2/Quiz.jsx`
  - Minimal UI: header (timer commented), question card, options grid, submit/next buttons.
  - Socket flow:
    - On mount: connect, `emit('initiate')`, listen `question` and `result`.
    - Submit: `emit('answer', { id, answerIndex })`.
    - Next: `emit('initiate')` to fetch another random question.
  - Timer display and interval are commented out per request.

## Events & Endpoints
- REST: `POST /api/level_v2_dummy/start` → `{ userChapterTicket }`.
- Socket:
  - Client `emit('initiate')` → server `emit('question', { id, ques, options })`.
  - Client `emit('answer', { id, answerIndex })` → server `emit('result', { isCorrect, correctIndex, correctOption })`.

## Reverting to v1
- In `App.jsx`: comment the `/quiz_v2/:quizId` route and keep only the `/quiz/:levelId` route.
- In `ChapterCard.jsx`: uncomment the old `onClick` or direct `navigate('/chapter/:id')` and remove the v2 start flow.

## Troubleshooting
- Clicks not starting v2:
  - Ensure `chapter.status` is truthy for clickable cards.
  - Check console logs in `ChapterCard.jsx` (start call, navigation).
- Socket not receiving events:
  - Confirm server logs show connection and that `quizV2DummyHandlers` is initialized.
  - Verify frontend connects to the correct backend URL (`VITE_BACKEND_URL`).
- Timer showing:
  - The timer code is commented. Remove imports/vars if lints flag unused symbols.


