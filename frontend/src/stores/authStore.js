import { defineStore } from 'pinia';
import apiClient from '@/api'; // Use the configured api client
import router from '@/router'; // Import router for redirects
import { useToast } from 'vue-toastification'; // Import useToast

const toast = useToast(); // Initialize toast

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null, // Load token from localStorage
    user: null, // User info can be stored here if needed
    error: null, // To store login/register errors
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    },
    async login(credentials) {
      this.error = null;
      try {
        const response = await apiClient.post('/users/login', credentials);
        const token = response.data.token;
        if (!token) {
            throw new Error('Token not provided in response');
        }
        this.setToken(token);
        toast.success("Login successful!");
        await router.push('/');
      } catch (err) {
        const errorMessage = err.response.data.error;
        this.error = errorMessage;
        this.setToken(null);
        toast.error(errorMessage);
        console.error('Login error:', err);
        throw err;
      }
    },
    async register(userInfo) {
      this.error = null;
      try {
        const response = await apiClient.post('/users/register', userInfo);
        toast.success("Registration successful! Please log in."); // Success toast
        await router.push('/login');
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
        this.error = errorMessage;
        toast.error(errorMessage); // Error toast
        console.error('Registration error:', err);
        throw err; // Re-throw
      }
    },
    logout() {
      this.setToken(null);
      this.user = null;
      toast.info("Logged out successfully."); // Info toast
      // Use replace to prevent going back to the logged-in state
      router.replace('/login');
    },
    // Action to load token from storage initially (called in main.js)
    loadToken() {
      const token = localStorage.getItem('token');
      if (token) {
          this.token = token;
          // Axios interceptor handles headers
          // Optionally verify token or fetch user data here
          // e.g., this.fetchUser();
      }
    },
    // Example action to fetch user data if needed after login/load
    // async fetchUser() {
    //   if (!this.token) return;
    //   try {
    //     const response = await apiClient.get('/users/me'); // Example endpoint
    //     this.user = response.data;
    //   } catch (error) {
    //     console.error('Failed to fetch user data:', error);
    //     // Might indicate invalid token
    //     this.logout();
    //   }
    // }
  },
}); 