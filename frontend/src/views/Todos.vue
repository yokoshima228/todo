<script setup>
import { ref, onMounted, computed } from 'vue';
import { useTodoStore } from '@/stores/todoStore';
import { useAuthStore } from '@/stores/authStore';
import { storeToRefs } from 'pinia';
import draggable from 'vuedraggable';
import TodoModal from '@/components/TodoModal.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';

const todoStore = useTodoStore();
const authStore = useAuthStore();
const { todos: todosRef } = storeToRefs(todoStore);

// Modal state
const isModalVisible = ref(false);
const selectedTodo = ref(null);

// Confirmation Dialog State
const isConfirmDialogVisible = ref(false);
const confirmDialogMessage = ref('Are you sure?');
const itemToDeleteId = ref(null);
const deleteActionType = ref('');

// Filter state
const currentFilter = ref('all');
// Search state
const searchQuery = ref('');

// Computed property for filtered todos IDs (more efficient for v-if check)
const filteredTodoIds = computed(() => {
  // First filter by completion status
  let filteredTodos = todoStore.todos;
  
  if (currentFilter.value === 'active') {
    filteredTodos = filteredTodos.filter(todo => !todo.completed);
  } else if (currentFilter.value === 'completed') {
    filteredTodos = filteredTodos.filter(todo => todo.completed);
  }
  
  // Then filter by search query if present
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase();
    filteredTodos = filteredTodos.filter(todo => 
      // Search in title
      todo.title.toLowerCase().includes(query) || 
      // Search in notes
      (todo.notes && todo.notes.toLowerCase().includes(query)) ||
      // Search in tags
      (todo.tags && todo.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }
  
  return new Set(filteredTodos.map(t => t._id));
});

// Computed property to check if there are any completed todos
const hasCompletedTodos = computed(() => todoStore.todos.some(todo => todo.completed));

onMounted(() => {
  if (authStore.isAuthenticated) {
    todoStore.fetchTodos();
  }
});

// --- Drag and Drop Handling ---
const handleDragEnd = (event) => {
    console.log('Drag ended:', event);
    // Pass the original array indices to the store action
    todoStore.reorderTodos(event.oldIndex, event.newIndex);
    // TODO: Add call to backend API to persist the new order
    // Example: todoStore.saveOrder();
};

// --- Modal Handling ---
const openModalToAdd = () => {
  selectedTodo.value = null;
  isModalVisible.value = true;
};

const openModalToEdit = (todo) => {
  selectedTodo.value = { ...todo };
  isModalVisible.value = true;
};

const handleSaveFromModal = async (todoData) => {
  if (todoData._id) {
    await todoStore.updateTodo(todoData._id, todoData);
  } else {
    await todoStore.addTodo(todoData);
  }
};

// --- Confirmation Handling ---
const confirmDeleteSingle = (todo) => {
  itemToDeleteId.value = todo._id;
  deleteActionType.value = 'single';
  confirmDialogMessage.value = `Are you sure you want to delete task "${todo.title}"?`;
  isConfirmDialogVisible.value = true;
};

const confirmDeleteCompleted = () => {
  itemToDeleteId.value = null;
  deleteActionType.value = 'completed';
  confirmDialogMessage.value = 'Are you sure you want to delete all completed tasks?';
  isConfirmDialogVisible.value = true;
};

const executeDelete = async () => {
  if (deleteActionType.value === 'single' && itemToDeleteId.value) {
    await todoStore.deleteTodo(itemToDeleteId.value);
  } else if (deleteActionType.value === 'completed') {
    await todoStore.deleteCompletedTodos();
  }
  itemToDeleteId.value = null;
  deleteActionType.value = '';
};

const cancelDelete = () => {
  itemToDeleteId.value = null;
  deleteActionType.value = '';
  console.log('Deletion cancelled.');
};

// --- Todo Actions ---
const toggleComplete = async (todo) => {
  await todoStore.updateTodo(todo._id, { ...todo, completed: !todo.completed });
};

// --- Other Actions ---
const setFilter = (filter) => {
  currentFilter.value = filter;
};

// Clear search query
const clearSearch = () => {
  searchQuery.value = '';
};

const handleLogout = () => {
  authStore.logout();
};

// --- Helper Functions ---
const formatDateShort = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
        return '';
    }
};

