# Dummy Users Configuration

This file explains how to configure dummy users for different chapters.

## Structure

The `dummyUsers.json` file is structured as an object where:
- Each key is a chapter ID (as a string)
- Each value is an array of dummy user objects
- The `"default"` key is used as a fallback for chapters that don't have specific dummy users

## Admin Panel Management Tool

A new **Misc** tab has been added to the Admin Panel that provides a user-friendly interface for managing dummy users. This tool allows you to:

### Features

1. **View All Chapters**: Browse through all chapters (default, YOUR_CHAPTER_ID_1, YOUR_CHAPTER_ID_2, etc.) using tabs
2. **Add New Chapters**: Click the "Add Chapter" button to create a new chapter with default user values
   - Enter the chapter ID
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
8. **Download JSON**: Download the updated JSON file to replace the original `dummyUsers.json`
9. **Reset to Default**: Clear all changes and reload from the original JSON file
10. **Persistence**: Changes are automatically saved to localStorage

### How to Use

1. Navigate to **Admin Panel** → **Misc** tab
2. Select a chapter from the tabs (or add a new one)
3. Use "Add User" to create new users or click the edit/delete icons to modify existing ones
4. Changes are saved automatically to localStorage
5. Use "Download JSON" to export the updated data
6. Replace the original `dummyUsers.json` file with the downloaded file if you want to persist changes across sessions

### Manual Configuration (Alternative Method)

If you prefer to edit the JSON file directly:

1. Open `dummyUsers.json`
2. Add a new entry with your chapter ID as the key (you can find the chapter ID in the browser console or database)
3. Copy the structure from `"default"` or another chapter
4. Modify the user data (names, ratings, colors) as needed

Example:
```json
{
  "default": [...],
  "YOUR_CHAPTER_ID_HERE": [
    {
      "userId": "dummy_ch3_user_001",
      "fullName": "John Doe",
      "userRating": 5000,
      "avatarBgColor": "rgba(255, 0, 0, 0.8)"
    },
    ...
  ]
}
```

## Disabling Dummy Users

To disable dummy users entirely, edit `Leaderboard.jsx` at **line 59**:

Change this:
```javascript
const filteredDummyUsers = chapterDummyUsers.filter(
```

To this:
```javascript
const filteredDummyUsers = [].filter(
```

Or simply replace `chapterDummyUsers` with `[]` on line 59.

## Implementation Details

The Admin Panel tool (`Frontend/ReactOne/src/Layouts/Admin/Misc.jsx`) was created to provide an easy-to-use interface for managing dummy users. The component:

- Loads data from `dummyUsers.json` on initialization
- Saves changes to localStorage for persistence
- Provides a download feature to export updated JSON
- Includes validation and error handling
- Automatically sorts users by rating
- Prevents deletion of the default chapter
- Validates chapter ID uniqueness when adding new chapters

