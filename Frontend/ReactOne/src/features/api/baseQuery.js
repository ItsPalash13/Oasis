import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { authClient } from '../../lib/auth-client';

// Debug Vite environment variables
console.log("Envs",import.meta.env);
console.log('Vite Environment Variables:', {
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  SSR: import.meta.env.SSR
});

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_BACKEND_URL,
  credentials: 'include', // Ensures cookies are sent with requests
  prepareHeaders: async (headers, { getState }) => {
    // Don't set Content-Type for FormData requests - browser will set it with boundary
    if (getState()?.currentRequest?.formData) {
      return headers;
    }
    // try {
    //   const session = await authClient.getSession();
    //   const token = session?.data?.session?.token;
    //   if (token) {
    //     headers.set('Authorization', `Bearer ${token}`);
    //   }
    // } catch (error) {
    //   console.error('Error getting session:', error);
    // }

    // return headers;
  },
});

export const baseQueryWithAuth = async (args, api, extraOptions) => {
  console.log([args, api, extraOptions]);
  return rawBaseQuery(args, api, extraOptions);
};
