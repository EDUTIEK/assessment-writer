<script setup>
/**
 * List of annotations shown on the right side of the screen
 */
import AnnotationInput from '@/components/AnnotationInput.vue';
import Annotation from "@/data/Annotation";
import {stores} from "@/store";
import {nextTick, watch} from 'vue';

const annotationsStore = stores.annotations();
const layoutStore = stores.layout();
const resourcesStore = stores.resources();

function annotationsPossible() {
  const id = layoutStore.selectedResourceId;
  if (id === Annotation.RESOURCE_ID_INSTRUCTIONS) {
    return true;
  }
  const resource = resourcesStore.getResourceById(id);
  if (resource && resource.canBeAnnoteted()) {
    return true;
  }
  return false;
}

/**
 * Focus the currently selected annotation
 */
async function focusSelected() {
  await nextTick();
  let el = document.getElementById('appAnnotationContainer' + annotationsStore.selectedKey);
  if (el) {
    let tx = el.querySelector('textarea');
    if (tx) {
      tx.focus();
    }
  }
}

watch(() => annotationsStore.selectionChange, focusSelected);
watch(() => layoutStore.focusChange, focusSelected);


/**
 * Set the scrolling so that the complete annotation is visible
 */
async function scrollToFirstVisible() {
  await nextTick();
  let el = document.getElementById('appAnnotationContainer' + annotationsStore.firstVisibleKey);
  if (el) {
    el.scrollIntoView();
  }
}

watch(() => annotationsStore.firstVisibleKey, scrollToFirstVisible);

</script>

<template>

  <div id="appAnnotations">
    <div v-show="layoutStore.isAnnotationsSelected && !annotationsPossible()">
      <br />
      <v-alert>{{ $t('annotationsNoContentSelected') }}</v-alert>
    </div>
    <AnnotationInput
        v-show="layoutStore.isAnnotationsSelected && annotationsPossible()"
        v-for="annotation in annotationsStore.activeAnnotations"
        :key="annotation.getKey()" :annotation="annotation"></AnnotationInput>
  </div>
</template>

<style scoped>

#appAnnotations {
  overflow-y: scroll;
  overflow-x: clip;
}

</style>
