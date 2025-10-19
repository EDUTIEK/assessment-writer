import { defineStore } from "pinia";
import { getStorage } from "@/lib/Storage";
import {useApiStore} from "@/store/api";
import {useResourcesStore} from "@/store/resources";
import {useLayoutStore} from "@/store/layout";
import { useChangesStore } from "@/store/changes";
import Annotation from "@/data/Annotation";
import Change from '@/data/Change';
import resource from "@/data/Resource";

const storage = getStorage('annotations');

function startState() {

  return {
    // saved in storage
    keys: [],                   // list of string keys
    annotations: [],            // list of all annotation objects

    // not saved in storage
    markerChange: 0,                // for watchers: timestamp of the last change that affects the text markers (not the selection)
    selectionChange: 0,             // for watchers: timestamp of the last change of the selected annotation
    caretRequest: 0,                // for watchers: timestamp of the last request to set the caret to the mark of selected comment

    selectedKey: '',                // key of the currently selected annotation
    deletedKey: '',                 // key of the last deleted annotation
    firstVisibleKey: '',            // key of the first visible comment in the scrolled text
  }
}

/**
 * Annotations Store
 */
export const useAnnotationsStore = defineStore('annotations', {
  state: () => {
    return startState();
  },

  /**
   * Getter functions (with params) start with 'get', simple state queries not
   */
  getters: {

    activeAnnotations: state => {
      const layoutStore = useLayoutStore();
      const selectedResourceKey = layoutStore.selectedResourceKey;
      if (selectedResourceKey !== null) {
        return state.annotations.filter(annotation => annotation.resource_key === selectedResourceKey);
      }
      return [];
    },

    getAnnotation: state => {

        /**
         * Get an annotation by key
         * @param {string} key
         */
        const fn = function (key) {
          return state.annotations.find(element => element.getKey() === key);
        }
        return fn;
    },

    getAnnotationsForResource: state => {

        /**
         * Get the annotations for a resource
         * @param {string} resource_key
         */
        const fn = function (resource_key) {
          return state.annotations.filter(element => element.resource_key === resource_key);
        }
        return fn;
      },

    getActiveAnotationsInRange: state => {

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

    getActiveAnnotationsByStartPosition: state => {

      /**
       * Get the active annotations with a start position
       *
       * @param {number} start_position
       * @returns {Annotation[]}
       */
      const fn = function (start_position) {
        return state.activeAnnotations.filter(annotation =>
            annotation.start_position == start_position
        );
      }
      return fn;
    },

    getActiveAnnotationsByParentNumber: state => {

      /**
       * Get the active annotations with a start position
       *
       * @param {number} parent_number
       * @returns {Annotation[]}
       */
      const fn = function (parent_number) {
        return state.activeAnnotations.filter(annotation =>
            annotation.parent_number == parent_number
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
     * Set timestamp of the last request to set the carent to the selected comment
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
      this.keys.push(annotation.getKey());
      this.annotations.push(annotation);
      await this.sortAndLabelAnnotations();
      this.setMarkerChange();
      this.selectAnnotation(annotation);

      // then save the annotation
      await storage.setItem(annotation.getKey(), JSON.stringify(annotation.getData()));
      await storage.setItem('keys', JSON.stringify(this.keys));
      await changesStore.setChange(new Change({
        type: Change.TYPE_ANNOTATIONS,
        action: Change.ACTION_SAVE,
        key: annotation.getKey()
      }))
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

      if (this.keys.includes(annotation.getKey())
      ) {
        await storage.setItem(annotation.getKey(), JSON.stringify(annotation.getData()));
        await changesStore.setChange(new Change({
          type: Change.TYPE_ANNOTATIONS,
          action: Change.ACTION_SAVE,
          key: annotation.getKey()
        }))

        if (sort) {
          await this.sortAndLabelAnnotations();
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
      if (this.selectedKey == removeKey) {
        this.selectAnnotation('');
      }
      const annotation = this.annotations.find(element => element.getKey() == removeKey);

      this.annotations = this.annotations.filter(element => element.getKey() != removeKey);
      if (this.keys.includes(removeKey)) {
        this.keys = this.keys.filter(key => key != removeKey)
        await storage.setItem('keys', JSON.stringify(this.keys));
        await storage.removeItem(removeKey);
      }
      this.deletedKey = removeKey;

      const changesStore = useChangesStore();
      const change = new Change({
        type: Change.TYPE_ANNOTATIONS,
        action: Change.ACTION_DELETE,
        key: annotation.getKey()
      });

      await changesStore.setChange(change);
      await this.sortAndLabelAnnotations();
      this.setMarkerChange();
    },


    /**
     * Sort and label the annotations of a resource by position
     * @private
     */
    async sortAndLabelAnnotations() {
      this.annotations = this.annotations.sort(Annotation.compare);

      let resource_key = '';
      let parent = 0;
      let number = 0;
      for (const annotation of this.annotations) {
        if (annotation.resource_key !== resource_key) {
          resource_key = annotation.resource_key;
          parent = 0;
          number = 1;
        }else if (annotation.parent_number > parent) {
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
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
      this.$reset();
    },


    /**
     * Load the notes data from the storage
     * @public
     */
    async loadFromStorage() {

      try {
        this.$reset();

        const keys = await storage.getItem('keys');
        if (keys) {
          this.keys = JSON.parse(keys);
        }

        for (const key of this.keys) {
          const stored = await storage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed === 'object' && parsed !== null) {
              const annotation = new Annotation(parsed);
              this.annotations.push(annotation);
            }
          }
        }
        await this.sortAndLabelAnnotations();
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
    async loadFromData(data) {
      try {
        await storage.clear();
        this.$reset();

        for (const annotation_data of data) {
          const annotation = new Annotation(annotation_data);
          this.annotations.push(annotation);

          this.keys.push(annotation.getKey());
          await storage.setItem(annotation.getKey(), JSON.stringify(annotation.getData()));
        }
        ;
        await storage.setItem('keys', JSON.stringify(this.keys));
        await this.sortAndLabelAnnotations();
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
        const data = await storage.getItem(change.key);
        if (data) {
          changes.push(apiStore.getChangeDataToSend(change, JSON.parse(data)));
        } else {
          changes.push(apiStore.getChangeDataToSend(change, Annotation.getFromKey(change.key)));
        }
      }
      return changes;
    }
  }
});

