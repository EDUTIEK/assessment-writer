import { defineStore } from 'pinia';
import localForage from "localforage";
import i18n from "@/plugins/i18n";

import contentLocalCss from '@/styles/content.css?inline';
import headlinesSingleCss from '@/styles/headlines-single.css?inline';
import headlinesThreeCss from '@/styles/headlines-three.css?inline';
import headlinesNumericCss from '@/styles/headlines-numeric.css?inline';
import headlinesEdutiekCss from '@/styles/headlines-edutiek.css?inline';

const storage = localForage.createInstance({
  storeName: "writer-config",
  description: "Config data",
});

const { t } = i18n.global

const startState = {
  // saved in storage
  primary_color: null,            // color for the background of primary actions
  primary_text_color: null,       // color for the text of primary actions
}

/**
 * Config Store
 * Handles the editor config of the assessment
 */
export const useConfigStore = defineStore('config', {
  state: () => {
    return startState;
  },

  getters: {

    primaryColorCss: state => {
      if (state.primary_color) {
        return '#' + state.primary_color
      }
      return '';
    },

    primaryTextColorCss: state => {
      if (state.primary_text_color) {
        return '#' + state.primary_text_color
      }
      return '';
    },

    primaryTextColorFullCss: state => {
      if (state.primary_text_color) {
        return 'color: #' + state.primary_text_color + ';'
      }
      return '';
    },
    
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
