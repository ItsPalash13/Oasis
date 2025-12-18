import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Subject', 'Chapter', 'Topic', 'Section', 'Question', 'Level', 'User', 'Badge', 'Organization', 'Batch', 'Misc'],
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
    // Section endpoints
    getSections: builder.query({
      query: (chapterId) => chapterId ? ({ url: `/api/admin/sections?chapterId=${chapterId}`, method: 'GET' }) : ({ url: '/api/admin/sections', method: 'GET' }),
      providesTags: ['Section'],
    }),
    getSectionById: builder.query({
      query: (id) => ({ url: `/api/admin/sections/${id}`, method: 'GET' }),
      providesTags: ['Section'],
    }),
    getSectionTopics: builder.query({
      query: (id) => ({ url: `/api/admin/sections/${id}/topics`, method: 'GET' }),
      providesTags: ['Section'],
    }),
    createSection: builder.mutation({
      query: (body) => ({ url: '/api/admin/sections', method: 'POST', body }),
      invalidatesTags: ['Section'],
    }),
    updateSection: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/sections/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Section'],
    }),
    deleteSection: builder.mutation({
      query: (id) => ({ url: `/api/admin/sections/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Section'],
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
      query: (params) => ({ 
        url: `/api/admin/units`, 
        method: 'GET',
        params: typeof params === 'string' ? { chapterId: params } : (params || {})
      }),
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
      query: ({ id, body }) => {
        // If body is FormData, don't spread it
        return {
          url: `/api/admin/questions/${id}`,
          method: 'PUT',
          body,
          formData: body instanceof FormData
        };
      },
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
    bulkAssignSection: builder.mutation({
      query: (body) => ({ url: '/api/admin/questions/bulk-assign-section', method: 'PUT', body }),
      invalidatesTags: ['Question'],
    }),
    changeQuestionStatus: builder.mutation({
      query: ({ id, status }) => ({ 
        url: `/api/admin/questions/${id}/status`, 
        method: 'PATCH', 
        body: { status } 
      }),
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
    // User Chapter Section endpoints
    getUserChapterSections: builder.query({
      query: (params) => ({ 
        url: '/api/admin/users/chapter-sections', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['User'],
    }),
    getUserChapterSectionById: builder.query({
      query: (id) => ({ url: `/api/admin/users/chapter-sections/${id}`, method: 'GET' }),
      providesTags: ['User'],
    }),
    createUserChapterSection: builder.mutation({
      query: (body) => ({ url: '/api/admin/users/chapter-sections', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUserChapterSection: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/users/chapter-sections/${id}`, method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    deleteUserChapterSection: builder.mutation({
      query: (id) => ({ url: `/api/admin/users/chapter-sections/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
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
    // User Chapter Session endpoints (read-only)
    getUserChapterSessions: builder.query({
      query: (params) => ({ 
        url: '/api/admin/users/user-chapter-sessions', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['User'],
    }),
    getUserChapterSessionById: builder.query({
      query: (id) => ({ 
        url: `/api/admin/users/user-chapter-sessions/${id}`, 
        method: 'GET'
      }),
      providesTags: ['User'],
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
    // User Level Session History endpoints (read-only)
    getUserLevelSessionHistory: builder.query({
      query: (params) => ({ 
        url: '/api/admin/users/level-session-history', 
        method: 'GET',
        params: params || {}
      }),
      providesTags: ['User'],
    }),
    getUserLevelSessionHistoryById: builder.query({
      query: (id) => ({ url: `/api/admin/users/level-session-history/${id}`, method: 'GET' }),
      providesTags: ['User'],
    }),
    deleteUserLevelSessionHistory: builder.mutation({
      query: (id) => ({ url: `/api/admin/users/level-session-history/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
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
    // Organization endpoints
    getOrganizations: builder.query({
      query: () => ({ url: '/api/admin/organizations', method: 'GET' }),
      providesTags: ['Organization'],
    }),
    getOrganizationById: builder.query({
      query: (id) => ({ url: `/api/admin/organizations/${id}`, method: 'GET' }),
      providesTags: ['Organization'],
    }),
    createOrganization: builder.mutation({
      query: (body) => ({ url: '/api/admin/organizations', method: 'POST', body }),
      invalidatesTags: ['Organization'],
    }),
    updateOrganization: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/organizations/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Organization'],
    }),
    deleteOrganization: builder.mutation({
      query: (id) => ({ url: `/api/admin/organizations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Organization'],
    }),
    // Batch endpoints
    getBatchesByOrg: builder.query({
      query: (orgId) => ({ url: `/api/admin/organizations/${orgId}/batches`, method: 'GET' }),
      providesTags: ['Batch'],
    }),
    getBatchById: builder.query({
      query: (id) => ({ url: `/api/admin/organizations/batch/${id}`, method: 'GET' }),
      providesTags: ['Batch'],
    }),
    createBatch: builder.mutation({
      query: (body) => ({ url: '/api/admin/organizations/batch', method: 'POST', body }),
      invalidatesTags: ['Batch'],
    }),
    updateBatch: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/organizations/batch/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Batch'],
    }),
    deleteBatch: builder.mutation({
      query: (id) => ({ url: `/api/admin/organizations/batch/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Batch'],
    }),
    // User search for batch assignment
    searchUsersByEmail: builder.query({
      query: (email) => ({ 
        url: `/api/admin/users/search`, 
        method: 'GET',
        params: { email }
      }),
      providesTags: ['User'],
    }),
    // Search users by organization for batch assignment
    searchUsersByOrganization: builder.query({
      query: ({ orgId, q }) => ({ 
        url: `/api/admin/organizations/${orgId}/users/search`, 
        method: 'GET',
        params: { q }
      }),
      providesTags: ['User'],
    }),
    // Misc endpoints (Dummy Users)
    getAllMisc: builder.query({
      query: () => ({ url: '/api/admin/misc', method: 'GET' }),
      providesTags: ['Misc'],
    }),
    getMiscByChapter: builder.query({
      query: (chapterId) => ({ url: `/api/admin/misc/chapter/${chapterId}`, method: 'GET' }),
      providesTags: ['Misc'],
    }),
    createOrUpdateMiscChapter: builder.mutation({
      query: ({ chapterId, users }) => ({ 
        url: `/api/admin/misc/chapter/${chapterId}`, 
        method: 'POST', 
        body: { users } 
      }),
      invalidatesTags: ['Misc'],
    }),
    addMiscUser: builder.mutation({
      query: ({ chapterId, ...userData }) => ({ 
        url: `/api/admin/misc/chapter/${chapterId}/user`, 
        method: 'POST', 
        body: userData 
      }),
      invalidatesTags: ['Misc'],
    }),
    updateMiscUser: builder.mutation({
      query: ({ chapterId, userId, ...userData }) => ({ 
        url: `/api/admin/misc/chapter/${chapterId}/user/${userId}`, 
        method: 'PUT', 
        body: userData 
      }),
      invalidatesTags: ['Misc'],
    }),
    deleteMiscUser: builder.mutation({
      query: ({ chapterId, userId }) => ({ 
        url: `/api/admin/misc/chapter/${chapterId}/user/${userId}`, 
        method: 'DELETE' 
      }),
      invalidatesTags: ['Misc'],
    }),
    deleteMiscChapter: builder.mutation({
      query: (chapterId) => ({ 
        url: `/api/admin/misc/chapter/${chapterId}`, 
        method: 'DELETE' 
      }),
      invalidatesTags: ['Misc'],
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
  // Section hooks
  useGetSectionsQuery,
  useGetSectionByIdQuery,
  useGetSectionTopicsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
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
  useBulkAssignSectionMutation,
  useChangeQuestionStatusMutation,
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
  // User Chapter Section hooks
  useGetUserChapterSectionsQuery,
  useGetUserChapterSectionByIdQuery,
  useCreateUserChapterSectionMutation,
  useUpdateUserChapterSectionMutation,
  useDeleteUserChapterSectionMutation,
  // User Chapter Level hooks
  useGetUserChapterLevelsQuery,
  useGetUserChapterLevelByIdQuery,
  useCreateUserChapterLevelMutation,
  useUpdateUserChapterLevelMutation,
  useDeleteUserChapterLevelMutation,
  // User Chapter Session hooks (read-only)
  useGetUserChapterSessionsQuery,
  useGetUserChapterSessionByIdQuery,
  // User Level Session hooks (read-only)
  useGetUserLevelSessionsQuery,
  useGetUserLevelSessionByIdQuery,
  // User Level Session History hooks (read-only)
  useGetUserLevelSessionHistoryQuery,
  useGetUserLevelSessionHistoryByIdQuery,
  useDeleteUserLevelSessionHistoryMutation,
  // Badge hooks
  useGetBadgesQuery,
  useCreateBadgeMutation,
  useUpdateBadgeMutation,
  useDeleteBadgeMutation,
  // Organization hooks
  useGetOrganizationsQuery,
  useGetOrganizationByIdQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  // Batch hooks
  useGetBatchesByOrgQuery,
  useGetBatchByIdQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  // User search hook
  useSearchUsersByEmailQuery,
  // Organization user search hook
  useSearchUsersByOrganizationQuery,
  // Misc hooks
  useGetAllMiscQuery,
  useGetMiscByChapterQuery,
  useCreateOrUpdateMiscChapterMutation,
  useAddMiscUserMutation,
  useUpdateMiscUserMutation,
  useDeleteMiscUserMutation,
  useDeleteMiscChapterMutation,
} = adminApi;
