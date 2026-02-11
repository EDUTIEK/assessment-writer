/**
 * Settings Store
 * Handles the editor settings of the assessment
 */
import i18n from "@/plugins/i18n";
import {getStorage} from "@/lib/Storage";
import {defineStore} from 'pinia';

import contentLocalCss from '@/styles/content.css?inline';
import headlinesSingleCss from '@/styles/headlines-single.css?inline';
import headlinesThreeCss from '@/styles/headlines-three.css?inline';
import headlinesNumericCss from '@/styles/headlines-numeric.css?inline';
import headlinesEdutiekCss from '@/styles/headlines-edutiek.css?inline';

const storage = getStorage('settings');
const { t } = i18n.global

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

    tinyToolbar(state) {
      switch (state.formatting_options) {
        case 'full':
          return 'undo redo styles bold italic underline bullist numlist removeformat charmap wordcount';
        case 'medium':
          return 'undo redo bold italic underline bullist numlistremoveformat charmap wordcount';
        case 'minimal':
          return 'undo redo bold italic underline removeformat charmap wordcount';
        case 'none':
        default:
          return 'undo redo charmap wordcount';
      }
    },

    /**
     * @see https://www.tiny.cloud/docs/configure/content-filtering/#valid_elements
     */
    tinyValidElements(state) {
      switch (state.formatting_options) {
        case 'extended':
          return '@[style|border|colspan|rowspan],'
            + 'p/div,br,strong/b,em/i,u,s,ol,ul,li,h1,h2,h3,h4,h5,h6,pre,code,blockquote,span,sub,sup,table,thead,tbody,th,tr,td,hr,'
            + 'img[class<mce-pagebreak|src|data-mce-resize|data-mce-placeholder|data-mce-selected]';
        case 'full':
          return 'p/div,br,strong/b,em/i,u,ol,ul,li,h1,h2,h3,h4,h5,h6,pre';
        case 'medium':
          return 'p/div,br,strong/b,em/i,u,ol,ul,li';
        case 'minimal':
          return 'p/div,p/li,br,strong/b,em/i,u';
        case 'none':
        default:
          return 'p/div,p/li,br';
      }
    },

    tinyValidStyles(state) {
      switch (state.formatting_options) {
        case 'extended':
          return {
            '*': 'background-color,color,text-align,mce-pagebreak,padding-left'
          };
        default:
          return {};
      }
    },

    tinyH1Size(state) {
      return state.headline_scheme == 'three' ? 1.3 : 1;
    },
    tinyH2Size(state) {
      return state.headline_scheme == 'three' ? 1.15 : 1;
    },

    tinyStyleFormats(state) {

      const headings = {title: t('settingsHeadings'), items: [] };
      switch (state.headline_scheme) {
        case 'single':
          headings.items = [
            { title: t('settingsHeadings'), format: 'h1' },
          ];
          break;
        case 'three':
          headings.items = [
            { title: t('settingsHeading1'), format: 'h1' },
            { title: t('settingsHeading2'), format: 'h2' },
            { title: t('settingsHeading3'), format: 'h3' },
          ];
          break;
        default:
          headings.items = [
            { title: t('settingsHeading1'), format: 'h1' },
            { title: t('settingsHeading2'), format: 'h2' },
            { title: t('settingsHeading3'), format: 'h3' },
            { title: t('settingsHeading4'), format: 'h4' },
            { title: t('settingsHeading5'), format: 'h5' },
            { title: t('settingsHeading6'), format: 'h6' },
          ];
      }

      const inline = {title: t('settingsInline'), items: [] };
      switch (state.formatting_options) {
        case 'extended':
          inline.items = [
            { title: t('settingsBold'), format: 'bold' },
            { title: t('settingsItalic'), format: 'italic' },
            { title: t('settingsUnderline'), format: 'underline' },
            { title: t('settingsStrikethrough'), format: 'strikethrough' },
            { title: t('settingsSuperscript'), format: 'superscript' },
            { title: t('settingsSubscript'), format: 'subscript' },
            { title: t('settingsCode'), format: 'code' }
          ];
          break;
        case 'full':
        case 'medium':
        case'minimal':
          inline.items = [
            { title: t('settingsBold'), format: 'bold' },
            { title: t('settingsItalic'), format: 'italic' },
            { title: t('settingsUnderline'), format: 'underline' },
          ];
          break;
      }

      const blocks = { title: t('settingsBlocks'), items: [] };
      switch (state.formatting_options) {
        case 'extended':
          blocks.items = [
            { title: t('settingsParagraph'), format: 'p' },
            { title: t('settingsBlockquote'), format: 'blockquote' },
            { title: t('settingsTypewriter'), format: 'pre' },
          ];
          break;
        case 'full':
          blocks.items = [
            { title: t('settingsParagraph'), format: 'p' },
            { title: t('settingsTypewriter'), format: 'pre' },
          ];
          break;
        case 'medium':
        case 'minimal':
          blocks.items = [
            { title: t('settingsParagraph'), format: 'p' },
          ];
          break;
      }

      const align = { title: t('settingsAlign'), items: [] };
      switch (state.formatting_options) {
        case 'extended':
         align.items = [
            { title: t('settingsAlignLeft'), format: 'alignleft' },
            { title: t('settingsAlignCenter'), format: 'aligncenter' },
            { title: t('settingsAlignRight'), format: 'alignright' },
            { title: t('settingsAlignJustify'), format: 'alignjustify' }
          ];
          break;
      }

      const formats = [];
      if (headings.items.length) {
        formats.push(headings);
      }
      if (inline.items.length) {
        formats.push(inline);
      }
      if (blocks.items.length) {
        formats.push(blocks);
      }
      if (align.items.length) {
        formats.push(align);
      }

      return formats;
    },

    /**
     * @see https://www.tiny.cloud/docs/configure/content-formatting/#formats
     */
    tinyFormats(state) {
      return {
        underline: { inline: 'u', remove: 'all' },
        strikethrough: { inline: 's', remove: 'all' }
      }
    },

    tinyContentStyle(state) {
      const baseStyle = contentLocalCss.toString();

      switch (state.headline_scheme) {
        case 'single':
          return baseStyle + '\n' + headlinesSingleCss.toString();
        case 'three':
          return baseStyle + '\n' + headlinesThreeCss.toString();
        case 'numeric':
          return baseStyle + '\n' + headlinesNumericCss.toString();
        case 'edutiek':
          return baseStyle + '\n' + headlinesEdutiekCss.toString();
        default:
          return baseStyle;
      }
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
