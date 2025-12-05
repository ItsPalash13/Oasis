import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: import.meta.env.VITE_BACKEND_URL+'/api',
    credentials: 'include'
  }),
  tagTypes: ['UserProfile'],
  endpoints: (builder) => ({
    getUserInfo: builder.query({
      query: (userId) => {
        if (!userId) {
          throw new Error('User ID is required');
        }
        return {
          url: `/user/info/${userId}`,
          method: 'GET'
        };
      },
      providesTags: ['UserProfile']
    }),
    updateUserInfo: builder.mutation({
      query: ({ userId, data }) => {
        if (!userId) {
          throw new Error('User ID is required');
        }
        return {
          url: `/user/info/${userId}`,
          method: 'PATCH',
          body: data
        };
      },
      invalidatesTags: ['UserProfile']
    }),
    getUserSettings: builder.query({
      query: (userId) => {
        if (!userId) {
          throw new Error('User ID is required');
        }
        return {
          url: `/user/settings/${userId}`,
          method: 'GET'
        };
      },
      providesTags: ['UserProfile']
    }),
    updateUserSettings: builder.mutation({
      query: ({ userId, data }) => {
        if (!userId) {
          throw new Error('User ID is required');
        }
        return {
          url: `/user/settings/${userId}`,
          method: 'PATCH',
          body: data
        };
      },
      invalidatesTags: ['UserProfile']
    }),
    getMonthlyLeaderboard: builder.query({
      query: (month) => ({
        url: `/user/monthly-leaderboard`,
        method: 'GET',
        params: month ? { month } : {}
      }),
      providesTags: ['UserProfile']
    }),
    getChapterSessions: builder.query({
      query: () => ({
        url: `/user/chapter-sessions`,
        method: 'GET'
      }),
      providesTags: ['UserProfile']
    })
  })
});
export const {
  useGetUserInfoQuery,
  useUpdateUserInfoMutation,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useGetMonthlyLeaderboardQuery,
  useGetChapterSessionsQuery
} = userApi;

