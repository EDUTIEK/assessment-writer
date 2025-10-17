import { defineStore } from 'pinia';
import localForage from "localforage";
import { useApiStore } from "./api";
import axios from 'axios';
import Resource from "@/data/Resource";

const storage = localForage.createInstance({
  storeName: "writer-resources",
  description: "Resource data",
});

/**
 * Resources Store
 */
export const useResourcesStore = defineStore('resources', {
  state: () => {
    return {
      // saved in storage
      keys: [],               // list of string keys
      resources: [],          // list of resource objects
      activeKey: ''           // key of the active resource
    }
  },

  getters: {
    hasResources: (state) => state.resources.length > 0,

    hasInstruction(state) {
      const resource = state.resources.find(element => element.type == Resource.TYPE_INSTRUCTION);
      return resource ? true : false;
    },

    getInstruction(state) {
      return state.resources.find(element => element.type == Resource.TYPE_INSTRUCTION);
    },

    hasAnnotatableResource(state) {
      const resource = state.resources.find(element => element.type == Resource.TYPE_INSTRUCTION || element.type == Resource.TYPE_FILE);
      return resource ? true : false;
    },

    hasEmbeddedFileOrUrlResources(state) {
      const resource = state.resources.find(element => (element.type == Resource.TYPE_FILE || element.type == Resource.TYPE_URL)
        && element.embedded == true);
      return resource ? true : false;
    },

    getFileOrUrlResources(state) {
      return state.resources.filter(element => element.type == Resource.TYPE_FILE || element.type == Resource.TYPE_URL);
    },

    activeTitle(state) {
      const resource = state.resources.find(element => element.key == state.activeKey);

      return resource ? resource.title : ""
    },

    getResource(state) {
      return (key) => state.resources.find(element => element.key == key)
    },

    isActive(state) {
      return (resource) => state.activeKey == resource.key
    }
  },

  actions: {

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
        const keys = await storage.getItem('keys');
        if (keys) {
          this.keys = JSON.parse(keys);
        }
        this.activeKey = await storage.getItem('activeKey') ?? [];
        this.resources = [];

        for (const key of this.keys) {
          const stored = await storage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed === 'object' && parsed !== null) {
              const resource = new Resource(parsed);
              this.resources.push(resource);
            }
          }

        }

        await this.loadFiles();

      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromData(data = []) {
      const apiStore = useApiStore();

      try {
        await storage.clear();
        this.$reset();

        for (const resource_data of data) {
          const resource = new Resource(resource_data);
          if (resource.type != Resource.TYPE_URL) {
            resource.url = apiStore.getResourceUrl(resource.key);
          }
          this.resources.push(resource);
          if (this.activeKey == '' && resource.isEmbeddedSelectable()) {
            this.activeKey = resource.key;
          }

          this.keys.push(resource.getKey());
          await storage.setItem(resource.getKey(), JSON.stringify(resource.getData()));
        }
        ;
        await storage.setItem('keys', JSON.stringify(this.keys));
        await storage.setItem('activeKey', this.activeKey);

        // proload files in the background (don't wait)
        this.loadFiles();
      }
      catch (err) {
        console.log(err);
      }
    },

    async selectResource(resource) {
      this.activeKey = resource.key;
      await storage.setItem('activeKey', this.activeKey);
    },

    /**
     * Preload file resources (workaround until service worker is implemented)
     * The Resources Component will only show PDF resources when they are immediately available
     * This preload forces the resources being in the browser cache
     *
     * https://stackoverflow.com/a/50387899
     */
    async loadFiles() {
      for (const key of this.keys) {
        let resource = this.getResource(key);
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
            // return false;
          }
        }
      }
    }
  }
});
