import axios from 'axios';

// Base backend URL from Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// API helper functions
export const createShortUrl = async ({ originalUrl, customAlias, expiresInDays }) => {
  const payload = { originalUrl: originalUrl.trim() };
  if (customAlias && customAlias.trim()) {
    payload.customAlias = customAlias.trim();
  }
  if (expiresInDays) {
    payload.expiresInDays = Number(expiresInDays);
  }
  const response = await apiClient.post('/api/urls', payload);
  return response.data;
};

export const fetchUrls = async () => {
  const response = await apiClient.get('/api/urls');
  return response.data;
};

export const deleteShortUrl = async (id) => {
  const response = await apiClient.delete(`/api/urls/${id}`);
  return response.data;
};

export const fetchAnalytics = async (id) => {
  const response = await apiClient.get(`/api/urls/${id}/analytics`);
  return response.data;
};

export default apiClient;
