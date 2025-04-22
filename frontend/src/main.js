import './assets/main.css'

import { createApp } from 'vue'
import App from './components/App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { useAuthStore } from './stores/authStore'

// Import vue-toastification
import Toast, { POSITION } from "vue-toastification";
// Import the CSS or use your own!
import "vue-toastification/dist/index.css";

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)

const authStore = useAuthStore()
authStore.loadToken()

app.use(router)

// Setup vue-toastification
const toastOptions = {
  position: POSITION.TOP_RIGHT, // Position of toasts
  timeout: 3000, // Default timeout in ms
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: true,
  closeButton: "button",
  icon: true,
  rtl: false
};
app.use(Toast, toastOptions);

app.mount('#app')
