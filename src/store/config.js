/**
 * Config Store
 * handles the editor config of the assessment
 */
import {getStorage} from "@/lib/Storage";
import i18n from "@/plugins/i18n";
import {defineStore} from 'pinia';

const storage = getStorage('config');

const { t } = i18n.global

const startState = {
  // saved in storage
  primary_color: null,            // color for the background of primary actions
  primary_text_color: null,       // color for the text of primary actions
}

function hexToRgba(hex, alpha) {
  hex = hex.replace(/^#/, '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const useConfigStore = defineStore('config', {
  state: () => {
    return startState;
  },

  getters: {

    commentColor(state) {
      return hexToRgba('FF00FF', 0.4);
    },

    primaryColorCss(state) {
      if (state.primary_color) {
        return '#' + state.primary_color
      }
      return '';
    },

    primaryTextColorCss(state) {
      if (state.primary_text_color) {
        return '#' + state.primary_text_color
      }
      return '';
    },

    primaryTextColorFullCss(state) {
      if (state.primary_text_color) {
        return 'color: #' + state.primary_text_color + ';'
      }
      return '';
    },
    
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
        this.$patch(await storage.getItem('config'));
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromBackend(data = {}) {
      try {
        this.$patch({
          primary_color: data.primary_color ?? null,
          primary_text_color: data.primary_text_color ?? null,
        });
        await storage.setItem('config',  Object.assign({}, this.$state));
      }
      catch (err) {
        console.log(err);
      }
    }
  }
});
