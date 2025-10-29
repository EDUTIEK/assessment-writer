<script setup>
import { useApiStore } from '@/store/api';
import { useAnnotationsStore } from "@/store/annotations";
import { useLayoutStore } from '@/store/layout';
import {useClipboardStore} from "@/store/clipboard";
import {nextTick, onMounted, ref, watch} from 'vue';

const apiStore = useApiStore();
const annotationsStore = useAnnotationsStore();
const layoutStore = useLayoutStore();
const clipboardStore = useClipboardStore();

const props = defineProps(['annotation']);
const annotation = props.annotation;

function isSelected(annotation) {
  return annotation.getKey() == annotationsStore.selectedKey;
}

/**
 * Ugly fix for accessibility issue in v-textarea component of vuetify
 */
onMounted(() => {
  const container = document.getElementById('appAnnotationContainer' + annotation.getKey());
  for (const label of container.getElementsByTagName('label')) {
    if (label.getAttribute('for').includes('app-annotation-')) {
      label.classList.add('sr-only');
      if (label.getAttribute('aria-hidden') == 'true') {
        if (!label.getAttribute('for').includes('-sizer')) {
          label.setAttribute('for', label.getAttribute('for') + '-sizer');
        }
      } else {
        label.setAttribute('id', 'app-annotation-' + annotation.getKey() + '-messages');
      }
    }
  }
  for (const textarea of container.getElementsByTagName('textarea')) {
    textarea.style.marginTop = '-15px';
    textarea.style.fontSize = '0.9rem';
  }
  for (const div of container.getElementsByClassName('v-input__details')) {
   div.style.display ='none';
  }
});


/**
 * Get the background color for the text field of a annotation
 * @param annotation
 * @return {string}
 */
function getBgColor(annotation) {
    return '#F5F7FB';
}

async function selectAnnotation(annotation) {
  annotationsStore.selectAnnotation(annotation.getKey());
}

async function handleTextKeydown() {
  if (event.altKey) {
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        layoutStore.showResourceForId(annotation.resource_id);
        await nextTick();
        annotationsStore.setCaretRequest();
        break;
      case "Delete":
        event.preventDefault();
        annotationsStore.deleteAnnotation(annotationsStore.selectedKey);
        break;
    }
  }
}

/**
 * Handle copy to the clipboard
 * @param {ClipboardEvent} event
 */
function handleCopy(event) {
  const textarea = document.getElementById('app-annotation-' + annotation.getKey());
  const content = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  clipboardStore.setContent(content);
  event.clipboardData.setData('text/html', content);
  event.preventDefault();
}

/**
 * Handle paste from the clipboard
 * @param event
 */
function handlePaste(event) {
  const content = (event.clipboardData || window.clipboardData).getData("text/html");
  if (!clipboardStore.getPasteAllowed(content)) {
    event.preventDefault();
    clipboardStore.showWarning();
    return;
  }
  const text = clipboardStore.getTextContent(content);
  const textarea = document.getElementById('app-annotation-' + annotation.getKey());
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  textarea.value = value.slice(0, start) + text + value.slice(end);
  textarea.focus();
  textarea.selectionStart = start + text.length;
  textarea.selectionEnd = start + text.length;
}

</script>

<template>
  <v-container :id="'appAnnotationContainer' + annotation.getKey()" :key="annotation.getKey()" class="annotationContainer">

    <v-row dense @click="annotationsStore.selectAnnotation(annotation.getKey())">

      <!-- label -->
      <v-col cols="1">
        <button tabindex="0"
                :class="'v-btn annotationLabel ' + (isSelected(annotation) ? 'selected' : '')"
        >
          {{ annotation.label }}
        </button>
      </v-col>

      <v-col cols="10" v-show="isSelected(annotation)">
        <v-textarea class="annotationInput" :bg-color="getBgColor(annotation)" rounded="0" density="compact" variant="solo"
                    :id="'app-annotation-' + annotation.getKey()"
                    :label="$t('annotationForMark', [annotation.label])"
                    rows="1" auto-grow
                    @change="annotationsStore.updateAnnotation(annotation)"
                    @keyup="annotationsStore.updateAnnotation(annotation)"
                    @keydown="handleTextKeydown()"
                    @copy="handleCopy"
                    @cut="handleCopy"
                    @paste="handlePaste"
                    v-model="annotation.comment">
        </v-textarea>
      </v-col>

      <v-col cols="10" v-show="!isSelected(annotation)">
        <div class="annotationDisplay"
             v-show="annotation.comment"
             :style="'background-color: ' + getBgColor(annotation) + ';'"
        >
          {{annotation.comment}}
        </div>
      </v-col>

      <!-- trash -->
      <v-col cols="1" class="trashColumn">
        <v-btn class="trashButton" density="compact" size="small" variant="text" prepend-icon="mdi-delete-outline"
               :tabindex="isSelected(annotation) ? 0 : -1"
               @click="annotationsStore.deleteAnnotation(annotation.getKey())"
               @keydown="handleTextKeydown()"
        >
          <span class="sr-only">{{ $t("annotationDelete", [annotation.label]) }}</span>
        </v-btn>
      </v-col>

    </v-row>
  </v-container>
</template>

<style scoped>

.v-container {
  padding: 0;
  margin: 0;
}

.v-row {
  font-size: 12px;
  padding: 0;
  margin: 0;
}

.v-col {
  font-size: 12px;
  padding: 0;
  margin: 0;
}

.annotationContainer {
  padding: 5px 0;
  border-bottom: 1px dotted gray;
}

.annotationLabel {
  font-size: 14px;
  padding: 3px;
}

.annotationLabel.selected {
  background-color: #606060;
  font-weight: bold;
  color: white;
}

.annotationInput {
  width: 100%;
  font-family: serif;
  margin-bottom: 5px;
}

.annotationDisplay {
  width: 100%;
  font-family: serif;
  font-size: 0.9rem;
  padding: 2px 15px;
  margin-bottom: 5px;
}

i {
  margin-top: -2px;
}

.trashColumn {
  position: relative;
}

.trashButton {
  position: absolute;
  bottom: 5px;
}

</style>
