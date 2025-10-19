import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import { useApiStore } from "./api";
import Task from "@/data/Task";

const storage = getStorage('tasks');
const startState = {
  // saved in storage
  tasks: {},              // all task objects, indexed by string key

  // not saved
  currentKey: null,      // key of the currently active task
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
    currentTask: (state) => state.tasks[state.currentKey],
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
        this.$reset();
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromStorage() {
      try {
        this.$reset();

        const keys = await storage.getItem('keys') ?? [];
        for (const key of keys) {
          this.tasks[key] = new Task(await storage.getItem(key));
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

        for (const item of data) {
          const task = new Task(item);
          this.tasks[task.getKey()] = task;
          await storage.setItem(task.getKey(), task.getData());
        }
        await storage.setItem('keys', Object.keys(this.tasks));
      }
      catch (err) {
        console.log(err);
      }
    },
  }
});
