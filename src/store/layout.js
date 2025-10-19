import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";
import localForage from "localforage";
import { useResourcesStore } from "@/store/resources";
import { useTasksStore } from '@/store/tasks';
import Resource from "@/data/Resource";
import Annotation from "@/data/Annotation";

const storage = getStorage('layout');

/**
 * Layout Store
 * Handles visibility of user interface components
 */
export const useLayoutStore = defineStore('layout', {
  state: () => {
    return {
      // saved in storage
      expandedColumn: 'none',         // left|right|none
      leftContent: 'instructions',    // instructions|instructionsPdf|resources
      rightContent: 'essay',          // essay|notes|annotations
      showTimer: false,
      showHelp: false,
      showSendingStatus: false,

      // not saved in storage
      focusTarget: '',                // target for setting the focus (header|navigation|left|right)
      focusChange: 0                  // indicator to set the focus to the target
    }
  },

  getters: {
    isLeftExpanded: (state) => state.expandedColumn == 'left',
    isRightExpanded: (state) => state.expandedColumn == 'right',

    isLeftVisible: (state) => state.expandedColumn != 'right',
    isRightVisible: (state) => state.expandedColumn != 'left',

    isInstructionsSelected: (state) => state.leftContent == 'instructions',
    isInstructionsPdfSelected: (state) => state.leftContent == 'instructionsPdf',
    isResourcesSelected: (state) => state.leftContent == 'resources',

    isAnnotationsSelected: (state) => state.rightContent == 'annotations',
    isEssaySelected: (state) => state.rightContent == 'essay',
    isNotesSelected: (state) => state.rightContent == 'notes',

    isInstructionsVisible: (state) => (state.expandedColumn != 'right' && state.leftContent == 'instructions'),
    isInstructionsPdfVisible: (state) => (state.isInstructionsPdfSelected && state.isLeftVisible),
    isResourcesVisible: (state) => (state.expandedColumn != 'right' && state.leftContent == 'resources'),

    isAnnotationsVisible: (state) => (state.expandedColumn != 'left' && state.rightContent == 'annotations'),
    isEssayVisible: (state) => (state.expandedColumn != 'left' && state.rightContent == 'essay'),
    isNotesVisible: (state) => (state.expandedColumn != 'left' && state.rightContent == 'notes'),

    isResourceShown: state => {

      const resourcesStore = useResourcesStore();
      /**
       * Check if a resource is visible
       * @returns {bool}
       */
      const fn = function (resource) {
        return (state.isInstructionsPdfVisible && resource.type == Resource.TYPE_INSTRUCTION ||
            state.isResourcesVisible && resourcesStore.isActive(resource));
      }
      return fn;
    },

    selectedResourceKey: (state) => {
      const resourcesStore = useResourcesStore();
      if (state.isInstructionsSelected) {
          return Annotation.KEY_INSTRUCTIONS;
      }
      else if (state.isInstructionsPdfSelected) {
        const resource = resourcesStore.getInstruction;
        if (resource) {
          return resource.key;
        }
      }
      else if (state.isResourcesSelected) {
        return resourcesStore.activeKey;
      }
      return null;
    }
  },

  actions: {

    async initialize() {
      await this.clearStorage();

      const resourcesStore = useResourcesStore();
      const tasksStore = useTasksStore();

      this.leftContent = tasksStore.hasInstructions ? 'instructions' :
        resourcesStore.hasInstruction ? 'instructionsPdf' :
          resourcesStore.hasEmbeddedFileOrUrlResources ? 'resources' : ''

      if (!this.leftContent) {
        this.expandedColumn = 'right';
      }
    },

    async clearStorage() {
      try {
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
    },


    async loadFromStorage() {
      try {
        const data = await storage.getItem('layout');

        if (data) {
          this.expandedColumn = data.expandedColumn;
          // resources may not be ready PDF is not shown instantly
          // so show show the instructions as default left content
          // this.leftContent = data.leftContent;

          // editor sould not start with notes
          // this.rightContent = data.rightContent;
          this.showTimer = data.showTimer;
        }

      }
      catch (err) {
        console.log(err);
      }
    },

    async saveToStorage() {
      try {
        await storage.setItem('layout', {
          expandedColumn: this.expandedColumn,
          //leftContent: this.leftContent,
          //rightContent: this.rightContent,
          showTimer: this.showTimer
        })
      }
      catch (err) {
        console.log(err);
      }
    },

    showInstructions() {
      this.leftContent = 'instructions';
      this.setLeftVisible();
      this.saveToStorage();
    },

    showInstructionsPdf() {
      this.leftContent = 'instructionsPdf';
      this.setLeftVisible();
      this.saveToStorage();
    },

    showResources() {
      this.leftContent = 'resources';
      this.setLeftVisible();
      this.saveToStorage();
    },

    showForResourceKey(key) {
      const resourcesStore = useResourcesStore();
      const resource = resourcesStore.getResource(key);
      if (resource) {
        if (resource.type == Resource.TYPE_INSTRUCTION) {
          this.showInstructionsPdf();
        }
        else {
          resourcesStore.selectResource(resource);
          this.showResources();
        }
      }
    },

    showAnnotations() {
      this.rightContent = 'annotations';
      this.setRightVisible();
      this.saveToStorage();
    },

    showEssay() {
      this.rightContent = 'essay';
      this.setRightVisible();
      this.saveToStorage();
    },

    showNotes() {
      this.rightContent = 'notes';
      this.setRightVisible();
      this.saveToStorage();
    },

    setLeftVisible() {
      if (!this.isLeftVisible) {
        this.expandedColumn = 'left';
        this.saveToStorage();
      }
      this.setFocusChange('left');
    },

    setRightVisible() {
      if (!this.isRightVisible) {
        this.expandedColumn = 'right';
        this.saveToStorage();
      }
      this.setFocusChange('right');
    },

    setLeftExpanded(expanded) {
      this.expandedColumn = expanded ? 'left' : 'none';
      this.setFocusChange('left');
      this.saveToStorage();
    },

    setRightExpanded(expanded) {
      this.expandedColumn = expanded ? 'right' : 'none';
      this.setFocusChange('right');
      this.saveToStorage();
    },

    setFocusChange(target) {
      this.focusTarget = target;
      this.focusChange = Date.now();
    },

    toggleTimer() {
      this.showTimer = !this.showTimer;
      this.saveToStorage();
    },

    handleKeyDown(event) {
      if (event.altKey) {
        switch (event.key) {
          case '0':
            this.setFocusChange('header');
            break;
          case '1':
            this.setLeftVisible();
            break;
          case '2':
            this.setRightVisible();
            break;
          case '#':
            this.setFocusChange('navigation');
            break;
        }
      }
    }
  }
});
