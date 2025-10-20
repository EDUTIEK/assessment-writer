import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import { useApiStore } from "./api";
import Task from "@/data/Task";
import Alert from "@/data/Alert";

const storage = getStorage('tasks');
const startState = {
  // saved in storage
  tasks: {},              // all task objects, indexed by string key

  // not saved
  firstKey: null,
  lastKey: null,
  currentKey: null,      // key of the currently active task
  previousKey: null,
  nextKey: null,
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
    countTasks(state) {
      return Object.keys(state.tasks).length;
    },
    currentTask(state) {
      return state.tasks[state.currentKey];
    },
    currentTitle(state) {
      return state.currentTask?.title;
    },
    hasInstructions(state) {
      return !!state.currentTask?.instructions;
    },
    sortedTasks(state) {
      return Object.values(state.tasks).toSorted(Task.order);
    },
  },

  actions: {

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
        this.updateCurrentKeys();
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
        this.updateCurrentKeys();
      }
      catch (err) {
        console.log(err);
      }
    },

    /**
     * Select the current task
     * @param string key of the current task
     */
    selectTask(key) {
      this.currentKey = key;
      this.updateCurrentKeys();
    },

    /**
     * Update the first, last, previous and next key
     */
    updateCurrentKeys() {
      if (this.countTasks) {
        const sorted = this.sortedTasks;
        const first = 0;
        const last = sorted.length -1;

        this.firstKey = sorted[first].getKey();
        this.lastKey = sorted[last].getKey();

        if (this.currentKey === null) {
          this.currentKey = this.firstKey;
        };

        for (let i = first; i <= last; i++) {
          let task = sorted[i];
          if (task.getKey() == this.currentKey) {
            this.previousKey = i > first ? sorted[i - 1].getKey() : null;
            this.nextKey = i < last ? sorted[i + 1].getKey() : null;
            break;
          }
        }
      }
    }
  }
});
