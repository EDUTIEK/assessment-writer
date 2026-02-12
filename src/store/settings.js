/**
 * Settings Store
 * Handles the editor settings of the assessment
 */
import {getStorage} from "@/lib/Storage";
import {defineStore} from 'pinia';

const storage = getStorage('settings');

const startState = {
  // saved in storage
  headline_scheme: null,          // identifier (string) of the CSS scheme used for headlines
  formatting_options: null,       // identifier (string) if the available formatting otions
  notice_boards: 0,               // number (int) of available notice boards
  copy_allowed: false,            // flag (bool) if copy/paste from other websites should be allowed
  allow_spellcheck: false         // flag (bool) if spellcheck by browser is allowed
}

export const useSettingsStore = defineStore('settings', {
  state: () => {
    return startState;
  },

  getters: {

    hasNotes(state) {
      return state.notice_boards > 0;
    },

    contentClass(state) {
      switch (state.headline_scheme) {
        case 'single':
          return 'headlines-single';
        case 'three':
          return 'headlines-three';
        case 'numeric':
          return 'headlines-numeric';
        case 'edutiek':
          return 'headlines-edutiek';
        default:
          return '';
      }
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
        this.$patch(await storage.getItem('settings'));
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromBackend(data = {}) {
      try {
        this.$patch({
          headline_scheme: data.headline_scheme ?? '',
          formatting_options: data.formatting_options ?? null,
          notice_boards: data.notice_boards ?? 0,
          copy_allowed: data.copy_allowed ?? false,
          allow_spellcheck: data.allow_spellcheck ?? false
        });
        await storage.setItem('settings',  Object.assign({}, this.$state));
      }
      catch (err) {
        console.log(err);
      }
    }
  }
});
