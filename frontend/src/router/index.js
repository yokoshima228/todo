import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

import Login from '@/views/Login.vue';
import Register from '@/views/Register.vue';
import Todos from '@/views/Todos.vue';

const routes = [
  {
    path: '/',
    name: 'Todos',
    component: Todos,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { guestOnly: true }
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const guestOnly = to.matched.some(record => record.meta.guestOnly);
  const isAuthenticated = authStore.isAuthenticated;

  if (requiresAuth && !isAuthenticated) {
    // If route requires auth and user is not authenticated, redirect to login
    console.log('Guard: Needs auth, redirecting to login');
    next({ name: 'Login' });
  } else if (guestOnly && isAuthenticated) {
    // If route is for guests only (login/register) and user is authenticated, redirect to todos
    console.log('Guard: Guest only, redirecting to todos');
    next({ name: 'Todos' });
  } else {
    // Otherwise, allow navigation
    next();
  }
});

export default router; 