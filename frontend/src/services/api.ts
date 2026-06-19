import axios from 'axios';
import type { TripRequest, TripResponse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export const tripsApi = {
  calculate: async (request: TripRequest): Promise<TripResponse> => {
    const { data } = await api.post<TripResponse>('/trips/calculate', request);
    return data;
  },
  downloadPDF: (tripId: string): string => {
    return `${api.defaults.baseURL}/trips/${tripId}/pdf`;
  },
};

export default api;
