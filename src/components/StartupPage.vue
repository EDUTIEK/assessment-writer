<script setup>
/**
 * Page shown before the application is funny initialized
 * - shows a loading message by default
 * - shows error dialogs
 * - allows to quit the application
 */
import {stores} from "@/store";

</script>

<template>
  <v-main fill-height>

    <v-app-bar elevation="1" color="white" density="compact">
      <v-app-bar-title>{{ $t('startupPageLoadData') }}</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn :href="stores.api().returnUrl">
        <v-icon left icon="mdi-logout-variant"></v-icon>
        <span>{{ $t('allEnd') }}</span>
      </v-btn>
    </v-app-bar>

    <v-dialog persistent  max-width="60em" v-model="stores.layout().hasInitFailure">
      <v-card>
        <v-card-title>
          {{ $t('startupPageLoadError') }}
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="text" color="#0000A0" >
            {{ stores.layout().initFailure }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn :href="stores.api().returnUrl">
            <v-icon left icon="mdi-logout-variant"></v-icon>
            <span>{{ $t('allEnd') }}</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog max-width="60em" persistent v-model="stores.layout().showReplaceConfirmation">
      <v-card>
        <v-card-text>
          <p>{{ $t('startupPageOverwriteInfo') }}</p>
          <p>{{ $t('startupPageOverwriteQuestion') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="stores.api().loadDataFromBackend()">
            <v-icon left icon="mdi-reload"></v-icon>
            <span>{{ $t('allLoad') }}</span>
          </v-btn>
          <v-btn :href="stores.api().returnUrl">
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