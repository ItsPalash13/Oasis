# Dummy Users Configuration

This file explains how to configure dummy users for different chapters.

## Overview

Dummy users are now stored in a **Misc** database table instead of a JSON file. This provides better data persistence, easier management, and real-time updates across all users.

## Database Structure

The `Misc` collection in MongoDB stores dummy users with the following structure:
- **chapterId** (String, unique): The chapter ID
- **users** (Array): Array of dummy user objects
  - **userId** (String): Unique user identifier
  - **fullName** (String): User's full name
  - **userRating** (Number): User's rating/score
  - **avatarBgColor** (String): Avatar background color in rgba format

## Admin Panel Management Tool

A **Misc** tab has been added to the Admin Panel that provides a user-friendly interface for managing dummy users. This tool allows you to:

### Features

1. **View All Chapters**: Browse through all chapters using tabs
2. **Add New Chapters**: Click the "Add Chapter" button to create a new chapter
   - Enter the chapter ID (e.g., `693ee2941bb97c8f9945de78`)
   - The new chapter will be initialized with the same users as the "default" chapter
   - You can then customize the users as needed
3. **Add Users**: Add new dummy users to any chapter
   - User ID (unique identifier)
   - Full Name
   - User Rating (numeric)
   - Avatar Background Color (rgba format)
4. **Edit Users**: Modify existing user data (name, rating, avatar color)
5. **Delete Users**: Remove users from any chapter
6. **Delete Chapters**: Remove entire chapters (except the default chapter)
7. **Auto-Sorting**: Users are automatically sorted by rating in descending order
8. **Real-time Updates**: Changes are immediately saved to the database and reflected across all users

### How to Use

1. Navigate to **Admin Panel** → **Misc** tab
2. Select a chapter from the tabs (or add a new one)
3. Use "Add User" to create new users or click the edit/delete icons to modify existing ones
4. Changes are saved automatically to the database
5. The leaderboard will automatically fetch and display the updated dummy users

### API Endpoints

**Admin Endpoints** (require authentication):
- `GET /api/admin/misc` - Get all chapters with their dummy users
- `GET /api/admin/misc/chapter/:chapterId` - Get dummy users for a specific chapter
- `POST /api/admin/misc/chapter/:chapterId` - Create or update a chapter's dummy users
- `POST /api/admin/misc/chapter/:chapterId/user` - Add a new user to a chapter
- `PUT /api/admin/misc/chapter/:chapterId/user/:userId` - Update a user
- `DELETE /api/admin/misc/chapter/:chapterId/user/:userId` - Delete a user
- `DELETE /api/admin/misc/chapter/:chapterId` - Delete an entire chapter

**Public Endpoint** (for leaderboard):
- `GET /api/misc/chapter/:chapterId` - Get dummy users for a specific chapter (falls back to default if chapter not found)

## Disabling Dummy Users

To disable dummy users entirely in the leaderboard, edit `Leaderboard.jsx`:

Change this:
```javascript
const filteredDummyUsers = chapterDummyUsers.filter(
```

To this:
```javascript
const filteredDummyUsers = [].filter(
```

Or simply replace `chapterDummyUsers` with `[]`.

## Migration from JSON

If you have existing data in `dummyUsers.json`, you can migrate it to the database by:

1. Using the Admin Panel to manually add chapters and users
2. Or creating a migration script that reads the JSON file and creates database entries via the API

## Implementation Details

The system uses:
- **Backend**: MongoDB collection named `Misc` with schema defined in `Backend/NodeOne/src/models/Misc.ts`
- **Frontend Admin**: `Frontend/ReactOne/src/Layouts/Admin/Misc.jsx` - Admin interface for managing dummy users
- **Frontend Leaderboard**: `Frontend/ReactOne/src/Layouts/Chapters/ChapterDialog/Leaderboard.jsx` - Fetches dummy users from API
- **API Routes**: 
  - Admin routes: `Backend/NodeOne/src/routes/admin/misc.ts`
  - Public route: `Backend/NodeOne/src/routes/misc.ts`
