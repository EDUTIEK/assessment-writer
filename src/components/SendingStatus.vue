<script setup>

import {useApiStore} from "@/store/api";
import {useLayoutStore} from "@/store/layout";
import {useEssayStore} from "@/store/essay";
import {useTasksStore} from "@/store/tasks";
import {useWriterStore} from "@/store/writer";
import {useChangesStore} from "@/store/changes";
import {ref} from "vue";
import FileHandling from "@/lib/FileHandling";
import SendingResult from "@/data/SendingResult";

const apiStore = useApiStore();
const layoutStore = useLayoutStore();
const essayStore = useEssayStore();
const tasksStore = useTasksStore();
const writerStore = useWriterStore();
const changesStore = useChangesStore();
const fileHandling = new FileHandling();

const showSending = ref(false);
const showFailure = ref(false);
const sendingResult = ref(new SendingResult());

/**
 * Format a timestamp as string like '2022-02-21 21:22'
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function openPopup() {
  showSending.value = false;
  showFailure.value = false;
  sendingResult.value = new SendingResult();
  layoutStore.showSendingStatus = true;
}

function closePopup() {
  layoutStore.showSendingStatus = false;
}

async function sendUpdate() {
  showFailure.value = false;
  showSending.value = true;

  const result1 = await essayStore.sendUpdate(true);
  if (result1 && !result1.success) {
    sendingResult.value = result1;
    showSending.value = false;
    showFailure.value = true;
    return;
  }

  const result2 = await apiStore.saveChangesToBackend(true);
  if (result2 && !result2.success) {
    sendingResult.value = result2;
    showSending.value = false;
    showFailure.value = true;
    return;
  }

  showSending.value = false;
}

async function downloadEssay() {
  const blob = new Blob([essayStore.currentContent], { type: 'text/html' });
  await fileHandling.saveFile(blob, writerStore.writer_name + '.html');
}

</script>

<template>

  <v-list tabindex="-1">
    <v-list-item
        tabindex="-1"
        @click = "openPopup()"
        :aria-label="apiStore.isSending ? $t('sendingStatusSending') : (apiStore.isAllSent ? $t('sendingStatusAllSent') : $t('sendingStatusOpenSendings'))"
        :title="apiStore.isSending ? $t('sendingStatusSending') : (apiStore.isAllSent ? $t('sendingStatusAllSent') : $t('sendingStatusOpenSendings'))"
    >
      <template v-slot:prepend>
        <v-icon aria-role="hidden"
                :icon="apiStore.isSending ? 'mdi-cloud-upload' : (apiStore.isAllSent ? 'mdi-cloud-check-outline' : 'mdi-cloud-outline')"></v-icon>
      </template>
    </v-list-item>

    <v-dialog v-model="layoutStore.showSendingStatus" max-width="1000">
      <v-card>
        <v-card-text>
          <v-alert v-show="showSending">{{ $t('sendingStatusSending') }}</v-alert>
          <v-alert v-show="showFailure">{{ $t('sendingStatusError') }}
            <br>{{sendingResult.message}}
            <br>{{sendingResult.details}}
          </v-alert>
          <h3>{{ $t('sendingStatusWritingSteps') }}</h3>
          <v-container>
            <v-row>
              <v-col cols="6">
                {{ $t('sendingStatusLastBrowserSave') }}
              </v-col>
              <v-col cols="6">
                {{essayStore.lastSave > 0 ? formatTimestamp(essayStore.lastSave) : 'keine'}}
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                {{ $t('sendingStatusLastSending') }}
              </v-col>
                <v-col cols="6">
                {{essayStore.lastSendingSuccess > 0 ? formatTimestamp(essayStore.lastSendingSuccess) : 'keine'}}
              </v-col>
            </v-row>
              <v-row>
                <v-col cols="6">
                  {{ $t('sendingStatusStatus') }}
              </v-col>
              <v-col cols="6">
                {{essayStore.openSendings > 0 ? (essayStore.openSendings  + ' noch nicht übertragen') : 'alle sind übertragen' }}
              </v-col>
            </v-row>
          </v-container>
          <h3>{{ $t('sendingStatusOtherChanges') }}</h3>
          <v-container>
            <v-row>
              <v-col cols="6">
                {{ $t('sendingStatusLastBrowserSave') }}
              </v-col>
              <v-col cols="6">
                {{changesStore.lastSave > 0 ? formatTimestamp(changesStore.lastSave) : $t('sendingStatusNone')}}
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                {{ $t('sendingStatusLastSending') }}
              </v-col>
              <v-col cols="6">
                {{changesStore.lastSendingSuccess > 0 ? formatTimestamp(changesStore.lastSendingSuccess) : $t('sendingStatusNone')}}
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                {{ $t('sendingStatusStatus') }}
              </v-col>
              <v-col cols="6">
                {{changesStore.countChanges > 0 ? $t('sendingStatusNumNotSent', changesStore.countChanges) : 'alle sind übertragen' }}
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="sendUpdate()">
            <v-icon left icon="mdi-file-send-outline"></v-icon>
            <span>{{ $t('sendingStatusSend') }}</span>
          </v-btn>
          <v-btn @click="downloadEssay()">
            <v-icon left icon="mdi-file-download-outline"></v-icon>
            <span>{{ $t('sendingStatusExport') }}</span>
          </v-btn>
          <v-btn @click="closePopup()">
            <v-icon left icon="mdi-close"></v-icon>
            <span>{{ $t('allClose') }}</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-list>

</template>

<style scoped>

</style>