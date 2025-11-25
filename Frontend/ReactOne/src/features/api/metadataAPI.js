import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const metadataApi = createApi({
  reducerPath: 'metadataApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: import.meta.env.VITE_BACKEND_URL+'/api',
    credentials: 'include'
  }),
  tagTypes: ['Metadata'],
  endpoints: (builder) => ({
    getAllMetadata: builder.query({
      query: () => '/metadata',
      providesTags: ['Metadata']
    }),
    getMetadataByType: builder.query({
      query: (metadataType) => {
        if (!metadataType) {
          throw new Error('Metadata type is required');
        }
        return `/metadata/${metadataType}`;
      },
      providesTags: ['Metadata']
    })
  }),
});

export const { 
  useGetAllMetadataQuery,
  useGetMetadataByTypeQuery
} = metadataApi;

