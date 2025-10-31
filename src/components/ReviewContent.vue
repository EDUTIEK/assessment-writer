<script setup>
/**
 * Review the written texts before authorization
 * - shown below the app bar
 *  - an be manually opend
 *  - is automatically shown when writing tile is over
 *  - allows to send the final authorization
 */
import Task from "@/data/Task";
import i18n from "@/plugins/i18n";
import {clearAllStores, stores} from "@/store";
import {useApiStore} from "@/store/api";
import {ref} from "vue";

const apiStore = stores.api();
const configStore = stores.config();
const essayStore = stores.essay();
const notesStore = stores.tasks();
const writerStore = stores.writer();
const settingsStore = stores.settings();
const preferencesStore = stores.preferences();
const changesStore = stores.changes();
const tasksStore = stores.tasks();
const layoutStore = stores.layout();

const { t } = i18n.global;

const showFinalizeFailure = ref(false);
const showAsAuthorizeFailure = ref(false);

/**
 * Build the headline to be shown
 */
function headline(addition = '') {
  const head = (tasksStore.taskIds > 0) ? t('allEssay') :  tasksStore.currentTask.title;
  return addition ? (head +  ' - ' + addition) : head;
}

/**
 * Finalize the writing
 * - send the written content to the server
 * - clear data and return to the backend
 * @param {boolean} authorize the final content should be authorized for correction
 */
async function finalize(authorize) {
  console.log('authorize', authorize);
  const result = await apiStore.saveFinalContentToBackend(authorize);
  console.log(result);
  if (!result.success || authorize && !writerStore.isAuthorized) {
    showFinalizeFailure.value = true;
    showAsAuthorizeFailure.value = authorize;
    return;
  }

  await clearAllStores();
  window.location = apiStore.returnUrl
}

/**
 * Retry sending the final content
 * - should not authorize and close the writer
 * - Instead the review screen is shown again and allows to authorize
 */
async function retry() {
  const result = apiStore.saveFinalContentToBackend(false);
  if (!result.success) {
    showFinalizeFailure.value = true
    showAsAuthorizeFailure.value = false
  }
}
</script>

