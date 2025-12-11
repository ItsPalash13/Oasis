import { createSlice } from '@reduxjs/toolkit';

// Stores metadata list and chapter session ratings fetched on home
const initialState = {
  metadataList: [],
  chapterSessionsMap: {}, // chapterId -> userRating
  chapterSessionsFull: [] // Full chapter session data including analytics
};

const metadataSlice = createSlice({
  name: 'metadata',
  initialState,
  reducers: {
    setMetadataList: (state, action) => {
      state.metadataList = Array.isArray(action.payload) ? action.payload : [];
    },
    setChapterSessionsMap: (state, action) => {
      state.chapterSessionsMap = action.payload || {};
    },
    setChapterSessionsFull: (state, action) => {
      state.chapterSessionsFull = Array.isArray(action.payload) ? action.payload : [];
    }
  }
});

export const { setMetadataList, setChapterSessionsMap, setChapterSessionsFull } = metadataSlice.actions;
export default metadataSlice.reducer;

