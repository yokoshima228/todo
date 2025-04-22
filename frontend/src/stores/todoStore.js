import { defineStore } from 'pinia';
import apiClient from '@/api'; // Import the configured api client
import { useToast } from 'vue-toastification'; // Import useToast

const toast = useToast(); // Initialize toast

export const useTodoStore = defineStore('todo', {
    state: () => ({
        todos: [],
    }),
    actions: {
        async fetchTodos() {
            try {
                const response = await apiClient.get('/todos'); // Use apiClient and relative path
                this.todos = response.data;
                console.log(this.todos);
            } catch (error) {
                console.error('Error fetching todos:', error);
                // Don't toast here if unauthorized error is handled by interceptor/logout
                if (error.response?.status !== 401) {
                    toast.error("Failed to load tasks.");
                }
            }
        },
        async addTodo(todoData) {
            if (!todoData || !todoData.title) {
                toast.error('Title is required to add a task.'); // Toast error
                console.error('Error adding todo: Title is required.');
                return;
            }
            try {
                console.log('Adding todo:', todoData);
                const response = await apiClient.post('/todos', todoData);
                this.todos.push(response.data);
                toast.success("Task added successfully!"); // Success toast
            } catch (error) {
                console.error('Error adding todo:', error);
                toast.error("Failed to add task."); // Error toast
            }
        },
        async updateTodo(id, updatedTodo) {
            try {
                console.log('Updating todo:', updatedTodo);
                const response = await apiClient.put(`/todos/${id}`, updatedTodo);
                const index = this.todos.findIndex(todo => todo._id === id);
                if (index !== -1) {
                    this.todos.splice(index, 1, response.data);
                    toast.success("Task updated successfully!");
                }
            } catch (error) {
                console.error('Error updating todo:', error);
                toast.error("Failed to update task.");
            }
        },
        async deleteTodo(id) {
            try {
                await apiClient.delete(`/todos/${id}`);
                this.todos = this.todos.filter(todo => todo._id !== id);
                toast.success("Task deleted successfully!"); // Success toast
            } catch (error) {
                console.error('Error deleting todo:', error);
                toast.error("Failed to delete task."); // Error toast
            }
        },
        async deleteCompletedTodos() {
            try {
                await apiClient.delete('/todos/complete');
                const initialLength = this.todos.length;
                this.todos = this.todos.filter(todo => !todo.completed);
                const deletedCount = initialLength - this.todos.length;
                if (deletedCount > 0) {
                   toast.success(`${deletedCount} completed task(s) deleted.`); // Success toast
                } else {
                   toast.info("No completed tasks to delete.");
                }
            } catch (error) {
                console.error('Error deleting completed todos:', error);
                toast.error("Failed to delete completed tasks."); // Error toast
            }
        },
        // Action to reorder todos locally and persist on backend
        async reorderTodos(oldIndex, newIndex) {
            if (oldIndex === newIndex) return;
            // Prepare data for the backend
            const orderedIds = this.todos.map(t => t._id);
            console.log(`orderedIds: ${orderedIds}`);

            // Persist the new order on the backend
            try {
                await apiClient.put('/todos/reorder', { orderedIds }); // Call the reorder endpoint
                toast.success('Task order saved.'); // Success toast
                console.log('New order saved to backend.');
            } catch (error) {
                console.error('Failed to save new order to backend:', error);
                toast.error('Failed to save new task order.'); // Error toast

                // Revert local changes on error to reflect the server state
                // This is a simple revert, more complex logic might be needed
                console.log('Reverting local order change due to error...');
                const [revertItem] = this.todos.splice(newIndex, 1);
                if (revertItem) {
                    this.todos.splice(oldIndex, 0, revertItem);
                } else {
                    // If reverting fails, the state might be inconsistent.
                    // Consider refetching todos as a fallback.
                    console.error('Failed to revert local order. Refetching might be needed.');
                    this.fetchTodos(); // Example: Refetch on failure to revert
                }
            }
        }
    }
});
