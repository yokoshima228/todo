<template>
  <div class="auth-container">
    <div class="auth-form">
      <h1>Login</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" v-model="email" required :disabled="loading">
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" v-model="password" required :disabled="loading">
        </div>
        <div v-if="authStore.error" class="error-message">
          {{ authStore.error }}
        </div>
        <button type="submit" :disabled="loading">
          <Spinner v-if="loading" />
          <span v-else>Login</span>
        </button>
      </form>
      <p class="switch-form">
        Don't have an account? <router-link to="/register">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import Spinner from '@/components/Spinner.vue';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) return;
  loading.value = true;
  authStore.error = null;
  try {
    await authStore.login({ email: email.value, password: password.value });
    // Redirect handled by store
  } catch (err) {
    // Error handled by store/toast
    console.error("Login failed in component catch");
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh; /* Adjust as needed */
}

.auth-form {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background-color: var(--color-bg-soft);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

h1 {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-soft);
}

input[type="email"],
input[type="password"] {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-input-bg);
  color: white;
  border-radius: 4px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s ease;
}

input[type="email"]:focus,
input[type="password"]:focus {
  border-color: var(--color-primary);
}

button {
  width: 100%;
  padding: 0.8rem 1rem;
  border: none;
  background-color: var(--color-primary);
  color: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.3s ease;
  margin-top: 1rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 2.8em;
}

button:hover:not(:disabled) {
  background-color: var(--color-primary-soft);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: var(--color-accent);
  background-color: rgba(231, 76, 60, 0.1);
  border: 1px solid var(--color-accent);
  padding: 0.8rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
}

.switch-form {
  text-align: center;
  margin-top: 1.5rem;
  color: var(--color-text-soft);
}

.switch-form a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.switch-form a:hover {
  text-decoration: underline;
}
</style> 