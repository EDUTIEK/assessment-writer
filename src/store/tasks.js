import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import { useApiStore } from "./api";
import Task from "@/data/Task";

const storage = getStorage('tasks');
const startState = {
  // saved in storage
  tasks: {},              // all task objects, indexed by string key

  // not saved
  current_key: null,      // key of the currently active task
};

/**
 * Task Store
 * Handles the list of the writing task
 */
export const useTasksStore = defineStore('tasks', {
  state: () => {
    return startState;
  },

  getters: {
    currentTask: (state) => state.tasks[state.current_key],
    currentTitle: (state) => state.currentTask?.title,
    hasInstructions: (state) => !!state.currentTask?.instructions,
  },

  actions: {
    setData(data) {
      this.title = data.title;
      this.instructions = data.instructions;
    },

    async clearStorage() {
      try {
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
      this.$reset();
    },

    async loadFromStorage() {
      try {
        this.$reset();

        const keys = JSON.parse(await storage.getItem('keys')) ?? [];
        for (const key of keys) {
          const task = new Task(JSON.parse(await storage.getItem(task.getKey())));
          this.tasks[task.getKey()] = task;
        }
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromBackend(data = []) {
      try {
        await storage.clear();
        this.$reset();

        for (const task_data of data) {
          const task = new Task(task_data)
          this.tasks[task.getKey()] = task;
          await storage.setItem(task.getKey(), JSON.stringify(task.getData()));
        }
        await storage.setItem('keys', JSON.stringify(Object.keys(this.tasks)));
      }
      catch (err) {
        console.log(err);
      }
    },
  }
});
