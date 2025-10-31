/**
 * Writer Store
 * handles settings of the active writer
 */
import Change from "@/data/Change";
import ChangeResponse from "@/data/ChangeReponse";
import {stores} from "@/store";
import {getStorage} from "@/lib/Storage";
import {defineStore} from 'pinia';

const storage = getStorage('writer');

const startState = {
  // saved in storage
  writer_name: null,      // name of the writer - shown in the app bar
  working_start: null,    // working start (sec in server time) - from this time the instructions were visible
  working_deadline: null, // writing deadline (sec in server time) - accept no writing step after this time
  is_authorized: false,      // writing is authorized
  is_excluded: false,        // writer is excluded

  // not saved in storage
  remaining_time: null     // remaining writing time in seconds (updated per interval)
}

export const useWriterStore = defineStore('writer', {
  state: () => {
    return startState;
  },

  getters: {
    hasWritingEnd(state) {
      return !!state.working_deadline;
    },
    writingEndReached(state) {
      return state.remaining_time === 0;
    },
    isAuthorized(state) {
      return state.is_authorized > 0;
    },
    isExcluded(state) {
      return state.is_excluded > 0;
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
        const data = await storage.getItem('writer');
        this.$patch(data);
      }
      catch (err) {
        console.log(err);
      }

      this.updateRemainingTime();
      const apiStore = stores.api();
      apiStore.setInterval('writerStore.updateRemainingTime', this.updateRemainingTime, 1000);
    },

    async loadFromBackend(data = {}) {
      try {
        this.$patch({
          writer_name: data.writer_name ?? null,
          working_start: data.working_start ?? null,
          working_deadline: data.working_deadline ?? null,
          is_authorized: data.is_authorized ?? false,
          is_excluded: data.is_excluded ?? false,
        });
        await storage.setItem('writer', Object.assign({}, this.$state));
      }
      catch (err) {
        console.log(err);
      }

      this.updateRemainingTime();
      const apiStore = stores.api();
      apiStore.setInterval('writerStore.updateRemainingTime', this.updateRemainingTime, 1000);

    },

    /**
     * Update the remaining writing time (called by interval)
     */
    updateRemainingTime() {
      const apiStore = stores.api();

      if (this.working_deadline) {
        this.remaining_time = Math.max(0, this.working_deadline - apiStore.getServerTime(Date.now()));
      } else {
        this.remaining_time = null;
      }

      if (this.writingEndReached || this.isExcluded || this.isAuthorized) {
        apiStore.review = true;
      }
    },


    /**
     * Get the writing status to be sent
     * The data will be wrapped for sending as changes
     * @param {bool} authorized
     * @return {array} Change objects
     */
    async getStatusToSend(authorized) {
      const change = new Change({
        action: Change.ACTION_SAVE,
        type: Change.TYPE_WRITER,
        key: 'W' + this.id,
      });
      return [stores.changes().getChangeDataToSend(change, {is_authorized: authorized})];
    },

    /**
     * Change the authorization status
     * based on the resonse sending a status change request
     * @param responses
     */
    async setStatusResponses(responses = []) {
      for (const response_data of responses) {
        const response = new ChangeResponse(response_data);
        if (response.done && response.result?.is_authorized)  {
          this.is_authorized = true;
          await storage.setItem('writer', Object.assign({}, this.$state));
        }
      }
    }

  }
});
