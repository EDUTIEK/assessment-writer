<script setup>
import {useLayoutStore} from '@/store/layout';
import {useTasksStore} from "@/store/tasks";
import {useResourcesStore} from '@/store/resources';
import {useAnnotationsStore} from '@/store/annotations';
import Annotation from "@/data/Annotation";
import createPDFJsApi from 'annotate-pdf/pdfjs-api';
import {nextTick, onMounted, ref, watch} from 'vue';

const layoutStore = useLayoutStore();
const tasksStore = useTasksStore();
const resourcesStore = useResourcesStore();
const annotationsStore = useAnnotationsStore();

const props = defineProps(['resource']);
const resource = props.resource;
const ResourceNode = ref();

let pdfjs;

onMounted(() => {
  pdfjs = createPDFJsApi(ResourceNode.value, './annotate-pdf/pdfjs-dist/web/viewer.html', resource.url);
  loadAnnotations();
  pdfjs.on('create', createAnnotation);
  pdfjs.on('update', updateAnnotation);
  pdfjs.on('delete', deleteAnnotation);
  pdfjs.on('select', selectAnnotation);
  pdfjs.on('pageChanged', pageChanged);
  handleFocusChange();
});

async function handleFocusChange() {
  if (layoutStore.isResourceShown(resource)) {
    await nextTick();
    ResourceNode.value.focus();
  }
}
watch(() => layoutStore.focusChange, handleFocusChange);

function loadAnnotations() {
  const all = [];
  for (const annotation of annotationsStore.getAnnotationsForResourceId(resource.id)) {
    all.push({
      id: annotation.mark_key,
      page: annotation.parent_number,
      intern: JSON.parse(annotation.mark_value),
    })
  }

  pdfjs.setAll(all);
}

async function createAnnotation(event) {
  const annotation = new Annotation(
      {
        task_id: tasksStore.currentTask.task_id,
        resource_id: resource.id,
        mark_key: event.detail.id,
        mark_value: JSON.stringify(event.detail.intern),
        parent_number: event.detail.page,
        start_position: Math.round(- event.detail.intern.rect[1])
      }
  );
  await annotationsStore.createAnnotation(annotation);
  annotationsStore.selectAnnotation(annotation.getKey());
}

function updateAnnotation(event) {
  const annotation = annotationsStore.getAnnotation(Annotation.buildKey(resource.id, event.detail.id));
  if (annotation) {
    annotation.mark_value = JSON.stringify(event.detail.intern);
    annotationsStore.updateAnnotation(annotation);
  }
}

function deleteAnnotation(event) {
  if (event.detail) {
    annotationsStore.deleteAnnotation(Annotation.buildKey(resource.id, event.detail.id));
  }
}

function selectAnnotation(event) {
  if (event.detail) {
    annotationsStore.selectAnnotation(Annotation.buildKey(resource.id, event.detail.id));
  }
}

function pageChanged(event) {
  let annotations = annotationsStore.getActiveAnnotationsByParentNumber(event.detail);
  if (annotations.length) {
    let annotation = annotations.shift();
    annotationsStore.setFirstVisibleAnnotation(annotation.getKey());
  }
}

function refreshSelection() {
  const annotation = annotationsStore.getAnnotation(annotationsStore.selectedKey);
  if (annotation && annotation.resource_id === resource.id) {
    pdfjs.select(annotation.mark_key);
  }
}
watch(() => annotationsStore.selectionChange, refreshSelection);

function handleDeleted()
{
  const annotation = Annotation.getFromKey(annotationsStore.deletedKey);
  if (annotation.resource_id == resource.id) {
    pdfjs.delete(annotation.mark_key);
  }
}
watch(() => annotationsStore.deletedKey, handleDeleted);

</script>

<template>
  <div class ="appResourceWrapper">
    <div class="appTextButtons">
      <!--
      <v-btn-group density="comfortable" variant="outlined" divided>
        <v-btn title="Load Annotations" size="small" @click="loadAnnotations">Markierungen laden</v-btn>
        <v-btn title="Save Annotations" size="small" @click="saveAnnotations">Markierungen speichern</v-btn>
      </v-btn-group>
      -->
    </div>
    <div class="appResourceNode" tabindex="0" ref="ResourceNode"></div>
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
