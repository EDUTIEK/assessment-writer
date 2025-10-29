import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import Change from '@/data/Change';
import ChangeResponse from "@/data/ChangeReponse";

const storage = getStorage('changes');

function startState() {
  const state = {
    changes: {},
    lastSave: 0,            // timestamp (ms) of the last saving in the storage
    lastSendingSuccess: 0   // timestamp (ms) of the last successful sending to the backend
  };
  for (const type of Change.ALLOWED_TYPES) {
    state.changes[type] = {};   // changes of objects of the type that have to be sent to the backend: key => Change
  }
  return state;
}

/**
 * Changes Store
 *
 * This stores unsent change markers for all created, updated or deleted objects of certain types, e.g. WritingStep
 * The stored changes just give the type, keys and timestamp of the change
 * The actual changed will be  added as a payload when the change is sent to the backend
 */
export const useChangesStore = defineStore('changes', {
  state: () => {
    return startState();
  },

  /**
   * Getter functions (with params) start with 'get', simple state queries not
   */
  getters: {

    /**
     * Check if writing changes still have to be sent
     */
    hasWritingChanges(state) {
      for (const type of Change.WRITING_TYPES) {
        if (Object.keys(state.changes[type]).length > 0) {
          return true;
        }
      }
      return false;
    },

    /**
     * Check if other changes than writingSteps
     */
    hasOtherChanges(state) {
      for (const type of Change.OTHER_TYPES) {
        if (Object.keys(state.changes[type]).length > 0) {
          return true;
        }
      }
      return false;
    },

    /**
     * Count the number of changes
     * @param {object} state
     * @returns {number}
     */
    countChanges(state) {
      let count = 0;
      for (const type of Change.ALLOWED_TYPES) {
        count += Object.keys(state.changes[type]).length;
      }
      return count;
    },

    getChangesCount(state) {

      /**
       * Get the number of changes of a type
       * @param {array} types - types to count
       */
      const fn = function (types = Change.ALLOWED_TYPES) {
        let count = 0;
        for (const type of types) {
          count += Object.keys(state.changes[type]).length;
        }
        return count;
      }
      return fn;
    } ,

    getChangesFor(state) {

      /**
       * Get the changes of a type
       * @param {string} type - see Change.ALLOWED_TYPES
       * @param {number} maxTime - maximum last change or 0 to get all
       * @return {array} Change objects
       * @see setChangesSent
       */
      const fn = function (type, maxTime = 0) {
        if (!Change.ALLOWED_TYPES.includes(type)) {
          return [];
        }
        const changes = [];
        for (const key in state.changes[type]) {
          const change = state.changes[type][key];
          if (maxTime == 0 || change.last_change <= maxTime) {
            changes.push(change);
          }
        }
        return changes;
      }
      return fn;
    },
  },

  actions: {

    /**
     * Clear the whole storage
     * @public
     */
    async clearStorage() {
      try {
        this.$reset();
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
    },

    /**
     * Load the changes storage
     * Creates change objects from the plain data
     * @public
     */
    async loadFromStorage() {
      this.$reset();

      try {
        for (const type in this.changes) {
          const keys = await storage.getItem(type) ?? [];
          for (const key of keys) {
            const stored = await storage.getItem(Change.buildChangeKey(type, key));
            const parsed = JSON.parse(stored);
            if (typeof parsed === 'object' && parsed !== null) {
              this.changes[type][key] = new Change(parsed);
            }
          }
        }
        this.lastSave = parseInt(await storage.getItem('lastSave'));
        this.lastSendingSuccess = parseInt(await storage.getItem('lastSendingSuccess'));
      }
      catch (err) {
        console.log(err);
      }
    },

    /**
     * Check if changes are in the storage
     * (called from api store at initialisation)
     */
    async hasChangesInStorage() {
      for (const type in this.changes) {
        const keys = await storage.getItem(type) ?? [];
        return keys.length > 0;
      }
    },

    /**
     * Set a change and save the changes
     * Changes with same key and type will be updated, so that only the last change time is saved
     * This prevents multiple sending of the same data
     * @param {Change} change
     */
    async setChange(change) {
      if (change.isValid()) {
        this.changes[change.type][change.key] = change;
        await storage.setItem(change.getChangeKey(), JSON.stringify(change.getData()));
        await storage.setItem(change.type, Object.keys(this.changes[change.type]));
        this.lastSave = Date.now();
        await storage.setItem('lastSave', this.lastSave);
      }
    },

    /**
     * Unset a change and save the changes
     * @param {Change} change
     */
    async unsetChange(change) {
      if (change.isValid()) {
        delete this.changes[change.type][change.key];
        await storage.removeItem(change.getChangeKey());
        await storage.setItem(change.type, Object.keys(this.changes[change.type]));
        this.lastSave = Date.now();
        await storage.setItem('lastSave', this.lastSave);
      }
    },

    /**
     * Cleanup changes that have been sent to the backend
     * This will delete all changes that are responded as processed and that are not newer than the sending time
     *
     * @param {string} type see Change.ALLOWED_TYPES
     * @param {object} response - old key: new key or null if the data has been deleted
     * @param {integer} maxDeleteTime maximum timestamp until processed changes should be deleted
     * @see getChangesFor
     */
    async setChangesSent(type, responses = [], maxDeleteTime) {

      let store_keys = false;

      for (const response_data of responses) {
        const response = new ChangeResponse(response_data);
        const old_key = response.key;
        const new_key = response.getNewKey();
        const change = this.changes[type][old_key];

        if (change && response.done) {
          if (change.last_change <= maxDeleteTime) {

            // change that has not been updated since the sending

            // => delete it
            delete this.changes[type][old_key];
            await storage.removeItem(change.getChangeKey());
            store_keys = true;

          } else if (new_key !== null && new_key !== old_key) {

            // a new key is returned for a change that was update meanwhile

            // => delete the change with the old key
            delete this.changes[type][old_key];
            await storage.removeItem(change.getChangeKey());

            // => save the same change with the new key
            change.key = new_key;
            this.changes[type][new_key] = change;
            await storage.setItem(change.getChangeKey(), JSON.stringify(change.getData()));
            store_keys = true;
          }
        }
      }

      // finally save the keys if needed (avoid multiple writes)
      if (store_keys) {
        this.lastSave = Date.now();
        await storage.setItem(type, Object.keys(this.changes[type]));
        await storage.setItem('lastSave', this.lastSave);
      }

      this.lastSendingSuccess = Date.now();
      await storage.setItem('lastSendingSuccess', this.lastSendingSuccess);
    }
  }
});
