<script setup>
import Instructions from "@/components/Instructions.vue";
import ResourcePdf from '@/components/ResourcePdf.vue';
import Resources from "@/components/Resources.vue";
import EditSelect from "@/components/EditSelect.vue";
import { useLayoutStore } from "../store/layout";
import { useResourcesStore } from "../store/resources";
import { useClipboardStore } from "@/store/clipboard";
import {nextTick, onMounted} from "vue";

const layoutStore = useLayoutStore();
const resourcesStore = useResourcesStore();
const clipboardStore = useClipboardStore();

// enable keyboard hotkeys
document.addEventListener('keydown', layoutStore.handleKeyDown);

// needed to activate the input mode of dragon when being clicked in
onMounted(async () => {
  layoutStore.setFocusChange('header');
})

</script>

<template>
  <v-main fill-height>
    <div id="app-main-container">
      <section aria-label="Linke Spalte" class="column"
               :class="{ colExpanded: layoutStore.isLeftExpanded, colNormal: !layoutStore.isLeftExpanded}"
               v-show="layoutStore.isLeftVisible">
        <div class="col-header">
          <h1 class="headline">{{
              layoutStore.isInstructionsSelected ? $t('allInstructions')
                  : layoutStore.isInstructionsPdfSelected ?  $t('allInstructionsPdf')
                      : layoutStore.isResourcesSelected ? resourcesStore.activeResource?.title
                          : $t('mainContentLeftColumn')
            }}
          </h1>
          <v-btn-group density="comfortable">
            <!-- expand right column -->
            <v-btn size="small" @click="layoutStore.setLeftExpanded(false)" v-show="layoutStore.isLeftExpanded">
              <v-icon icon="mdi-chevron-left"></v-icon>
              <span>{{
                  layoutStore.isAnnotationsSelected ? $t('allAnnotations')
                    : layoutStore.isEssaySelected ? $t('allEssay')
                      : layoutStore.isNotesSelected ? $t('allNotes')
                        : $t('mainContentExpandRightColumn')
                }}
                </span>
            </v-btn>
            <!-- expand left column -->
            <v-btn aria-labelledby="app-expand-left-column" size="small" @click="layoutStore.setLeftExpanded(true)"
                   v-show="!layoutStore.isLeftExpanded">
              <span aria-hidden="true">{{ $t('mainContentExpand') }}</span>
              <span id="app-expand-left-column" class="sr-only">{{ $t('mainContentExpandLeftColumn') }}</span>
              <v-icon icon="mdi-chevron-right"></v-icon>
            </v-btn>
          </v-btn-group>
        </div>
        <div class="col-content">
          <!-- Ally: use v-show to keep cursor at position when only one columns is shown and columns are switched -->
          <instructions v-show="layoutStore.isInstructionsVisible"/>
          <resources v-show="layoutStore.isInstructionsPdfVisible || layoutStore.isResourcesVisible"/>
        </div>
      </section>
      <section aria-label="Rechte Spalte" class="column"
               :class="{ colExpanded: layoutStore.isRightExpanded, colNormal: !layoutStore.isRightExpanded}"
               v-show="layoutStore.isRightVisible">
        <div class="col-header">
          <h1 class="headline">{{
              layoutStore.isAnnotationsSelected ? $t('allAnnotations')
                : layoutStore.isEssayVisible ? $t('allEssay')
                  : layoutStore.isNotesVisible ? $t('allNotesWillPurged')
                          : $t('mainContentRightColumn')
            }}
          </h1>
          <v-btn-group density="comfortable">
            <!-- expand left column -->
            <v-btn size="small" @click="layoutStore.setRightExpanded(false)" v-show="layoutStore.isRightExpanded">
                <span> {{
                    layoutStore.isInstructionsSelected ? $t('allInstructions')
                        : layoutStore.isInstructionsPdfSelected ? $t('allInstructionsPdf')
                            : layoutStore.isResourcesSelected ? resourcesStore.activeResource?.title
                                : $t('mainContentExpandLeftColumn')
                  }}
                </span>
              <v-icon icon="mdi-chevron-right"></v-icon>
            </v-btn>
            <!-- expand right column -->
            <v-btn aria-labelledby="app-expand-right-column" size="small" @click="layoutStore.setRightExpanded(true)"
                   v-show="!layoutStore.isRightExpanded">
              <v-icon icon="mdi-chevron-left"></v-icon>
              <span aria-hidden="true">{{ $t('mainContentExpand') }}</span>
              <span id="app-expand-right-column" class="sr-only">{{ $t('mainContentExpandRightColumn') }}</span>
            </v-btn>
          </v-btn-group>
        </div>
        <div class="col-content">
          <edit-select/>
        </div>
      </section>
    </div>

    <v-dialog width="500" persistent v-model="clipboardStore.show_warning">
      <v-card>
        <v-card-text>
          <p>{{ $t('mainContentCopyPrevented') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="clipboardStore.hideWarning()">
            {{ $t('allOk') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-main>
</template>

<style scoped>

/* Structure */

#app-main-container {
  position: fixed;
  height: calc(100% - 50px);
  width: calc(100% - 72px);

  display: flex;
  flex-direction: row;
}

.column {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.col-header {
  height: 40px;
  width: 100%;
  padding: 10px;
}

.col-content {
  flex-grow: 1;
  background-color: white;
  width: 100%;
  padding: 10px;
  overflow-y: hidden;
}

.headline {
  font-size: 1rem;
  font-weight: bold;
  display: inline;
}

.v-btn-group {
  margin-top: -6px;
  float: right;
}

/* Dynamic Properties */

.colNormal {
  width: 50%;
}

.colExpanded {
  width: 100%;
}


</style>
