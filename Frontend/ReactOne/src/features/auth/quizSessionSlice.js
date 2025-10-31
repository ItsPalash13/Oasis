import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  session: null
};

const quizSessionSlice = createSlice({
  name: 'quizSession',
  initialState,
  reducers: {
    setquizSession: (state, action) => {
      state.session = action.payload;
    },
    clearquizSession: (state) => {
      state.session = null;
    }
  }
});

export const { setquizSession, clearquizSession } = quizSessionSlice.actions;
export default quizSessionSlice.reducer;


