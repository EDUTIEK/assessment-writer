/**
 * Clipboard store
 * stores copied content from allowed resources
 * checs if pasted content equals to the copied content
 */
import {stores} from "@/store";
import {defineStore} from 'pinia';

function textify(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.innerText || temp.textContent;
  return text.trim();
}

function normalize(html) {
  const text = textify(html);
  return text.replace(/[\s\n\r]+/g, '');
}

/**
 * Clipboard Store
 */
export const useClipboardStore = defineStore('clipboard', {
  state: () => {
    return {
      content: '',
      show_warning: false
    }
  },

  getters: {

    getPasteAllowed: state => {

      /**
       * Check if paste of a certain content is allowed
       * This is allowed if the content comes from the instructions or from the editors
       *
       * @param {string} content
       * @return {boolean}
       */
      const fn = function (content) {

        const settingsStore = stores.settings();
        if (settingsStore.copy_allowed) {
          return true;
        }

        if (content == '') {
          return false;
        }

        console.log('content:', content);
        console.log('normalized content:', normalize(content));

        console.log('state.content:', state.content);
        console.log('normalized state.content:', normalize(state.content));

        if (normalize(content) == normalize(state.content)) {
          console.log('paste allowed');
          return true;
        }
        console.log('paste forbidden');
        return false;

      };
      return fn;
    },

    getTextContent: state => {

      /**
       * Get the text value of a content
       *
       * @param {string} content
       * @return {string}
       */
      const fn = function (content) {
        return textify(content);
      };
      return fn;
    },
  },

  actions: {

    async clearStorage() {
      this.$reset();
    },

    /**
     * Set the allowed clipboard content
     * @param content
     */
    setContent(content) {
      console.log('copy: ', content);
      this.content = content;
    },

    showWarning() {
      this.show_warning = true;
    },

    hideWarning() {
      this.show_warning = false;
    },

  }
});
