import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Create a new Axios instance
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Your API base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    const token = authStore.token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor for handling global errors like 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
      const authStore = useAuthStore();
      console.error('Unauthorized access - logging out');
      authStore.logout(); // Use the logout action
    }
    return Promise.reject(error);
  }
);

export default apiClient; 