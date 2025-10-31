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
      query: () => ({
        url: '/level_v2/start',
        method: 'POST'
      })
    })
  }),
});

export const { 
  useGetAllChaptersQuery,
  useGetChaptersBySubjectQuery,
  useGetChapterByIdQuery,
  useStartGameMutation
} = chapterApi; 