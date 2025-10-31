<script setup>

/**
 * Main Application
 */
import AppBar from "@/components/AppBar.vue";
import NavBar from "@/components/NavBar.vue";
import MainContent from "@/components/MainContent.vue";
import StartupPage from "@/components/StartupPage.vue";
import ReviewContent from "@/components/ReviewContent.vue";
import { stores } from '@/store';

const apiStore = stores.api();
apiStore.init();

</script>

<template>
  <v-app fill-height>
    <startup-content v-if="!apiStore.initialized"/>
    <app-bar v-if="apiStore.initialized"/>
    <nav-bar v-if="apiStore.initialized && !apiStore.review"/>
    <main-content v-if="apiStore.initialized && !apiStore.review"/>
    <review-content v-if="apiStore.initialized && apiStore.review"/>
  </v-app>
</template>

<style>

/**
 * Global content styles will be applied by class
 */
@import '@/styles/content.css';
@import '@/styles/headlines-single.css';
@import '@/styles/headlines-three.css';
@import '@/styles/headlines-numeric.css';
@import '@/styles/headlines-edutiek.css';


html {
  overflow-y: hidden !important;
}

.hidden {
  display: none !important;
}

/* Content for screen readers only */
.sr-only {
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: polygon(0px 0px, 0px 0px, 0px 0px);
  -webkit-clip-path: polygon(0px 0px, 0px 0px, 0px 0px);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
  white-space: nowrap;
}

/**
  Focus for Tab navigation
 */

.v-btn:focus::after, .v-btn:focus-visible::after,
.v-list-item:focus::after, .v-list-item:focus-visible::after {
  pointer-events: none;
  border: 2px solid blue !important;
  border-radius: inherit;
  opacity: 100% !important;
  transition: none !important;
}


/**
 * Tiny styles must be global
 */
.tox-tinymce {
  border: 1px solid #cccccc !important;
  border-radius: 0 !important;
}

.tox-toolbar__group {
  padding: 0 2px !important;
}

.tox-editor-header {
  /*
  width: 134%!important;
  transform: scale(0.75)!important;
  transform-origin: 0% 0% 0px!important;
  */

  box-shadow: none !important;
  border-bottom: 1px solid #cccccc !important;
  margin-bottom: 0 !important
}

/* hide the statusbar */
/*
.tox-statusbar {
  display: none!important;
}
*/

</style>
