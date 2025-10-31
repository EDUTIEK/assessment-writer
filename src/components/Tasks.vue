<script setup>
/**
 * Selection of partial task shown in the app bar
 */
import {stores} from "@/store";
import { nextTick, ref } from 'vue';

const tasksStore = stores.tasks();

const menuOpen = ref(false);
const selectionShown = ref(false);
const selectedKey = ref('');

async function showSelection() {
  await nextTick();
  if (menuOpen.value) {
    selectionShown.value = true;
    selectedKey.value = '';
  }
}

async function selectTask() {
  menuOpen.value = false;
  tasksStore.selectTask(selectedKey.value);
}

</script>

<template>

  <v-btn class="app-header-item"  :disabled="tasksStore.currentKey == tasksStore.firstKey"
         @click="tasksStore.selectTask(tasksStore.previousKey)">
    <v-icon left icon="mdi-arrow-left-bold"></v-icon>
    <span class="sr-only">{{ $t('tasksPreviousTask') }}</span>
  </v-btn>

  <v-btn class="app-header-item" id="app-tasks-menu-activator">
    <span v-show="tasksStore.currentKey !== null">
       {{ tasksStore.currentTask.title }}
      </span>
  </v-btn>

  <v-menu v-model="menuOpen" activator="#app-tasks-menu-activator"
          :close-on-content-click="false" @update:modelValue="showSelection()">
    <v-autocomplete
        id="app-items-autocomplete"
        v-if="selectionShown"
        v-model="selectedKey"
        :items="tasksStore.sortedTasks"
        :menu=true
        item-title="title"
        item-value="key"
        autofocus
        auto-select-first
        class="flex-full-width"
        density="comfortable"
        item-props
        menu-icon=""
        :placeholder="$t('tasksTasks')"
        prepend-inner-icon="mdi-magnify"
        theme="light"
        variant="solo"
        @update:modelValue="selectTask()"
    ></v-autocomplete>
  </v-menu>

  <v-btn class="app-header-item" :disabled="tasksStore.currentKey == tasksStore.lastKey"
         @click="tasksStore.selectTask(tasksStore.nextKey)">
    <v-icon left icon="mdi-arrow-right-bold"></v-icon>
    <span class="sr-only">{{ $t('tasksNextTask') }}</span>
  </v-btn>
</template>

<style scoped>

</style>