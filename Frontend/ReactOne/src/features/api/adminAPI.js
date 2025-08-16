import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Subject', 'Chapter', 'Topic', 'Question', 'Level', 'User', 'Badge'],
  endpoints: (builder) => ({
    // Subject endpoints
    getSubjects: builder.query({
      query: () => ({ url: '/api/admin/subjects', method: 'GET' }),
      providesTags: ['Subject'],
    }),
    createSubject: builder.mutation({
      query: (body) => ({ url: '/api/admin/subjects', method: 'POST', body }),
      invalidatesTags: ['Subject'],
    }),
    updateSubject: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/subjects/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Subject'],
    }),
    deleteSubject: builder.mutation({
      query: (id) => ({ url: `/api/admin/subjects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Subject'],
    }),
    // Chapter endpoints
    getChapters: builder.query({
      query: () => ({ url: '/api/chapters', method: 'GET' }),
      providesTags: ['Chapter'],
    }),
    createChapter: builder.mutation({
      query: (body) => ({ url: '/api/admin/chapters', method: 'POST', body }),
      invalidatesTags: ['Chapter'],
    }),
    updateChapter: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/chapters/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Chapter'],
    }),
    getChapterById: builder.query({
      query: (id) => ({ url: `/api/admin/chapters/${id}`, method: 'GET' }),
      providesTags: ['Chapter'],
    }),
    // Topic endpoints
    getTopics: builder.query({
      query: (chapterId) => chapterId ? ({ url: `/api/admin/topics?chapterId=${chapterId}`, method: 'GET' }) : ({ url: '/api/admin/topics', method: 'GET' }),
      providesTags: ['Topic'],
    }),
    createTopic: builder.mutation({
      query: (body) => ({ url: '/api/admin/topics', method: 'POST', body }),
      invalidatesTags: ['Topic'],
    }),
    updateTopic: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/topics/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Topic'],
    }),
    deleteTopic: builder.mutation({
      query: (id) => ({ url: `/api/admin/topics/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Topic'],
    }),
    // Unit endpoints
    createUnit: builder.mutation({
      query: (body) => ({ url: '/api/admin/units', method: 'POST', body }),
      invalidatesTags: ['Chapter'],
    }),
    updateUnit: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/units/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Chapter'],
    }),
    deleteUnit: builder.mutation({
      query: (id) => ({ url: `/api/admin/units/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Chapter'],
    }),
    getUnits: builder.query({
      query: (chapterId) => ({ url: `/api/admin/units?chapterId=${chapterId}`, method: 'GET' }),
      providesTags: ['Chapter'],
    }),
    getAllUnits: builder.query({
      query: () => ({ url: '/api/admin/units', method: 'GET' }),
      providesTags: ['Chapter'],
    }),
    getLevelsByUnit: builder.query({
      query: (unitId) => ({ url: `/api/admin/units/${unitId}/levels`, method: 'GET' }),
      providesTags: ['Level'],
    }),
    // Question endpoints
    getQuestions: builder.query({
      query: ({ chapterId, unitId }) => ({ 
        url: '/api/admin/questions', 
        method: 'GET',
        params: { 
          ...(chapterId && { chapterId }),
          ...(unitId && { unitId })
        }
      }),
      providesTags: ['Question'],
    }),
    getQuestionById: builder.query({
      query: (id) => ({ url: `/api/admin/questions/${id}`, method: 'GET' }),
      providesTags: ['Question'],
    }),
    createQuestion: builder.mutation({
      query: (body) => ({ url: '/api/admin/questions', method: 'POST', body }),
      invalidatesTags: ['Question'],
    }),
    multiAddQuestions: builder.mutation({
      query: (body) => ({ url: '/api/admin/questions/multi-add', method: 'POST', body }),
      invalidatesTags: ['Question'],
    }),
    updateQuestion: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/questions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Question'],
    }),
    deleteQuestion: builder.mutation({
      query: (id) => ({ url: `/api/admin/questions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Question'],
    }),
    uploadQuestionImage: builder.mutation({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/api/admin/questions/${id}/image`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Question'],
    }),
    getQuestionsMuByTopics: builder.mutation({
      query: (topics) => ({
        url: '/api/admin/questions/mu-by-topics',
        method: 'POST',
        body: { topics },
      }),
    }),
    // Level endpoints
    getLevels: builder.query({
      query: (params) => ({ 
        url: '/api/admin/levels', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['Level'],
    }),
    getLevelsByChapter: builder.query({
      query: (chapterId) => ({ url: `/api/admin/levels/by-chapter/${chapterId}`, method: 'GET' }),
      providesTags: ['Level'],
    }),
    getLevelById: builder.query({
      query: (id) => ({ url: `/api/admin/levels/${id}`, method: 'GET' }),
      providesTags: ['Level'],
    }),
    createLevel: builder.mutation({
      query: (body) => ({ url: '/api/admin/levels', method: 'POST', body }),
      invalidatesTags: ['Level'],
    }),
    updateLevel: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/levels/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Level'],
    }),
    deleteLevel: builder.mutation({
      query: (id) => ({ url: `/api/admin/levels/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Level'],
    }),
    // User Profile endpoints
    getUserProfiles: builder.query({
      query: (params) => ({ 
        url: '/api/admin/users/profiles', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['User'],
    }),
    getUserProfileById: builder.query({
      query: (id) => ({ url: `/api/admin/users/profiles/${id}`, method: 'GET' }),
      providesTags: ['User'],
    }),
    createUserProfile: builder.mutation({
      query: (body) => ({ url: '/api/admin/users/profiles', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUserProfile: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/users/profiles/${id}`, method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    deleteUserProfile: builder.mutation({
      query: (id) => ({ url: `/api/admin/users/profiles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    // User Chapter Unit endpoints
    getUserChapterUnits: builder.query({
      query: (params) => ({ 
        url: '/api/admin/users/chapter-units', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['User'],
    }),
    getUserChapterUnitById: builder.query({
      query: (id) => ({ url: `/api/admin/users/chapter-units/${id}`, method: 'GET' }),
      providesTags: ['User'],
    }),
    createUserChapterUnit: builder.mutation({
      query: (body) => ({ url: '/api/admin/users/chapter-units', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUserChapterUnit: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/users/chapter-units/${id}`, method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    deleteUserChapterUnit: builder.mutation({
      query: (id) => ({ url: `/api/admin/users/chapter-units/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    // User Chapter Level endpoints
    getUserChapterLevels: builder.query({
      query: (params) => ({ 
        url: '/api/admin/users/chapter-levels', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['User'],
    }),
    getUserChapterLevelById: builder.query({
      query: (id) => ({ url: `/api/admin/users/chapter-levels/${id}`, method: 'GET' }),
      providesTags: ['User'],
    }),
    createUserChapterLevel: builder.mutation({
      query: (body) => ({ url: '/api/admin/users/chapter-levels', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUserChapterLevel: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/users/chapter-levels/${id}`, method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    deleteUserChapterLevel: builder.mutation({
      query: (id) => ({ url: `/api/admin/users/chapter-levels/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    // User Level Session endpoints (read-only)
    getUserLevelSessions: builder.query({
      query: (params) => ({ 
        url: '/api/admin/users/level-sessions', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['User'],
    }),
    getUserLevelSessionById: builder.query({
      query: (id) => ({ url: `/api/admin/users/level-sessions/${id}`, method: 'GET' }),
      providesTags: ['User'],
    }),
    // Badge endpoints
    getBadges: builder.query({
      query: () => ({ url: '/api/admin/badges', method: 'GET' }),
      providesTags: ['Badge'],
    }),
    createBadge: builder.mutation({
      query: (body) => ({ url: '/api/admin/badges', method: 'POST', body }),
      invalidatesTags: ['Badge'],
    }),
    updateBadge: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/badges/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Badge'],
    }),
    deleteBadge: builder.mutation({
      query: (id) => ({ url: `/api/admin/badges/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Badge'],
    }),
  }),
});

export const {
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetChaptersQuery,
  useCreateChapterMutation,
  useUpdateChapterMutation,
  useGetChapterByIdQuery,
  useGetTopicsQuery,
  useCreateTopicMutation,
  useUpdateTopicMutation,
  useDeleteTopicMutation,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useGetUnitsQuery,
  useGetAllUnitsQuery,
  useGetLevelsByUnitQuery,
  useGetQuestionsQuery,
  useGetQuestionByIdQuery,
  useCreateQuestionMutation,
  useMultiAddQuestionsMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useUploadQuestionImageMutation,
  useGetQuestionsMuByTopicsMutation,
  useGetLevelsQuery,
  useGetLevelsByChapterQuery,
  useGetLevelByIdQuery,
  useCreateLevelMutation,
  useUpdateLevelMutation,
  useDeleteLevelMutation,
  // User Profile hooks
  useGetUserProfilesQuery,
  useGetUserProfileByIdQuery,
  useCreateUserProfileMutation,
  useUpdateUserProfileMutation,
  useDeleteUserProfileMutation,
  // User Chapter Unit hooks
  useGetUserChapterUnitsQuery,
  useGetUserChapterUnitByIdQuery,
  useCreateUserChapterUnitMutation,
  useUpdateUserChapterUnitMutation,
  useDeleteUserChapterUnitMutation,
  // User Chapter Level hooks
  useGetUserChapterLevelsQuery,
  useGetUserChapterLevelByIdQuery,
  useCreateUserChapterLevelMutation,
  useUpdateUserChapterLevelMutation,
  useDeleteUserChapterLevelMutation,
  // User Level Session hooks (read-only)
  useGetUserLevelSessionsQuery,
  useGetUserLevelSessionByIdQuery,
  // Badge hooks
  useGetBadgesQuery,
  useCreateBadgeMutation,
  useUpdateBadgeMutation,
  useDeleteBadgeMutation,
} = adminApi;
