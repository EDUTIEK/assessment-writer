import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import { useApiStore } from "./api";

const storage = getStorage('writer');

const startState = {
  // saved in storage
  id: null,
  writer_name: null,      // name of the writer - shown in the app bar
  working_start: null,    // working start (sec in server time) - from this time the instructions were visible
  working_deadline: null, // writing deadline (sec in server time) - accept no writing step after this time
  is_authorized: false,      // writing is authorized
  is_excluded: false,        // writer is excluded

  // not saved in storage
  remaining_time: null     // remaining writing time in seconds (updated per interval)
}

/**
 * Writer Store
 * Handles settings of the active writer
 */
export const useWriterStore = defineStore('writer', {
  state: () => {
    return startState;
  },

  getters: {
    hasWritingEnd: (state) => !!state.working_deadline,
    writingEndReached: (state) => state.remaining_time === 0,
    isAuthorized: (state) => state.is_authorized > 0,
    isExcluded: (state) => state.is_excluded > 0
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
        const data = await storage.getItem('writer');
        this.$patch(data);
      }
      catch (err) {
        console.log(err);
      }

      this.updateRemainingTime();
      const apiStore = useApiStore();
      apiStore.setInterval('writerStore.updateRemainingTime', this.updateRemainingTime, 1000);
    },

    async loadFromBackend(data = {}) {
      try {
        this.$patch({
          id: data.id ?? null,
          writer_name: data.writer_name ?? null,
          working_start: data.working_start ?? null,
          working_deadline: data.working_deadline ?? null,
          is_authorized: data.is_authorized ?? false,
          is_excluded: data.is_excluded ?? false,
        });
        await storage.setItem('preferences', Object.assign({}, this.$state));
      }
      catch (err) {
        console.log(err);
      }

      this.updateRemainingTime();
      const apiStore = useApiStore();
      apiStore.setInterval('writerStore.updateRemainingTime', this.updateRemainingTime, 1000);

    },

    /**
     * Update the remaining writing time (called by interval)
     */
    updateRemainingTime() {
      const apiStore = useApiStore();

      if (this.working_deadline) {
        this.remaining_time = Math.max(0, this.working_deadline - apiStore.getServerTime(Date.now()));
      } else {
        this.remaining_time = null;
      }

      if (this.writingEndReached || this.isExcluded || this.isAuthorized) {
        apiStore.review = true;
      }
    }
  }
});
