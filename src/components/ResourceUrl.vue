<script setup>
/**
 * Embedded external resource shown in an iframe
 */
import {stores} from "@/store";
import {nextTick, onMounted, ref, watch} from 'vue';

const layoutStore = stores.layout();
const resourcesStore = stores.resources();

const props = defineProps(['resource']);
const resource = props.resource
const ResourceNode = ref();

async function handleFocusChange() {
  if (layoutStore.isResourceShown(resource)) {
    await nextTick();
    ResourceNode.value.focus();
  }
}
onMounted(() => handleFocusChange);
watch(() => layoutStore.focusChange, handleFocusChange);

</script>

<template>
  <div id="app-resource-url-wrapper">
    <div class="appTextButtons">
    </div>

    <div tabindex="0" class="appResourceNode" ref="ResourceNode">
      <iframe
          :src="resource.url"
          width="100%"
          height="100%"
          frameborder = 0
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
      >
      </iframe>
    </div>
  </div>
</template>


<style scoped>

.appResourceWrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.appTextButtons {
  text-align: center;
  padding-bottom: 5px;
  height: 50px;
}

.appResourceNode {
  flex-grow: 1;
  width: 100%;
  height: calc(100% - 50px);
}

</style>
