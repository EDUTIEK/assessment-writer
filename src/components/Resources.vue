<script setup>
/**
 * Container for resources shown in the left column of the main content
 * Resources of different types are shown here
 * Their visibility is controlled by the layoutStore
 */
import ResourcePdf from "@/components/ResourcePdf.vue";
import ResourceUrl from "@/components/ResourceUrl.vue";
import {stores} from "@/store";
import {nextTick, watch} from "vue";

const layoutStore = stores.layout();
const resourcesStore = stores.resources();
const tasksStore = stores.tasks();

async function setActiveResource() {
  await nextTick();
  resourcesStore.selectFirstEmbeddedResource();
}
watch(() => tasksStore.currentKey, setActiveResource);

</script>

<template>
  <div id="app-resources" tabindex="0" class="resources">
    <template v-for="resource in resourcesStore.resources" :key="resource.key">

      <resource-pdf v-if="resource.isPdf()"
                    v-show="layoutStore.isResourceShown(resource)"
                    :key=resource.key
                    :resource="resource">
      </resource-pdf>

      <resource-url v-if="resource.isEmbeddedUrl()"
                    v-show="layoutStore.isResourceShown(resource)"
                    :key=resource.key
                    :resource="resource">
      </resource-url>

      <audio controls
             v-if="resource.isAudio()"
             v-show="layoutStore.isResourceShown(resource)"
      >
        <source :src="resource.url" :type="resource.mimetype" :aria-label="resource.title">
      </audio>

      <video controls
             v-if="resource.isVideo()"
             v-show="layoutStore.isResourceShown(resource)"
      >
        <source :src="resource.url" :type="resource.mimetype" :aria-label="resource.title">
      </video>

      <img :src="resource.url"
             :alt="resource.title"
             v-if="resource.isImage()"
             v-show="layoutStore.isResourceShown(resource)"
      >
      </img>

    </template>
  </div>
</template>


<style scoped>

div {
  height: 100%;
}

audio, video, img {
  width: 100%;
}

</style>
