/**
 * Preferences Store
 * Stores local setings done by the corrector
 * These settings are not yet sent to the backend
 */
import Change from '@/data/Change';
import {getStorage} from "@/lib/Storage";
import {stores} from "@/store";
import {defineStore} from 'pinia';

const storage = getStorage('preferences');

const startState = {
    // saved in storage
    instructions_zoom: 1,                // zoom level of the instructions
    editor_zoom: 1,                      // zoom level of the editors (essay and notes)
    word_count_enabled: false,           // enabling of the word counter
    word_count_characters: false         // word counter show characters
}

export const usePreferencesStore = defineStore('preferences', {
  state: () => {
    return startState;
  },

  getters: {
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
        this.$patch(await storage.getItem('preferences'));
      }
      catch (err) {
        console.log(err);
      }
    },

    async saveToStorage() {
      try {
        await storage.setItem('preferences', Object.assign({}, this.$state));
      }
      catch (err) {
        console.log(err);
      }
    },

    loadFromBackend(data = {}) {
      try {
        this.$patch({
          instructions_zoom: data.instructions_zoom ?? 1,
          editor_zoom: data.editor_zoom ?? 1,
          word_count_enabled: data.word_count_enabled ?? false,
          word_count_characters: data.word_count_characters ?? false
        });
        this.saveToStorage();
      }
      catch (err) {
        console.log(err);
      }
    },

    /**
     * Update the preferences in the storage and mark them as changed
     */
    async update() {
      const changesStore = stores.changes();
      const apiStore = stores.api();

      await this.saveToStorage();
      await changesStore.setChange(new Change({
        type: Change.TYPE_PREFERENCES,
        action: Change.ACTION_SAVE,
        key: 'preferences',         // fixed key, old change will be updated
      }))
    },

    /**
     * Get the changed preferences as flat data object
     * This is called for sending the preferences to the backend
     * @param {integer} sendingTime - timestamp of the sending or 0 to get all
     * @return {array} Change objects
     */
    async getChangedData(sendingTime = 0) {
      const changesStore = stores.changes();
      const changes = [];
      for (const change of changesStore.getChangesFor(Change.TYPE_PREFERENCES, sendingTime)) {
        // preferences exist only once, will be the same for all changes
        changes.push(changesStore.getChangeDataToSend(change, Object.assign({}, this.$state)));
        break;
      }
      return changes;
    },

    zoomInstructionsIn() {
      this.instructions_zoom = this.instructions_zoom * 1.1;
      this.update();
    },

    zoomInstructionsOut() {
      this.instructions_zoom = this.instructions_zoom * 0.9;
      this.update();
    },

    zoomEditorIn() {
      this.editor_zoom = this.editor_zoom * 1.1;
      this.update();
    },

    zoomEditorOut() {
      this.editor_zoom = this.editor_zoom * 0.9;
      this.update();
    },

    toggleWordCountEnabled() {
      this.word_count_enabled = !this.word_count_enabled;
      this.update();
    },

    toggleWordCountCharacters() {
      this.word_count_characters = !this.word_count_characters;
      this.update();
    }
  },
});