const priorityClass = (priority) => {
    return `priority-${priority || 'medium'}`;
}

</script>

<template>
  <div class="container">
    <h1>Todo List</h1>

    <div class="add-task-container">
      <button @click="openModalToAdd" class="btn-add-new">+ Add New Task</button>
    </div>
    
    <!-- Search input -->
    <div class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search tasks..." 
        class="search-input"
      />
      <button 
        v-if="searchQuery" 
        @click="clearSearch" 
        class="btn-clear-search"
        title="Clear search"
      >×</button>
    </div>

    <div class="actions-container">
      <div class="filter-buttons">
        <button @click="setFilter('all')" :class="{ active: currentFilter === 'all' }">All</button>
        <button @click="setFilter('active')" :class="{ active: currentFilter === 'active' }">Active</button>
        <button @click="setFilter('completed')" :class="{ active: currentFilter === 'completed' }">Completed</button>
      </div>
      <button
        @click="confirmDeleteCompleted"
        v-show="hasCompletedTodos"
        class="btn-delete-done"
      >
        Delete Done
      </button>
    </div>

    <draggable
      tag="ul"
      :list="todoStore.todos"
      v-model="todoStore.todos"
      item-key="_id"
      handle=".todo-content"
      ghost-class="ghost-item"
      drag-class="drag-item"
      :animation="200"
      @end="handleDragEnd"
      class="todo-list-draggable"
    >
      <template #item="{element: todo}">
        <li v-if="filteredTodoIds.has(todo._id)"
            :key="todo._id"
            :class="[ 'todo-item', { 'completed': todo.completed }, priorityClass(todo.priority) ]"
        >
          <div class="todo-content" title="Drag to reorder">
            <input
              type="checkbox"
              :checked="todo.completed"
              @change="toggleComplete(todo)"
              class="todo-checkbox"
            />
            <span class="todo-title" :class="{ 'completed-text': todo.completed }">{{ todo.title }}</span>
            <span v-if="todo.dueDate" class="todo-due-date">{{ formatDateShort(todo.dueDate) }}</span>
            <span v-if="todo.tags && todo.tags.length > 0" class="todo-tags">
                <span v-for="tag in todo.tags" :key="tag" class="tag">{{ tag }}</span>
            </span>
          </div>
          <div class="todo-actions">
            <button @click="openModalToEdit(todo)" class="btn-edit">Edit</button>
            <button @click="confirmDeleteSingle(todo)" class="btn-delete">Delete</button>
          </div>
        </li>
      </template>
    </draggable>

    <div v-if="todoStore.todos.length === 0" class="no-todos-message-container">
        <p class="no-todos-message">
          Your todo list is empty! Add a task to get started.
        </p>
    </div>
    <div v-else-if="filteredTodoIds.size === 0" class="no-todos-message-container">
        <p class="no-todos-message">
          No tasks found for the current search and filter criteria.
        </p>
    </div>

    <div class="logout-container">
       <button @click="handleLogout" class="btn-logout">Logout</button>
    </div>

    <TodoModal
      v-model:visible="isModalVisible"
      :todo="selectedTodo"
      @save="handleSaveFromModal"
    />
    <ConfirmationDialog
      v-model:visible="isConfirmDialogVisible"
      :message="confirmDialogMessage"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.container {
  max-width: 700px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: var(--color-bg-soft);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  color: white;
  position: relative;
}

h1 {
  margin-bottom: 0.5rem;
  color: var(--color-primary);
}

