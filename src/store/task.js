import { defineStore } from 'pinia';
import localForage from "localforage";
import { useApiStore } from "./api";

const storage = localForage.createInstance({
  storeName: "writer-task",
  description: "Task data",
});


/**
 * Task Store
 * Handles settings of the writing task
 */
export const useTaskStore = defineStore('task', {
  state: () => {
    return {
      // saved in storage
      title: null,            // title of the task - shown in the app bar
      instructions: null,     // instructions - shown in the left column
    }
  },

  getters: {
    hasInstructions: (state) => !!state.instructions,
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
    },

    async loadFromStorage() {
      try {
        const data = await storage.getItem('task');
        this.setData(data);
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromData(data) {
      try {
        await storage.setItem('task', data);
        this.setData(data);
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromUpdate(data) {
      try {
        await storage.setItem('task', {
          'title': this.title,
          'instructions': this.instructions,
        });
      }
      catch (err) {
        console.log(err);
      }
    },
  }
});
