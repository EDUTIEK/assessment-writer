<script setup>
/**
 * Selector and container for editig contents (annotations, essay, notes)
 * Shown in the right column of the page
 */
import Annotations from "@/components/Annotations.vue";
import EditEssay from "@/components/EditEssay.vue";
import EditNote from "@/components/EditNote.vue";
import Task from "@/data/Task";
import {stores} from "@/store";
import { ref, watch } from "vue";

const layoutStore = stores.layout();
const essayStore = stores.essay();
const notesStore = stores.notes();
const settingsStore = stores.settings();
const preferencesStore = stores.preferences();
const annotationsStore = stores.annotations();
const resourcesStore = stores.resources();
const tasksStore = stores.tasks();

const selectedEditor = ref('essay');
updateSelectedEditor();

function updateSelectedEditor() {
  switch (layoutStore.rightContent) {
    case 'annotations':
      selectedEditor.value = 'annotations';
      break
    case 'essay':
      selectedEditor.value = 'essay';
      break;
    case 'notes':
      selectedEditor.value = notesStore.activeKey;
      break;
  }
}

function handleTaskChange() {
  notesStore.handleTaskChange();
  updateSelectedEditor();
}

watch(() => layoutStore.rightContent, updateSelectedEditor);
watch(() => notesStore.activeKey, updateSelectedEditor);
watch(() => tasksStore.currentKey, handleTaskChange);

function selectEditor() {

  switch (selectedEditor.value) {

    case undefined:
      updateSelectedEditor();
      break;

    case 'annotations':
      layoutStore.showAnnotations();
      break;

    case 'essay':
      layoutStore.showEssay();
      break;

    default:
      layoutStore.showNotes();
      notesStore.activeKey = selectedEditor.value;
      break;
  }
}

function showAnnotations() {
  selectedEditor.value = 'annotations';
  selectEditor();
}
watch(() => annotationsStore.selectionChange, showAnnotations);

</script>


<template>
  <div id="app-edit-select-wrapper">
    <div class="appEditChoices">
      <v-btn-toggle v-if="settingsStore.hasNotes || tasksStore.hasInstructions || resourcesStore.hasAnnotatableResource" density="comfortable" variant="outlined" divided
                    v-model="selectedEditor" @click="selectEditor()">
        <v-btn v-if = "tasksStore.hasInstructions || resourcesStore.hasAnnotatableResource" aria-labelledby="app-edit-select-annotations" size="small"
               value="annotations">
          <v-icon icon="mdi-marker"></v-icon>
          <span class="sr-only" id="app-edit-select-annotations">{{ $t("allAnnotations") }}</span>
          <span aria-hidden="true">{{ $t("allAnnotations") }}</span>
        </v-btn>
        <v-btn aria-labelledby="app-edit-select-text" size="small"
               value="essay">
          <v-icon icon="mdi-file-edit-outline"></v-icon>
          <span class="sr-only" id="app-edit-select-text">{{ $t("editSelectEditText") }}</span>
          <span aria-hidden="true">{{ $t('editSelectText') }}</span>
        </v-btn>
        <v-btn size="small"
               v-for="note in notesStore.currentNotes"
               :aria-labelledby="'app-edit-select-note' + note.note_no"
               :key="note.getKey()"
               :value="note.getKey()">
          <v-icon icon="mdi-clipboard-outline"></v-icon>
          <span class="sr-only"
                :id="'app-edit-select-note' + note.note_no">{{ settingsStore.notice_boards == 1 ? $t("editSelectEditNotes") : $t("editSelectEditNote", [note.note_no + 1]) }}</span>
          <span
              aria-hidden="true">{{ settingsStore.notice_boards == 1 ? $t("editSelectNotes") : note.note_no + 1 }}</span>
        </v-btn>
      </v-btn-toggle>
      &nbsp;
      <span aria-hidden="true" v-if="settingsStore.hasNotes">&nbsp;</span>
      <v-btn-group density="comfortable" variant="outlined" divided>
        <v-btn :title="$t('editSelectZoomOut')" size="small" icon="mdi-magnify-minus-outline"
               @click="preferencesStore.zoomEditorOut()"></v-btn>
        <v-btn :title="$t('editSelectZoomIn')" size="small" icon="mdi-magnify-plus-outline"
               @click="preferencesStore.zoomEditorIn()"></v-btn>
        <v-btn
            :title="preferencesStore.word_count_enabled ? $t('editSelectCounterHide') : $t('editSelectCounterShow')" size="small"
            :icon="preferencesStore.word_count_enabled ? 'mdi-numeric' : 'mdi-numeric-off'"
            @click="preferencesStore.toggleWordCountEnabled()">
        </v-btn>
      </v-btn-group>
    </div>
    <!-- Ally: use v-show to keep cursor at position when editors are switched -->
    <annotations class="appEditors" v-show="layoutStore.isAnnotationsSelected"></annotations>
    <edit-essay class="appEditors"
      v-for="essay in essayStore.essays"
      v-show="layoutStore.isEssaySelected && tasksStore.currentKey == Task.buildKey(essay.task_id)"
      :key="essay.getKey()"
      :essayKey="essay.getKey()"
      :taskKey="Task.buildKey(essay.task_id)"
    >
    </edit-essay>
    <edit-note class="appEditors"
      v-for="note in notesStore.notes"
      v-if="settingsStore.notice_boards > 0"
      v-show="layoutStore.isNotesSelected && notesStore.activeKey == note.getKey()"
      :key="note.getKey()"
      :noteKey="note.getKey()"
      :noteLabel="settingsStore.notice_boards == 1 ? $t('editSelectEditNotes') : $t('editSelectEditNote', note.note_no + 1)"
    >
    </edit-note>
  </div>
</template>


<style scoped>

#app-edit-select-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.appEditChoices {
  text-align: center;
  padding-bottom: 5px;
}

.appEditors {
  flex-grow: 1;
}
</style>
