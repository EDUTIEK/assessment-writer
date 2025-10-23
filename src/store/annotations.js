import { defineStore } from "pinia";
import { getStorage } from "@/lib/Storage";
import {useApiStore} from "@/store/api";
import {useResourcesStore} from "@/store/resources";
import {useLayoutStore} from "@/store/layout";
import { useChangesStore } from "@/store/changes";
import { useTasksStore} from "@/store/tasks";
import Annotation from "@/data/Annotation";
import Change from '@/data/Change';
import resource from "@/data/Resource";
import Resource from "@/data/Resource";

const storage = getStorage('annotations');
const startState = {
  annotations: {},                // list of all annotation objects

  // not saved in storage
  markerChange: 0,                // for watchers: timestamp of the last change that affects the text markers (not the selection)
  selectionChange: 0,             // for watchers: timestamp of the last change of the selected annotation
  caretRequest: 0,                // for watchers: timestamp of the last request to set the caret to the mark of selected comment

  selectedKey: '',                // key of the currently selected annotation
  deletedKey: '',                 // key of the last deleted annotation
  firstVisibleKey: '',            // key of the first visible comment in the scrolled text
}

/**
 * Annotations Store
 */
export const useAnnotationsStore = defineStore('annotations', {
  state: () => {
    return startState;
  },

  /**
   * Getter functions (with params) start with 'get', simple state queries not
   */
  getters: {

    activeAnnotations(state) {
      const layoutStore = useLayoutStore();
      const taskStore = useTasksStore();
      const selectedResourceId = layoutStore.selectedResourceId;
      if (selectedResourceId !== null) {
        return Object.values(state.annotations)
            .filter(annotation => annotation.resource_id === selectedResourceId
              && annotation.task_id == taskStore.currentTask?.task_id)
            .sort(Annotation.order);
      }
      return [];
    },

    getAnnotation(state) {

        /**
         * Get an annotation by key
         * @param {string} key
         */
        const fn = function (key) {
          return state.annotations[key] ?? null;
        }
        return fn;
    },

    getAnnotationsForResourceId(state) {

        /**
         * Get the annotations for a resource
         * @param {integer} resource_id
         */
        const fn = function (resource_id) {
          return Object.values(state.annotations).filter(element => element.resource_id === resource_id);
        }
        return fn;
      },

    getActiveAnotationsInRange(state) {

      /**
       * Get the active comments in a range of marked text
       *
       * @param {number} start_position
       * @param {number} end_position
       * @returns {Annotation[]}
       */
      const fn = function (start_position, end_position) {
        return state.activeAnnotations.filter(annotation =>
            annotation.start_position <= end_position && annotation.end_position >= start_position
        );
      };
      return fn;
    },

    getActiveAnnotationsByStartPosition(state) {

      /**
       * Get the active annotations with a start position
       *
       * @param {number} start_position
       * @returns {Annotation[]}
       */
      const fn = function (start_position) {
        return state.activeAnnotations.filter(annotation =>
            annotation.start_position === start_position
        );
      }
      return fn;
    },

    getActiveAnnotationsByParentNumber(state) {

      /**
       * Get the active annotations with a start position
       *
       * @param {number} parent_number
       * @returns {Annotation[]}
       */
      const fn = function (parent_number) {
        return state.activeAnnotations.filter(annotation =>
            annotation.parent_number === parent_number
        );
      }
      return fn;
    },
  },

  actions: {

    /**
     * Set the first visible annotation to force a scrolling
     * @param {string} key
     * @public
     */
    setFirstVisibleAnnotation(key) {
      this.firstVisibleKey = key;
    },

    /**
     * Set timestamp of the last change that affects the text markers (not the selection)
     * @public
     */
    setMarkerChange() {
      this.markerChange = Date.now();
    },

    /**
     * Set timestamp of the last request to set the caret to the selected comment
     * @public
     */
    setCaretRequest() {
      this.caretRequest = Date.now();
    },

    /**
     * Set the currently selected annotation
     * @param {string} key
     * @public
     */
    selectAnnotation(key) {
      this.selectedKey = key;
      this.selectionChange = Date.now();
    },

    /**
     * Create an annotation in the store
     * @param {bool} trigger a sorting and labelling of the annotations
     * @param {Annotation} annotation
     * @public
     */
    async createAnnotation(annotation) {
      const apiStore = useApiStore();
      const changesStore = useChangesStore();

      // first do state changes (trigger watchers)
      this.annotations[annotation.getKey()] = annotation;
      await this.labelAnnotations();
      this.setMarkerChange();
      this.selectAnnotation(annotation.getKey());

      // then save the annotation
      await storage.setItem(annotation.getKey(), annotation.getData());
      await storage.setItem('keys', Object.keys(this.annotations));
      await changesStore.setChange(annotation.getChange(Change.ACTION_SAVE));
    },

    /**
     * Update an annotation in the store
     * @param {bool} trigger a sorting and labelling of the annotations
     * @param {Annotation} annotation
     * @public
     */
    async updateAnnotation(annotation, sort = false) {
      const apiStore = useApiStore();
      const changesStore = useChangesStore();

      if (Object.keys(this.annotations).includes(annotation.getKey())
      ) {
        await storage.setItem(annotation.getKey(), annotation.getData());
        await changesStore.setChange(annotation.getChange(Change.ACTION_SAVE));

        if (sort) {
          await this.labelAnnotations();
          this.setMarkerChange();
        }
      }
    },

    /**
     * Delete an annotation
     * @param {string} removeKey
     * @private
     */
    async deleteAnnotation(removeKey) {
      if (this.selectedKey === removeKey) {
        this.selectAnnotation('');
      }

      const annotation = this.annotations[removeKey];
      if (annotation) {
        delete this.annotations[removeKey];
        await storage.removeItem(removeKey);
        await storage.setItem('keys', Object.keys(this.annotations));
        this.deletedKey = removeKey;

        const changesStore = useChangesStore();
        await changesStore.setChange(annotation.getChange(Change.ACTION_DELETE));
        await this.labelAnnotations();
        this.setMarkerChange();
      }
    },


    /**
     * Sort and label the annotations by position in their resource
     * @private
     */
    async labelAnnotations() {
      const annotations = Object.values(this.annotations).sort(Annotation.order);

      let resource_key = '';
      let parent = 0;
      let number = 0;
      for (const annotation of annotations) {
        if (annotation.resource_key !== resource_key) {
          resource_key = annotation.resource_key;
          parent = 0;
          number = 1;
        } else if (annotation.parent_number > parent) {
          parent = annotation.parent_number;
          number = 1;
        } else {
          number++;
        }
        annotation.label = (parent + 1).toString() + '.' + number.toString();
      }
    },

    /**
     * Clear the whole storage
     * @public
     */
    async clearStorage() {
      try {
        this.$reset();
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
    },


    /**
     * Load the notes data from the storage
     * @public
     */
    async loadFromStorage() {

      try {
        this.$reset();

        const keys = await storage.getItem('keys') ?? [];
        for (const key of keys) {
          this.annotations[key] = new Annotation(await storage.getItem(key));
        }
        await this.labelAnnotations();
      }
      catch (err) {
        console.log(err);
      }
    },

    /**
     * Load the annotations data from the backend
     * All keys and annotations are put to the storage
     *
     * @param {array} data - array of plain objects
     * @public
     */
    async loadFromBackend(data) {
      try {
        await storage.clear();
        this.$reset();

        for (const item of data) {
          const annotation = new Annotation(item);
          this.annotations[annotation.getKey()] = annotation;
          await storage.setItem(annotation.getKey(), annotation.getData());
        }
        await storage.setItem('keys', Object.keys(this.annotations));
        await this.labelAnnotations();
      }
      catch (err) {
        console.log(err);
      }
    },


    /**
     * Get all changed annotations from the storage as flat data objects
     * This is called for sending the annotations to the backend
     * @param {integer} sendingTime - timestamp of the sending or 0 to get all
     * @return {array} Change objects
     */
    async getChangedData(sendingTime = 0) {
      const apiStore = useApiStore();
      const changesStore = useChangesStore();
      const changes = [];
      for (const change of changesStore.getChangesFor(Change.TYPE_ANNOTATIONS, sendingTime)) {
        const payload = await storage.getItem(change.key) ?? null;
        changes.push(apiStore.getChangeDataToSend(change, payload));
      }
      return changes;
    }
  }
});

