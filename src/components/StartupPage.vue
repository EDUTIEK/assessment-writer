<script setup>
/**
 * Page shown before the application is funny initialized
 * - shows a loading message by default
 * - shows error dialogs
 * - allows to quit the application
 */
import {stores} from "@/store";

const apiStore = stores.api();
</script>

<template>
  <v-main fill-height>

    <v-app-bar elevation="1" color="white" density="compact">
      <p>{{ $t('startupPageLoadData') }}</p>
      <v-spacer></v-spacer>
      <v-btn :href="apiStore.returnUrl">
        <v-icon left icon="mdi-logout-variant"></v-icon>
        <span>{{ $t('allEnd') }}</span>
      </v-btn>
    </v-app-bar>

    <v-dialog persistent v-model="apiStore.showInitFailure">
      <v-card>
        <v-card-text>
          <p>{{ $t('startupPageLoadError') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-btn :href="apiStore.returnUrl">
            <v-icon left icon="mdi-logout-variant"></v-icon>
            <span>{{ $t('allEnd') }}</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog persistent v-model="apiStore.showReplaceConfirmation">
      <v-card>
        <v-card-text>
          <p>{{ $t('startupPageOverwriteInfo') }}</p>
          <p>{{ $t('startupPageOverwriteQuestion') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="apiStore.loadDataFromBackend()">
            <v-icon left icon="mdi-reload"></v-icon>
            <span>{{ $t('allLoad') }}</span>
          </v-btn>
          <v-btn :href="apiStore.returnUrl">
            <v-icon left icon="mdi-logout-variant"></v-icon>
            <span>{{ $t('allCancel') }}</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog persistent v-model="apiStore.showReloadConfirmation">
      <v-card>
        <v-card-text>
          <p>{{ $t('startupPageReloadInfo')}}</p>
          <p>{{ $t('startupPageReloadQuestion') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="apiStore.loadDataFromBackend()">
            <v-icon left icon="mdi-reload"></v-icon>
            <span>{{ $t('allLoad') }}</span>
          </v-btn>
          <v-btn :href="apiStore.returnUrl">
            <v-icon left icon="mdi-logout-variant"></v-icon>
            <span>{{ $t('allCancel') }}</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-main>
</template>


<style scoped>

</style>