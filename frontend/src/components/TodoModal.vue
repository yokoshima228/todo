<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h2>{{ isNew ? 'Add New Task' : 'Edit Task' }}</h2>
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="title">Title:</label>
          <input type="text" id="title" v-model="editableTodo.title" required :disabled="isSaving">
        </div>

        <div class="form-group">
          <label for="notes">Notes:</label>
          <textarea id="notes" v-model="editableTodo.notes" :disabled="isSaving"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group form-group-half">
            <label for="dueDate">Due Date:</label>
            <input type="date" id="dueDate" v-model="editableTodo.dueDate" :disabled="isSaving">
          </div>
          <div class="form-group form-group-half">
            <label for="priority">Priority:</label>
            <select id="priority" v-model="editableTodo.priority" :disabled="isSaving">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="tags">Tags (comma-separated):</label>
          <input type="text" id="tags" v-model="editableTodo.tags" :disabled="isSaving">
        </div>

        <!-- Display non-editable fields -->
        <div v-if="!isNew" class="metadata">
            <p>Created: {{ formatDate(originalTodo?.createdAt) }}</p>
            <p>Updated: {{ formatDate(originalTodo?.updatedAt) }}</p>
            <!-- <p>Owner: {{ originalTodo?.owner }}</p> -->
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn-save" :disabled="isSaving">
            <Spinner v-if="isSaving" />
            <span v-else>{{ isNew ? 'Add Task' : 'Save Changes' }}</span>
          </button>
          <button type="button" @click="close" class="btn-cancel" :disabled="isSaving">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue';
import Spinner from '@/components/Spinner.vue';

const props = defineProps({
  visible: Boolean,
  todo: Object, // The todo being edited, or null for a new todo
});

const emit = defineEmits(['update:visible', 'save']);

const isNew = computed(() => !props.todo?._id);

// Store the original todo to display metadata without making it editable
const originalTodo = ref(null);

// Use a local ref for editing to avoid directly mutating the prop
const editableTodo = ref({});
const isSaving = ref(false);

// Function to initialize the editableTodo ref
const initializeEditableTodo = () => {
  if (props.visible) {
    if (props.todo && props.todo._id) {
        originalTodo.value = { ...props.todo }; // Keep original for metadata
        // Format date for input type=date (needs YYYY-MM-DD)
        const dueDate = props.todo.dueDate ? new Date(props.todo.dueDate).toISOString().split('T')[0] : null;
        // Convert tags array to string for input
        const tagsString = Array.isArray(props.todo.tags) ? props.todo.tags.join(', ') : '';

        editableTodo.value = {
            _id: props.todo._id,
            title: props.todo.title || '',
            notes: props.todo.notes || '',
            dueDate: dueDate,
            priority: props.todo.priority || 'medium', // Default priority
            tags: tagsString, // Store tags as comma-separated string
            completed: props.todo.completed || false, // Keep completed status
            // Include other fields if they need to be sent back
            owner: props.todo.owner, // Keep owner if needed by backend on update
        };
    } else {
        // Default values for a new task
        originalTodo.value = null;
        editableTodo.value = {
            title: '',
            notes: '',
            dueDate: null,
            priority: 'medium', // Default priority
            tags: '', // Store tags as comma-separated string
            completed: false,
        };
        // Focus the title field when adding a new task
        nextTick(() => {
          const titleInput = document.getElementById('title');
          if (titleInput) titleInput.focus();
        });
    }
  } else {
      originalTodo.value = null;
      editableTodo.value = {}; // Clear when modal is hidden
  }
};

// Watch for changes in visibility or the passed todo object
watch(() => [props.visible, props.todo], initializeEditableTodo, { immediate: true });

const close = () => {
  if (isSaving.value) return;
  emit('update:visible', false);
};

const save = async () => {
  if (isSaving.value) return;

  isSaving.value = true;
  try {
    const tagsArray = editableTodo.value.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    const todoDataToSave = {
        ...editableTodo.value,
        tags: tagsArray,
        dueDate: editableTodo.value.dueDate || null,
    };
    await emit('save', todoDataToSave);
    close();
  } catch (error) {
      console.error("Error during save emission or handling in parent:", error);
  } finally {
    isSaving.value = false;
  }
};

// Helper to format dates for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString; // Fallback
  }
};

</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-bg-soft);
  padding: 2rem 2.5rem;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  z-index: 1001;
}

h2 {
  text-align: center;
  color: var(--color-primary);
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
    display: flex;
    gap: 1rem; /* Space between columns */
    margin-bottom: 1rem;
}

.form-group-half {
    flex: 1; /* Each takes half the space */
    margin-bottom: 0; /* Remove bottom margin as it's handled by form-row */
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-soft);
  font-size: 0.9rem;
  font-weight: 500;
}

input[type="text"],
input[type="date"],
textarea,
select {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-input-bg);
  color: var(--color-text);
  border-radius: 4px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s ease;
  box-sizing: border-box; /* Ensure padding doesn't increase size */
}

textarea {
    min-height: 80px;
    resize: vertical;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--color-primary);
}

.metadata {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    font-size: 0.8rem;
    color: var(--color-text-soft);
    opacity: 0.8;
}

.metadata p {
    margin: 0.3rem 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 2.6em;
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn-save {
  background-color: var(--color-primary);
  color: white;
}
.btn-save:hover {
  background-color: var(--color-primary-soft);
  box-shadow: 0 2px 8px rgba(142, 68, 173, 0.4);
}

.btn-cancel {
  background-color: var(--color-bg-mute);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.btn-cancel:hover {
  background-color: var(--color-border);
}
</style> 