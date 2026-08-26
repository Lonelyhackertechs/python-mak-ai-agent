import axios from 'axios';

const api = axios.create({
  baseURL: 'https://mak-ai-agent.onrender.com', // My Java backend
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if(token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const pythonApi = axios.create({
  baseURL: 'http://localhost:8000', // your Python agent.py
});

pythonApi.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if(token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;