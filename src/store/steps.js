import {defineStore} from "pinia";
import {getStorage} from "@/lib/Storage";
import {useApiStore} from "@/store/api";
import {useSettingsStore} from "@/store/settings";
import {useTasksStore} from "@/store/tasks";
import {useWriterStore} from "@/store/writer";
import {useChangesStore} from "@/store/changes";

import WritingStep from "@/data/WritingStep";
import Change from "@/data/Change";

const storage = getStorage('steps');

const startState = {

  // saved in storage
  steps: {},                  // list of all step objects, indexed by key

  // not saved
  counts: {},                 // number of steps indexed by task_id
}

/**
 * Steps Store
 */
export const useStepsStore = defineStore('steps', {
  state: () => {
    return startState;
  },

  /**
   * Getter functions (with params) start with 'get', simple state queries not
   */
  getters: {

  },

  actions: {

    /**
     * Clear the whole storage
     * @public
     */
    async clearStorage() {
      try {
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
      this.$reset();
    },

    /**
     * Load the steps data from the storage
     * @public
     */
    async loadFromStorage() {

      try {
        this.$reset();

        const keys = await storage.getItem('keys');
        for (const key of keys) {
          const stored = await storage.getItem(key);
          if (stored) {
            if (typeof stored === 'object' && stored !== null) {
              const step = new WritingStep(stored);
              await this.addStep(false);
            }
          }
        }
      }
      catch (err) {
        console.log(err);
      }
    },

    /**
     * Load the steps data from the backend
     * All keys and steps are put to the storage
     *
     * @param {array} data - array of plain objects
     * @public
     */
    async loadFromBackend(data = []) {
      try {
        await storage.clear();
        this.$reset();

        for (const step_data of data) {
          const step = new WritingStep(step_data);
          await this.addStep(step, false);
          await storage.setItem(step.getKey(), step.getData());
        }
        await storage.setItem('keys', Object.keys(this.steps));
      }
      catch (err) {
        console.log(err);
      }
    },

    /**
     * add a step to the history
     */
    async addStep(step, save = true) {
      step.index = this.counts[step.task_id] ?? 0;
      this.counts[step.task_id] = step.index + 1;
      this.steps[step.getKey()] = step;

      if (save) {
        await storage.setItem(step.getKey(), step.getData());
        await storage.setItem('keys', Object.keys(this.steps));

        const changesStore = useChangesStore();
        await changesStore.setChange(new Change({
          type: Change.TYPE_STEPS,
          action: Change.ACTION_SAVE,
          key: step.getKey()
        }))
      }
    },

    /**
     * Get all changed steps from the storage as flat data objects
     * This is called for sending the nots to the backend
     * @param {integer} sendingTime - timestamp of the sending or 0 to get all
     * @return {array} Change objects
     */
    async getChangedData(sendingTime = 0) {
      const apiStore = useApiStore();
      const changesStore = useChangesStore();
      const changes = [];
      for (const change of changesStore.getChangesFor(Change.TYPE_STEPS, sendingTime)) {
        const data = await storage.getItem(change.key);
        if (data) {
          changes.push(apiStore.getChangeDataToSend(change, data));
        } else {
          changes.push(apiStore.getChangeDataToSend(change));
        }
      }
      return changes;
    }
  }
});
