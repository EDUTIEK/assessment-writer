import { defineStore } from "pinia";
import localForage from "localforage";
import {useApiStore} from "@/store/api";
import {useTaskStore} from "@/store/task";
import {useSettingsStore} from "@/store/settings";
import {useChangesStore} from "@/store/changes";

import Note from "@/data/Note";
import Change from "@/data/Change";


const storage = localForage.createInstance({
    storeName: "writer-notes",
    description: "Writer notes data",
});

// set check interval very short to update the grade level according the points
const checkInterval = 200;      // time (ms) to wait for a new update check (e.g. 0.2s to 1s)

function startState() {

    return {
        // saved in storage
        keys: [],                   // list of string keys, indexed by notes_no
        notes: {},                  // list of all note objects, indexed by key

        // not saved in storage
        editNotes: {},              // notes that are actively edited
        lastCheck: 0,               // timestamp (ms) of the last check if an update needs a storage
        activeKey: null
    }
}

let lockUpdate = 0;             // prevent updates during a processing


/**
 * Notes Store
 */
export const useNotesStore = defineStore('notes',{
    state: () => {
        return startState();
    },

    /**
     * Getter functions (with params) start with 'get', simple state queries not
     */
    getters: {

    },

    actions: {

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
                        const note = new Note(parsed);
                        this.notes[key] = note;
                        this.editNotes[key] = note.getClone();
                      }
                   }
                }

            } catch (err) {
                console.log(err);
            }
        },

        /**
         * Load the notes data from the backend
         * All keys and notes are put to the storage
         *
         * @param {array} data - array of plain objects
         * @public
         */
        async loadFromData(data) {
            try {
                await storage.clear();
                this.$reset();

                for (const note_data of data) {
                    const note = new Note(note_data);
                    this.notes[note.getKey()] = note;
                    this.editNotes[note.getKey()] = note.getClone();

                    this.keys.push(note.getKey());
                    await storage.setItem(note.getKey(), JSON.stringify(note.getData()));
                };
                await storage.setItem('keys', JSON.stringify(this.keys));
            }
            catch (err) {
                console.log(err);
            }

            lockUpdate = 0;
            setInterval(this.updateContent, checkInterval);
        },


      /**
       * Prepare notes to be used
       * Must be called after loadFromStorage() or loadFromData()
       * @param notes_count
       */
        async prepareNotes(notes_count) {

          // ensure all notice boards exist
          const keys = [];
          let activeKeyIsValid = false;

          for (let no = 0; no < notes_count; no++) {
            const key = Note.getKeyForNo(no);
            keys.push(key);
            if (this.activeKey == key) {
              activeKeyIsValid = true;
            }

            if (!(key in this.notes)) {
              const note = new Note({note_no: no});
              this.notes[key] = note;
              this.editNotes[key] = note.getClone();

              await storage.setItem(key, JSON.stringify(note.getData()));
            }
          }
          this.keys = keys;
          await storage.setItem('keys', JSON.stringify(this.keys));

          if (notes_count > 0 && !activeKeyIsValid) {
            this.activeKey = Note.getKeyForNo(0);
          }
      },


        /**
         * Update the stored content
         * Triggered from the editor component when the content is changed
         * Triggered every checkInterval
         */
        async updateContent(fromEditor = false, force = false) {

            // avoid too many checks
            const currentTime = Date.now();
            if ((currentTime - this.lastCheck < checkInterval) && !force) {
                return;
            }

            // avoid parallel updates
            // no need to wait because updateContent is called by interval
            // use post-increment for test-and set
            if (lockUpdate++ && !force) {
                return;
            }

            // don't accept changes after writing end
            const taskStore = useTaskStore();
            if (taskStore.writingEndReached) {
              return;
            }

            for (const key in this.editNotes) {
              try {

                // ensure it is not changed because it is bound to tiny
                const clonedNote = this.editNotes[key].getClone();
                const storedNote = this.notes[key] ?? new Note();

                if (!clonedNote.isEqual(storedNote)) {
                  const apiStore = useApiStore();
                  const changesStore = useChangesStore();

                  clonedNote.last_change = apiStore.getServerTime(Date.now());
                  this.editNotes[key].setData(clonedNote.getData());
                  this.notes[key] = clonedNote;

                  await storage.setItem(key, JSON.stringify(clonedNote.getData()));
                  await changesStore.setChange(new Change({
                    type: Change.TYPE_NOTES,
                    action: Change.ACTION_SAVE,
                    key: key
                  }))

                  console.log(
                    "Save Change ",
                    "| Editor: ", fromEditor,
                    "| Duration:", Date.now() - currentTime, 'ms');

                }
                // set this here
                this.lastCheck = currentTime;
              }
              catch(error) {
                console.error(error);
              }
            }

            lockUpdate = 0;
        },


        /**
         * Get all changed notes from the storage as flat data objects
         * This is called for sending the nots to the backend
         * @param {integer} sendingTime - timestamp of the sending or 0 to get all
         * @return {array} Change objects
         */
        async getChangedData(sendingTime = 0) {
            const apiStore = useApiStore();
            const changesStore = useChangesStore();
            const changes = [];
            for (const change of changesStore.getChangesFor(Change.TYPE_NOTES, sendingTime)) {
                const data = await storage.getItem(change.key);
                if (data) {
                    changes.push(apiStore.getChangeDataToSend(change, JSON.parse(data)));
                } else {
                    changes.push(apiStore.getChangeDataToSend(change));
                }
            };
            return changes;
        },
    }
});
