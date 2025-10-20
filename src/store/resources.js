import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import { useApiStore } from "./api";
import { useTasksStore } from "./tasks";
import axios from 'axios';
import Resource from "@/data/Resource";
import Alert from "@/data/Alert";

const storage = getStorage('resources');
const startState = {
  resources: {},

  /** @private  key of the active resource, may be outdated if the active task changes */
  activeKey: ''
};

/**
 * Resources Store
 */
export const useResourcesStore = defineStore('resources', {
  state: () => {
    return startState;
  },

  getters: {

    currentResources(state) {
      const taskStore = useTasksStore();
      return Object.values(state.resources).filter(element =>
          element.task_id === taskStore.currentTask?.task_id || element.task_id === null);
    },

    hasResources(state) {
      return state.currentResources.length > 0;
    },

    hasInstruction(state) {
      return !! state.currentResources.find(element => element.type === Resource.TYPE_INSTRUCTION);
    },

    getInstruction(state) {
      return state.currentResources.find(element => element.type === Resource.TYPE_INSTRUCTION);
    },

    hasAnnotatableResource(state) {
      return !! state.currentResources.find(element =>
          element.type === Resource.TYPE_INSTRUCTION || element.type === Resource.TYPE_FILE);
    },

    hasEmbeddedFileOrUrlResources(state) {
      return !! state.currentResources.find(element =>
          (element.type === Resource.TYPE_FILE || element.type === Resource.TYPE_URL) && element.embedded === true);
    },

    getFileOrUrlResources(state) {
      return state.currentResources.filter(element =>
          element.type == Resource.TYPE_FILE || element.type === Resource.TYPE_URL);
    },

    activeResource(state) {
      return state.currentResources.find(element => element.key === state.activeKey);
    },

    getResource(state) {
      return (key) => state.currentResources.find(element => element.key === key);
    },

    isActive(state) {
      return (resource) => resource.key === state.activeResource?.key;
    },

    isAvailable(state) {
      return (resource) => !! state.currentResources.find(element => element.key === resource.key);
    }
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
          this.resources[key] = new Resource(await storage.getItem(key));
        }
        this.activeKey = await storage.getItem('activeKey') ?? '';
        await this.loadFiles();
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromBackend(data = []) {
      const apiStore = useApiStore();

      try {
        await storage.clear();
        this.$reset();

        for (const item of data) {
          const resource = new Resource(item);
          if (resource.hasFileToLoad()) {
            resource.url = apiStore.getResourceUrl(resource);
          }
          this.resources[resource.getKey()] = resource;
          await storage.setItem(resource.getKey(), resource.getData());
          if (this.activeKey === '' && resource.isEmbeddedSelectable()) {
            await this.selectResource(resource);
          }
        }
        await storage.setItem('keys', Object.keys(this.resources));

        // proload files in the background (don't wait)
        this.loadFiles();
      }
      catch (err) {
        console.log(err);
      }
    },

    async selectResource(resource) {

      if (this.isAvailable(resource)) {
        this.activeKey = resource.key;
        await storage.setItem('activeKey', this.activeKey);
      }
    },

    /**
     * Preload file resources (workaround until service worker is implemented)
     * The Resources Component will only show PDF resources when they are immediately available
     * This preload forces the resources being in the browser cache
     *
     * https://stackoverflow.com/a/50387899
     */
    async loadFiles() {
      for (const resource of Object.values(this.resources)) {
        let response = null;
        if (resource.hasFileToLoad()) {
          try {
            console.log('preload ' + resource.title + '...');
            response = await axios(resource.url, { responseType: 'blob', timeout: 60000 });
            // resource.objectUrl = URL.createObjectURL(response.data)
            console.log('finished. ');
          }
          catch (error) {
            console.error(error);
          }
        }
      }
    }
  }
});
