import { createSlice } from '@reduxjs/toolkit';

// Stores metadata list and chapter session ratings fetched on home
const initialState = {
  metadataList: [],
  chapterSessionsMap: {}
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
    }
  }
});

export const { setMetadataList, setChapterSessionsMap } = metadataSlice.actions;
export default metadataSlice.reducer;

