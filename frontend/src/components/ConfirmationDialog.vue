<template>
  <div v-if="visible" class="modal-overlay" @click.self="cancel">
    <div class="confirm-dialog">
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button @click="confirm" class="btn-confirm">Confirm</button>
        <button @click="cancel" class="btn-cancel">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
  message: { // Message to display in the dialog
    type: String,
    default: 'Are you sure?'
  }
});

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const confirm = () => {
  emit('confirm');
  emit('update:visible', false);
};

const cancel = () => {
  emit('cancel');
  emit('update:visible', false);
};
</script>

<style scoped>
.modal-overlay {
  /* Same styles as TodoModal overlay */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* Higher than TodoModal if they can overlap */
}

.confirm-dialog {
  background-color: var(--color-bg-soft);
  padding: 1.5rem 2rem;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 350px;
  z-index: 2001;
  text-align: center;
}

.confirm-message {
  color: var(--color-text);
  font-size: 1.1rem;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

button {
  /* Base button styles */
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.btn-confirm {
  background-color: var(--color-accent); /* Red for confirmation */
  color: white;
  border: 1px solid var(--color-accent);
}
.btn-confirm:hover {
  background-color: #c0392b; /* Darker red */
  border-color: #c0392b;
}

.btn-cancel {
  background-color: var(--color-bg-mute);
  color: var(--color-text-soft);
  border: 1px solid var(--color-border);
}
.btn-cancel:hover {
  background-color: var(--color-border);
  color: var(--color-text);
}
</style> 