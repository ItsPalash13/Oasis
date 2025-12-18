import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const chapterApi = createApi({
  reducerPath: 'chapterApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: import.meta.env.VITE_BACKEND_URL+'/api',
    credentials: 'include'
  }),
  tagTypes: ['Chapter'],
  endpoints: (builder) => ({
    getAllChapters: builder.query({
      query: () => '/chapters',
      providesTags: ['Chapter']
    }),
    getChaptersBySubject: builder.query({
      query: (subjectSlug) => {
        if (!subjectSlug) {
          throw new Error('Subject slug is required');
        }
        return `/chapters/subject/${subjectSlug}`;
      },
      providesTags: ['Chapter']
    }),
    getChapterById: builder.query({
      query: (chapterId) => {
        if (!chapterId) {
          throw new Error('Chapter ID is required');
        }
        return `/chapters/${chapterId}`;
      },
      providesTags: ['Chapter']
    }),
    startGame: builder.mutation({
      query: (chapterId) => ({
        url: '/level_v2/start',
        method: 'POST',
        body: { chapterId }
      })
    }),
    startGameV3: builder.mutation({
      query: (chapterId) => ({
        url: '/level_v3/start',
        method: 'POST',
        body: { chapterId }
      })
    }),
    getUserChapterSession: builder.query({
      query: (chapterId) => {
        if (!chapterId) {
          throw new Error('Chapter ID is required');
        }
        return `/user/chapter-session/${chapterId}`;
      },
      providesTags: ['Chapter']
    }),
    getChapterLeaderboard: builder.query({
      query: (chapterId) => {
        if (!chapterId) {
          throw new Error('Chapter ID is required');
        }
        return `/user/chapter-session/${chapterId}/leaderboard`;
      },
      providesTags: ['Chapter']
    }),
    // Get dummy users for a chapter (public endpoint)
    getDummyUsers: builder.query({
      query: (chapterId) => {
        if (!chapterId) {
          throw new Error('Chapter ID is required');
        }
        return `/misc/chapter/${chapterId}`;
      },
      providesTags: ['Chapter']
    })
  }),
});

export const { 
  useGetAllChaptersQuery,
  useGetChaptersBySubjectQuery,
  useGetChapterByIdQuery,
  useStartGameMutation,
  useStartGameV3Mutation,
  useGetUserChapterSessionQuery,
  useGetChapterLeaderboardQuery,
  useGetDummyUsersQuery
} = chapterApi; 