<template>
  <v-main fill-height>
      <div class="column" v-if="changesStore.hasWritingChanges">
        <div class="col-header bg-grey-lighten-4">
          <h2 class="text-h6" style="color:#f00000;">{{ headline($t('reviewContentNotYetSent')) }}</h2>
          <p>{{ $t('reviewContentTryAgainLater') }}</p>
        </div>

        <div class="col-content">
          <div
              v-for="essay in essayStore.essays"
              v-show="tasksStore.currentKey == Task.buildKey(essay.task_id)"
              :class="'long-essay-content ' + settingsStore.contentClass"
              :style="'font-size:' + (preferencesStore.editor_zoom) + 'rem;'"
              v-html="essay.content"
          ></div>
        </div>

        <div class="col-footer bg-grey-lighten-4">
          <v-btn class="ma-2" :color="configStore.primaryColorCss" @click="retry()">
            <v-icon :color="configStore.primaryTextColorCss" icon="mdi-refresh"></v-icon>
            <span :style="configStore.primaryTextColorFullCss">{{ $t('reviewContentTryAgain') }}</span>
          </v-btn>
          <v-btn class="ma-2" @click="layoutStore.setReview(false)"
                 v-show="!writerStore.writingEndReached && !writerStore.isExcluded">
            <v-icon icon="mdi-file-edit-outline"></v-icon>
            <span>{{ $t('reviewContentContinueEditing') }}</span>
          </v-btn>
        </div>
      </div>

      <div class="column" v-if="!changesStore.hasWritingChanges">
        <div class="col-header bg-grey-lighten-4" v-show="writerStore.isExcluded">
          <h2 class="text-h6">{{ headline($t('reviewContentExcluded'))}}</h2>
          <p>{{ $t('reviewContentEditingPrevented') }}</p>
        </div>
        <div class="col-header bg-grey-lighten-4" v-show="writerStore.writingEndReached && !writerStore.isExcluded">
          <h2 class="text-h6">{{ headline($t('reviewContentTimeOver')) }}</h2>
          <p>{{ $t('reviewContentEditingPrevented') }} {{$t('reviewContentPleaseCheckText') }} {{ $t('reviewContentYouMayScroll') }}
            <span v-if="notesStore.hasWrittenNotes">{{ $t('reviewContentNotesWillBePurged')}}</span></p>
        </div>
        <div class="col-header bg-grey-lighten-4" v-show="!writerStore.writingEndReached && !writerStore.isExcluded">
          <h2 class="text-h6">{{ headline() }}</h2>
          <p>{{$t('reviewContentPleaseCheckText') }} {{ $t('reviewContentYouMayScroll') }}
            <span v-if="notesStore.hasWrittenNotes">{{ $t('reviewContentNotesWillBePurged')}}</span>
            {{ $t('reviewContentAuthorizationFinishes') }}</p>
        </div>

        <div class="col-content">
          <div
              v-for="essay in essayStore.essays"
              v-show="tasksStore.currentKey == Task.buildKey(essay.task_id)"
              :class="'long-essay-content ' + settingsStore.contentClass"
              :style="'font-size:' + (preferencesStore.editor_zoom) + 'rem;'"
              v-html="essay.content"
          ></div>
        </div>

        <div class="col-footer bg-grey-lighten-4">
          <v-btn class="ma-2 primary" @click="finalize(true)" :color="configStore.primaryColorCss"
                 v-show="!writerStore.isExcluded">
            <v-icon :color="configStore.primaryTextColorCss" icon="mdi-file-send-outline"></v-icon>
            <span :style="configStore.primaryTextColorFullCss">{{ $t('reviewContentAuthorize', tasksStore.countTasks) }}</span>
          </v-btn>
          <v-btn class="ma-2" @click="finalize(false)"
                 v-show="writerStore.writingEndReached || writerStore.isExcluded">
            <v-icon icon="mdi-logout-variant"></v-icon>
            <span>{{ $t('reviewContentDontAuthorize') }}</span>
          </v-btn>
          <v-btn class="ma-2" @click="layoutStore.setReview(false)"
                 v-show="!writerStore.writingEndReached && !writerStore.isExcluded">
            <v-icon icon="mdi-file-edit-outline"></v-icon>
            <span>{{ $t('reviewContentContinueEditing') }}</span>
          </v-btn>
        </div>
      </div>

    <v-dialog max-width="1000" persistent v-model="showFinalizeFailure">
      <v-card>
        <v-card-text>
          <p>{{ $t('reviewContentNetworkProblem') }}</p>
          <p><br>{{ $t('reviewContentLeaveAndTryLater')}}</p>
          <p v-show="showAsAuthorizeFailure"><br>
            {{ $t('reviewContentCallSupervisionToAuthorize') }}
          </p>
          <p v-show="!showAsAuthorizeFailure"><br>
            {{ $t('reviewContentCallSupervisionForHelp') }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="showFinalizeFailure=false">
            <v-icon left icon="mdi-close"></v-icon>
            <span>{{ $t('allCloseMessage') }}</span>
          </v-btn>
          <v-btn :href="apiStore.returnUrl">
            <v-icon left icon="mdi-logout-variant"></v-icon>
            <span>{{ $t('reviewContentLeaveWithoutSending') }}</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-main>
</template>

<style scoped>

/* Structure */

.column {
  position: fixed;
  height: calc((100% - 50px));
  width: 100%;
  display: flex;
  flex-direction: column;
}

.col-header {
  padding: 10px;
  padding-left: 20px;
}

.col-content {
  flex-grow: 1;
  height: calc(100% - 200px);
  background-color: white;
  overflow-y: scroll;
  padding: 10px;
  padding-left: 20px;
  font-family: Serif;
}

.col-footer {
  padding: 20px;
  background-color: lightgray;
}

.review-text, p {
  max-width: 60em;
}


</style>
