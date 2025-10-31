<script setup>
/**
 * Editing of an essay with TinyMCE
 * @see https://www.tiny.cloud/docs/tinymce/latest/vite-es6-npm/
 */
import tinymce from 'tinymce';
import 'tinymce/icons/default/icons.min.js';
import 'tinymce/themes/silver/theme.min.js';
import 'tinymce/models/dom/model.min.js';

import 'tinymce/skins/ui/oxide/skin.js';
import 'tinymce/skins/ui/oxide/content.js';
import 'tinymce/skins/content/default/content.js';

import '@/plugins/tiny_de.js';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/table';
import 'tinymce/plugins/pagebreak';

import Editor from '@tinymce/tinymce-vue'
import TinyHelper from '@/lib/TinyHelper';

import {stores} from "@/store";
import {nextTick, watch} from 'vue';

const essayStore = stores.essay();
const settingsStore = stores.settings();
const preferencesStore = stores.preferences();
const layoutStore = stores.layout();
const tasksStore = stores.tasks();

const props = defineProps(['taskKey', 'essayKey']);

const helper = new TinyHelper('app-essay-' + props.essayKey);

watch(() => settingsStore.contentClass, helper.applyFormat.bind(helper));
watch(() => preferencesStore.editor_zoom, helper.applyZoom.bind(helper));
watch(() => layoutStore.focusChange, handleFocusChange);

async function handleFocusChange() {
  if (layoutStore.focusTarget == 'right' && layoutStore.isEssayVisible
      && tasksStore.currentKey == props.taskKey) {
    helper.applyFocus();
    await nextTick();
    helper.restoreScrolling();
  }
}

function handleInit() {
  helper.init();
}

function handleChange() {
  essayStore.updateContent(props.essayKey);
  helper.applyZoom();
  helper.applyWordCount();
}

function handleKeyUp() {
  essayStore.updateContent(props.essayKey);
  helper.applyWordCount();
}

</script>

<template>
  <div id="app-essay-edit-wrapper">
    <label for="app-essay" class="hidden">{{ $t("editEssayHiddenField") }}</label>
    <div class="tinyWrapper">
      <editor
          :id="'app-essay-' + props.essayKey"
          v-model="essayStore.editEssays[props.essayKey].content"
          @init="handleInit"
          @change="handleChange"
          @keyup="handleKeyUp"
          @keydown="layoutStore.handleKeyDown"
          @copy="helper.handleCopy"
          @cut="helper.handleCopy"
          @scroll="helper.saveScrolling"
          licenseKey = 'gpl'
          :init="helper.getInit()"
      />
    </div>
    <div v-show="preferencesStore.word_count_enabled" class="wordCountWrapper">
      <v-btn variant="text" size="small" @click="preferencesStore.toggleWordCountCharacters()"
             :text="preferencesStore.word_count_characters ? $t('allNumCharacters', helper.characterCount.value) : $t('allNumWords' , helper.wordCount.value) ">
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
#app-essay-edit-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tinyWrapper {
  flex-grow: 1;
}

.wordCountWrapper {
  height: 30px;
  border: 1px solid #cccccc;
  border-top: 0;
  font-size: 16px;
}

</style>
