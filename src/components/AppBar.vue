<script setup>
/**
 * Main application bar on top of the screen
 */
import Alerts from "@/components/Alerts.vue";
import Help from "@/components/Help.vue";
import Tasks from "@/components/Tasks.vue";
import Timer from "@/components/Timer.vue";
import {stores} from "@/store";
import {nextTick, watch} from 'vue';

const apiStore = stores.api();
const writerStore = stores.writer();
const alertStore = stores.alert();
const essayStore = stores.essay();
const layoutStore = stores.layout();

async function handleFocusChange() {
  if (layoutStore.focusTarget == 'header') {
    await nextTick();
    for (const element of document.getElementsByClassName('app-header-item')) {
      element.focus();
      break;
    }
  }
}

watch(() => layoutStore.focusChange, handleFocusChange);

function getTitle() {
  return (writerStore.writer_name == null ? '' : writerStore.writer_name);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeWriter() {
  await essayStore.checkUpdates(true);
  await apiStore.saveChangesToBackend(true);
  window.location = apiStore.returnUrl;
}

async function openReview() {
  await essayStore.checkUpdates(true);
  await nextTick();
  layoutStore.setReview(true);
}

</script>

<template>
  <v-app-bar elevation="1" color="white" density="compact">
    <v-app-bar-title>{{ getTitle() }}</v-app-bar-title>
    <tasks></tasks>
    <v-spacer></v-spacer>

    <help></help>
    <alerts v-if="alertStore.hasAlerts"></alerts>
    <timer v-if="writerStore.hasWritingEnd"></timer>

    <v-btn class="app-header-item" v-show="!layoutStore.isReview" @click="closeWriter">
      <v-icon left icon="mdi-pause"></v-icon>
      <span>{{ $t("appBarInterrupt") }}</span>
    </v-btn>

    <v-btn class="app-header-item" v-show="!layoutStore.isReview" @click="openReview">
      <v-icon left icon="mdi-eye"></v-icon>
      <span>{{ $t("appBarReview") }}</span>
    </v-btn>

  </v-app-bar>

</template>
