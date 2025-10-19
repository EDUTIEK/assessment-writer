import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import Change from '@/data/Change';

const storage = getStorage('changes');

function startState() {
  const state = {
    changes: {},
    lastSave: 0,          // timestamp (ms) of the lastsaving in the storage
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
 * This stores unsent change markers for all created, updated or deleted objects of certain types, e.g. Comment
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
     * Count the number of changes
     * @param {object} state
     * @returns {number}
     */
    countChanges: state => {
      let count = 0;
      for (const type in state.changes) {
        count += Object.keys(state.changes[type]).length;
      }
      return count;
    },

    getCountOfChangesFor: state => {

      /**
       * Get the count of changes for an object type
       * @param {string} type see Change.ALLOWED_TYPES
       * @returns {number}
       */
      const fn = function (type) {
        if (!Change.ALLOWED_TYPES.includes(type)) {
          console.log('wrong type' + type);
          return 0;
        }
        return Object.keys(state.changes[type]).length;
      }
      return fn;
    },

    getChangesFor: state => {

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
      const state = startState();

      try {
        for (const type in state.changes) {
          const stored = await storage.getItem(type);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed === 'object' && parsed !== null) {
              for (const key in parsed) {
                state.changes[type][key] = new Change(parsed[key]);
              }
            }
          }
        }
        this.lastSave = parseInt(await storage.getItem('lastSave'));
        this.lastSendingSuccess = parseInt(await storage.getItem('lastSendingSuccess'));
      }
      catch (err) {
        console.log(err);
      }

      // replace the state with a new one
      this.$patch(state);
    },

    /**
     * Save changes of a type to the storage
     * Saves the change objects as plain data
     * @param {string} type see Change.ALLOWED_TYPES
     */
    async saveChangesOfTypeToStorage(type) {
      const data = {};
      for (const key in this.changes[type]) {
        const change = this.changes[type][key];
        data[key] = change.getData();
      }
      await storage.setItem(type, JSON.stringify(data));
      this.lastSave = Date.now();
      await storage.setItem('lastSave', this.lastSave);
    },

    /**
     * Check if changes are in the storage
     * (called from api store at initialisation)
     */
    async hasChangesInStorage() {
      for (const type in this.changes) {
        const stored = await storage.getItem(type);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Object.keys(parsed).length > 0) {
            return true;
          }
        }
      }
      return false;
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
        await this.saveChangesOfTypeToStorage(change.type);
      }
    },

    /**
     * Unset a change and save the changes
     * @param {Change} change
     */
    async unsetChange(change) {
      if (change.isValid()) {
        delete this.changes[change.type][change.key];
        await this.saveChangesOfTypeToStorage(change.type);
      }
    },


    /**
     * Cleanup changes that have been sent to the backend
     * This will delete all changes that are responded as processed and that are not newer than the sending time
     *
     * @param {string} type see Change.ALLOWED_TYPES
     * @param {object} processed - old key: new key or null if the data has been deleted
     * @param {integer} maxTime maximum timestamp until processed changes should be deleted
     * @see getChangesFor
     */
    async setChangesSent(type, processed, maxTime) {

      const changes = this.changes[type];
      let toStore = false;

      for (const old_key in processed) {
        const new_key = processed[old_key];
        const change = changes[old_key];

        if (change) {
          if (change.last_change <= maxTime) {
            delete changes[old_key];
            toStore = true;
          } else if (new_key == null || new_key != old_key) {
            change.key = new_key;
            changes[new_key] = change;
            delete changes[old_key];
            toStore = true;
          }
        }
      }
      if (toStore) {
        await this.saveChangesOfTypeToStorage(type);
      }
      this.lastSendingSuccess = Date.now();
      await storage.setItem('lastSendingSuccess', this.lastSendingSuccess);
    }
  }
});
