import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import DiffMatchPatch from 'diff-match-patch';
import md5 from 'md5';
import { useApiStore } from "@/store/api";
import { useTasksStore } from "@/store/tasks";
import { useWriterStore } from "@/store/writer";
import {useStepsStore} from "@/store/steps";
import WritingStep from "@/data/WritingStep";
import Essay from "@/data/Essay";

const storage = getStorage('essay');

const dmp = new DiffMatchPatch();

const checkInterval = 1000;     // time (ms) to wait for a new update check (e.g. 0.2s to 1s)
const saveInterval = 5000;      // maximum time (ms) to wait for a new save if content is changed
const saveDistance = 10;        // maximum levenshtein distance to wait for a new save if content is changed
const maxDistance = 1000;       // maximum cumulated levenshtein distance of patches before a new full save is done

const startState = {

  // saved in storage
  essays: {},                  // list of all essay objects, indexed by key

  // not saved in storage
  editEssays: {},              // notes that are actively edited
  lastCheck: 0,               // timestamp (ms) of the last check if an update needs a storage
}

let lockUpdate = 0;             // prevent updates during a processing

/**
 * Essay store
 * Handles the written text of the user
 */
export const useEssayStore = defineStore('essay', {

  state: () => {
    return startState;
  },

  getters: {
    // todo rewrite calls to look for changes of type steps
    openSendings: (state) => false,

    /**
     * Format a timestamp as string like '2022-02-21 21:22:22'
     */
    formatTimestamp() {
      return (timestamp) => (new Date(timestamp)).toISOString().slice(0, 19).replace('T', ' ');
    },

    /**
     * Format an integer index with leading zeros like '000000001'
     * Used to generate the history keys in the storage
     */
    formatIndex() {
      return (index) => index.toString().padStart(9, '0');
    },

    /**
     * Make a hash from a string content and a unix timestamp
     * This is used to sign the editing steps
     * Content and timestamp are saved with a writing step, so verification on the server is possible
     * The combination of content and timestamp makes a hash unique for the task and user
     */
    makeHash() {
      return (content, timestamp) => md5(content + timestamp);
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
      this.$reset();
    },

    /**
     * Load the full state from the storage
     * Called when the page is reloaded
     */
    async loadFromStorage() {
      lockUpdate = 1;

      try {
        this.$reset();

        const keys = await storage.getItem('keys');

        for (const key of keys) {
          const stored = await storage.getItem(key);
          if (stored) {
            if (typeof stored === 'object' && stored !== null) {
              const essay = new essay(stored);
              this.essays[key] = essay;
              this.editEssays[key] = essay.getClone();
            }
          }
        }
      }
      catch (err) {
        console.log(err);
      }

      lockUpdate = 0;
      const apiStore = useApiStore();
      apiStore.setInterval('essayStore.checkUpdates', this.checkUpdates, checkInterval);
    },
    /**
     * Load the full state from external data and save it to the storage
     * Called when the app is opened from the backend
     */
    async loadFromBackend(data = {}) {
      lockUpdate = 1;

      try {
        await storage.clear();
        this.$reset();

        for (const essay_data of data) {
          const essay = new Essay(essay_data);
          this.essays[essay.getKey()] = essay;
          this.editEssays[essay.getKey()] = essay.getClone();
          await storage.setItem(essay.getKey(), essay.getData());
        }
        await storage.setItem('keys', Object.keys(this.essays));
      }
      catch (err) {
        console.log(err);
      }

      lockUpdate = 0;
      const apiStore = useApiStore();
      apiStore.setInterval('essayStore.checkUpdates', this.checkUpdates, checkInterval);
    },

    /**
     * Check all essays if an update is needed
     * @param forced - force the updates
     */
    async checkUpdates(forced = false) {

      for (const key in this.essays) {
        await this.updateContent(key, forced);
      }

      // reset the interval
      // this should start the interval again if it stopped accidentally
      const apiStore = useApiStore();
      apiStore.setInterval('essayStore.checkUpdates', this.checkUpdates, checkInterval);
    },

    /**
     * Update the stored content
     * Triggered from the editor component when the content is changed
     * Triggered every checkInterval
     * Push current content to the history
     * Save it in the browser storage
     */
    async updateContent(key, forced = false) {

      const apiStore = useApiStore();
      const writerStore = useWriterStore();
      const stepsStore = useStepsStore();

      const essay = this.essays[key];
      if (!essay) {
        console.log('essay with key ' + key + ' not found!');
        return false;
      }

      // avoid too many checks
      const currentTime = Date.now();
      if (!forced && currentTime - essay.last_check < checkInterval) {
        return false;
      }

      // don't accept changes after writing end
      if (writerStore.writingEndReached) {
        return false;
      }

      // avoid parallel updates
      // no need to wait because updateContent is permanently called
      // use post-increment for test-and-set
      if (lockUpdate++) {
        return false;
      }

      try {
        // ensure it is not changed because content in state is bound to tiny
        const currentContent = this.editEssays[key].content + '';
        const storedContent = essay.content;

        let step = null;

        //
        // create the step object if content has changed
        //
        if (currentContent != storedContent) {
          const currentHash = this.makeHash(currentContent, apiStore.getServerTime(currentTime));

          // check for change and calculate the patch
          let diffs = dmp.diff_main(storedContent, currentContent);
          dmp.diff_cleanupEfficiency(diffs);
          const distance = dmp.diff_levenshtein(diffs);
          const difftext = dmp.patch_toText(dmp.patch_make(storedContent, diffs));

          // be sure that the patch works
          const result = dmp.patch_apply(dmp.patch_fromText(difftext), storedContent);

          // make a full save if ...
          if (!(stepsStore.counts[essay.task_id] ?? 0)              // it is the first save
            || forced
            || difftext.length > currentContent.length              // or diff would be longer than full text
            || essay.sum_of_distances + distance > maxDistance      // or enough changes are saved as diffs
            || result[0] != currentContent                          // or patch is wrong
          ) {
            step = new WritingStep({
              task_id: essay.task_id,
              is_delta: 0,
              timestamp: apiStore.getServerTime(currentTime),
              content: currentContent,
              hash_before: essay.hash,
              hash_after: currentHash,
              distance: distance
            });
          }
          // make a delta save if ...
          else if (distance >= saveDistance                       // enough changed since lase save
            || currentTime - this.lastSave > saveInterval         // enough time since last save
          ) {
            step = new WritingStep({
              task_id: essay.task_id,
              is_delta: 1,
              timestamp: apiStore.getServerTime(currentTime),
              content: difftext,
              hash_before: essay.hash,
              hash_after: currentHash,
              distance: distance
            });
          }

          //
          // Save the changed essay and writing step
          //
          if (step !== null) {

            essay.content = currentContent;
            essay.hash = currentHash;
            essay.last_change = currentTime;
            essay.last_check = currentTime;
            essay.sum_of_distances = step.is_delta ? step.distance : 0

            this.essays[key] = essay;
            this.editEssays[key].setData(essay.getData());
            await storage.setItem(essay.getKey(), essay.getData());

            // push to history
            await stepsStore.addStep(step, true);

            console.log(
              "Delta:", step.is_delta,
              "| Distance (sum): ", distance, "(", essay.sum_of_distances, ")",
              "| Duration:", Date.now() - currentTime, 'ms');
          }
        }

        // set this here again if update was not necessary
        essay.last_check = currentTime;
      }
      catch (error) {
        console.error(error);
      }

      lockUpdate = 0;
    },


    /**
     * Note that all
     */
    async setAllSavingsSent() {
      // todo: refactor to changes store
    },

    /**
     * Check if unsent savings are in the storage
     * (called from api store at initialisation)
     */
    async hasUnsentSavingsInStorage() {
      // todo: refactor to changes store
      return false;
    },

    /**
     * Check if the current hash from the server is saved in the storage
     * (called from api store at initialisation)
     */
    async hasHashInStorage(hash) {
      // todo refactor to changes store
      return false;
    }
  }
});
