## User Rating Rank System (2025-11-26)

### Summary
- Implemented user rating to rank mapping system using metadata.
- Display rank badges (Silver, Gold, Platinum) next to chapter names on homepage.
- Added API endpoints and hooks for metadata and user chapter sessions.

### Backend Changes

#### Models
- **File**: `Backend/NodeOne/src/models/Metadata.ts`
  - Added optional `minRank` and `maxRank` fields for Rank-type metadata.

#### Routes
- **File**: `Backend/NodeOne/src/routes/user.ts`
  - New endpoint: `GET /api/user/chapter-sessions` (requires auth)
  - Returns all UserChapterSessions for current user with `chapterId` and `userRating`.

### Frontend Changes

#### API Integration
- **File**: `Frontend/ReactOne/src/features/api/metadataAPI.js` (new)
  - Created RTK Query API slice with `useGetAllMetadataQuery()` hook.
  - Registered in Redux store.

- **File**: `Frontend/ReactOne/src/features/api/userAPI.js`
  - Added `useGetChapterSessionsQuery()` hook for fetching user chapter sessions.

#### Utilities
- **File**: `Frontend/ReactOne/src/utils/rankUtils.js` (new)
  - `getRankForRating()` function: Maps userRating to rank metadata name.
  - Filters metadata by `metadataType === "Rank"`.
  - Matches userRating to rank range (`minRank <= userRating <= maxRank`).
  - Returns rank name or defaults to "Silver" if no match.

#### Components
- **File**: `Frontend/ReactOne/src/Layouts/Dashboard/Dashboard.jsx`
  - Fetches all metadata and chapter sessions on component mount.
  - Creates `chapterSessionsMap` (chapterId -> userRating) for quick lookup.
  - Passes metadata and chapter sessions to child components.

- **File**: `Frontend/ReactOne/src/Layouts/Subjects/SubjectSection.jsx`
  - Receives `metadataList` and `chapterSessionsMap` as props.
  - Passes `userRating` and `metadataList` to each ChapterCard.

- **File**: `Frontend/ReactOne/src/components/ChapterCard.jsx`
  - Displays rank badge (Chip) next to chapter name.
  - Calls `getRankForRating()` to determine rank based on userRating.
  - Rank badge appears on the right side of chapter name.

- **File**: `Frontend/ReactOne/src/components/Navbar.jsx`
  - Commented out Health, Coins/XP, and Streak icon chips.

- **File**: `Frontend/ReactOne/src/Layouts/Chapters/Chapter.tsx`
  - Updated to support rank display (same as Dashboard).

### Data Flow
1. On app load: Fetch all metadata and user chapter sessions.
2. For each chapter: Look up userRating from chapterSessionsMap.
3. Map userRating to rank: Use `getRankForRating()` with metadata.
4. Display rank: Show rank name badge next to chapter name.

### Files Changed

#### Backend
- `Backend/NodeOne/src/models/Metadata.ts`
- `Backend/NodeOne/src/routes/user.ts`

#### Frontend
- `Frontend/ReactOne/src/features/api/metadataAPI.js` (new)
- `Frontend/ReactOne/src/features/api/userAPI.js`
- `Frontend/ReactOne/src/utils/rankUtils.js` (new)
- `Frontend/ReactOne/src/store.js`
- `Frontend/ReactOne/src/Layouts/Dashboard/Dashboard.jsx`
- `Frontend/ReactOne/src/Layouts/Subjects/SubjectSection.jsx`
- `Frontend/ReactOne/src/components/ChapterCard.jsx`
- `Frontend/ReactOne/src/components/Navbar.jsx`
- `Frontend/ReactOne/src/Layouts/Chapters/Chapter.tsx`

### Notes
- Rank metadata requires `metadataType: "Rank"` and valid `minRank`/`maxRank` fields.
- Default rank is "Silver" if userRating is 0, null, or doesn't match any range.
- Rank ranges should be non-overlapping for accurate matching.

