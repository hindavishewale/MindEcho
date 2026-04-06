import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const uploadVideo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload_video', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const analyzeVideo = async (sessionId) => {
  const response = await api.post(`/analyze_video/${sessionId}`);
  return response.data;
};

export const getEmotionTimeline = async (sessionId) => {
  const response = await api.get(`/emotion_timeline/${sessionId}`);
  return response.data;
};

export const searchByEmotion = async (emotion, sessionId = null) => {
  const response = await api.post('/emotion_search', { emotion, session_id: sessionId });
  return response.data;
};

export const startLiveInterview = async () => {
  const response = await api.post('/start_live_interview');
  return response.data;
};

export default api;
