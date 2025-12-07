import { configureStore } from '@reduxjs/toolkit';
import { userApi } from './features/api/userAPI';
import { levelApi } from './features/api/levelAPI';
import { chapterApi } from './features/api/chapterAPI';
import { performanceApi } from './features/api/performanceAPI';
import { metadataApi } from './features/api/metadataAPI';
import authReducer from './features/auth/authSlice';
import levelSessionReducer from './features/auth/levelSessionSlice';
import quizSessionReducer from './features/auth/quizSessionSlice';
import metadataReducer from './features/metadata/metadataSlice';
import { adminApi } from './features/api/adminAPI';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    levelSession: levelSessionReducer,
    quizSession: quizSessionReducer,
    metadata: metadataReducer,
    // RTK Query reducers
    [userApi.reducerPath]: userApi.reducer,
    [levelApi.reducerPath]: levelApi.reducer,
    [chapterApi.reducerPath]: chapterApi.reducer,
    [performanceApi.reducerPath]: performanceApi.reducer,
    [metadataApi.reducerPath]: metadataApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      userApi.middleware,
      levelApi.middleware,
      chapterApi.middleware,
      performanceApi.middleware,
      metadataApi.middleware,
      adminApi.middleware
    ),
});
