<template>
  <div class="spinner"></div>
</template>

<style scoped>
.spinner {
  border: 3px solid rgba(255, 255, 255, 0.3); /* Light border */
  border-top: 3px solid white; /* White top border to create spin effect */
  border-radius: 50%;
  width: 1.2em; /* Size relative to font size */
  height: 1.2em;
  animation: spin 1s linear infinite;
  display: inline-block; /* To fit inside button */
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 