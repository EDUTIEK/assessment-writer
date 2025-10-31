<script setup>
/**
 * Editing of a writing notice with TinyMCE
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

const notesStore = stores.notes();
const settingsStore = stores.settings();
const preferencesStore = stores.preferences();
const layoutStore = stores.layout();

const props = defineProps(['noteKey', 'noteLabel']);
const helper = new TinyHelper('app-note-' + props.noteKey);

watch(() => settingsStore.contentClass, helper.applyFormat.bind(helper));
watch(() => preferencesStore.editor_zoom, helper.applyZoom.bind(helper));
watch(() => layoutStore.focusChange, handleFocusChange);

async function handleFocusChange() {
  if (layoutStore.focusTarget == 'right' && layoutStore.isNotesSelected
      && notesStore.activeKey == props.noteKey) {
    helper.applyFocus();
    await nextTick();
    helper.restoreScrolling();
  }
}

function handleInit() {
  helper.init();
}

function handleChange() {
  notesStore.updateContent(props.noteKey);
  helper.applyZoom();
  helper.applyWordCount();
}

function handleKeyUp() {
  notesStore.updateContent(props.noteKey);
  helper.applyWordCount();
}

</script>

<template>
  <div id="app-note-edit-wrapper">
    <label class="hidden" :for="'app-note-' + props.noteKey">{{ $t('editNoteHiddenField', [props.noteLabel]) }}</label>
    <div class="tinyWrapper">
      <editor
          :id="'app-note-' + props.noteKey"
          v-model="notesStore.editNotes[props.noteKey].note_text"
          @init="handleInit"
          @change="handleChange"
          @keyup="handleKeyUp"
          @keydown="layoutStore.handleKeyDown"
          @copy="helper.handleCopy"
          @cut="helper.handleCopy"
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
#app-note-edit-wrapper {
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