.add-task-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.btn-add-new {
    width: auto;
    padding: 0.9rem 2rem;
    background-image: linear-gradient(45deg, var(--color-primary-soft) 0%, var(--color-primary) 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.3s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    margin: 0;
}

.btn-add-new:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(142, 68, 173, 0.4);
}

.actions-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.filter-buttons {
    display: flex;
    gap: 0.5rem;
    margin-right: 1rem;
    margin-left: 1rem;
}

.filter-buttons button {
  width: 7rem;
  text-align: center;
  background-color: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-soft);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.filter-buttons button:hover {
  border-color: var(--color-primary-soft);
  color: var(--color-primary-soft);
}

.filter-buttons button.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-delete-done {
  padding: 0.6rem 1.2rem;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.3s ease, opacity 0.3s ease;
  margin-left: auto;
}

.btn-delete-done:hover:not(:disabled) {
  background-color: #c0392b;
}

.btn-delete-done:disabled {
  opacity: 0;
  pointer-events: none;
}

.no-todos-message-container {
    margin-top: 1rem;
    padding: 1rem;
    text-align: center;
}
.no-todos-message {
  color: var(--color-text-soft);
  font-size: 1rem;
}

.todo-item {
  background-color: var(--color-bg-mute);
  padding: 0.8rem 1rem;
  margin-bottom: 0.8rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s ease;
  border-left: 5px solid transparent;
}

.todo-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.priority-high { border-left-color: var(--color-accent); }
.priority-medium { border-left-color: orange; }
.priority-low { border-left-color: #3498db; }

.todo-content {
    display: flex;
    align-items: center;
    flex-grow: 1;
    margin-right: 1rem;
    overflow: hidden;
}

.todo-checkbox {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  margin-right: 0.8rem;
  flex-shrink: 0;
}

.todo-title {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 1rem;
  color: var(--color-text);
  transition: color 0.3s ease;
}

.completed-text {
  text-decoration: line-through;
  color: var(--color-text-soft);
}

.todo-due-date {
    font-size: 0.8rem;
    color: var(--color-text-soft);
    background-color: var(--color-bg-soft);
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    margin-right: 0.5rem;
    white-space: nowrap;
    flex-shrink: 0;
}

.todo-tags {
    display: flex;
    gap: 0.3rem;
    overflow: hidden;
    flex-shrink: 1;
}

.tag {
    font-size: 0.75rem;
    background-color: var(--color-primary-soft);
    color: white;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    white-space: nowrap;
}

.todo-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.todo-actions button {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: transparent;
  border: 1px solid transparent;
  opacity: 0.7;
}

.todo-actions button:hover {
    opacity: 1;
}

.btn-edit {
  color: var(--color-primary);
  border-color: var(--color-primary-soft);
}
.btn-edit:hover {
  background-color: var(--color-primary-soft);
  color: white;
  border-color: var(--color-primary-soft);
}

.btn-delete {
  color: var(--color-accent);
  border-color: rgba(231, 76, 60, 0.5);
}
.btn-delete:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.logout-container {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
}

.btn-logout {
    background-color: transparent;
    border: 1px solid var(--color-text-soft);
    color: var(--color-text-soft);
    padding: 0.6rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.btn-logout:hover {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
}

.todo-list-draggable {
    list-style: none;
    padding: 0;
    margin: 0;
}

.ghost-item {
  opacity: 0.5;
  background: var(--color-bg-mute);
  border: 1px dashed var(--color-primary);
}

.drag-item {
  opacity: 0.8;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.todo-content {
    cursor: move;
}

/* Search styles */
.search-container {
  position: relative;
  margin-bottom: 1.5rem;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.8rem 2.5rem 0.8rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-mute);
  color: var(--color-text);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
}

.btn-clear-search {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--color-text-soft);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  line-height: 1;
}

.btn-clear-search:hover {
  color: var(--color-accent);
}
</style> 