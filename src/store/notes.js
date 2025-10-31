/**
 * Notes Store
 * stores the writing notices
 */
import Change from "@/data/Change";
import Note from "@/data/Note";
import {getStorage} from "@/lib/Storage";
import {stores} from "@/store";
import {defineStore} from "pinia";

const storage = getStorage('notes');

// set check interval very short to update the grade level according the points
const checkInterval = 200;      // time (ms) to wait for a new update check (e.g. 0.2s to 1s)

const startState = {

  // saved in storage
  notes: {},                  // list of all note objects, indexed by key

  // not saved in storage
  editNotes: {},              // notes that are actively edited
  lastCheck: 0,               // timestamp (ms) of the last check if an update needs a storage
  activeKey: null
}

let lockUpdate = 0;             // prevent updates during a processing

export const useNotesStore = defineStore('notes', {
  state: () => {
    return startState;
  },

  /**
   * Getter functions (with params) start with 'get', simple state queries not
   */
  getters: {

    currentNotes(state) {
      const tasksStore = stores.tasks();
      const current_task_id =  tasksStore.currentTask?.task_id;
      return Object.values(state.notes).filter(note => note.task_id === current_task_id);
    },

    /**
     * Check if the user has entered notes
     */
    hasWrittenNotes(state) {
      for (const key in state.notes) {
        if (state.notes[key].note_text.length > 0) {
          return true;
        }
      }
      return false;
    }
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
      lockUpdate = 1;

      try {
        this.$reset();

        const keys = await storage.getItem('keys');
        for (const key of this.keys) {
          const stored = await storage.getItem(key);
          if (stored) {
            if (typeof stored === 'object' && stored !== null) {
              const note = new Note(stored);
              this.notes[key] = note;
              this.editNotes[key] = note.getClone();
            }
          }
        }
        this.prepareNotes();
        this.handleTaskChange();
      }
      catch (err) {
        console.log(err);
      }

      lockUpdate = 0;
      stores.api().setInterval('notesStore.checkUpdates', this.checkUpdates, checkInterval);
    },

    /**
     * Load the notes data from the backend
     * All keys and notes are put to the storage
     *
     * @param {array} data - array of plain objects
     * @public
     */
    async loadFromBackend(data = []) {
      lockUpdate = 1;

      try {
        await storage.clear();
        this.$reset();

        for (const note_data of data) {
          const note = new Note(note_data);
          this.notes[note.getKey()] = note;
          this.editNotes[note.getKey()] = note.getClone();
          await storage.setItem(note.getKey(), note.getData());
        }
        await storage.setItem('keys', Object.keys(this.notes));
        this.prepareNotes();
        this.handleTaskChange();
      }
      catch (err) {
        console.log(err);
      }

      lockUpdate = 0;
      stores.api().setInterval('notesStore.checkUpdates', this.checkUpdates, checkInterval);
    },


    /**
     * Prepare notes to be used
     * Must be called from loadFromStorage() or loadFromBackend()
     * @private
     */
    async prepareNotes() {

      const settingsStore = stores.settings();
      const tasksStore = stores.tasks();

      // ensure all notice boards exist
      for (const task_id of tasksStore.taskIds) {
        for (let no = 0; no < settingsStore.notice_boards; no++) {
          const key = Note.buildKey(no, task_id);
          if (!(key in this.notes)) {
            const note = new Note({ task_id: task_id, note_no: no });
            this.notes[key] = note;
            this.editNotes[key] = note.getClone();
            await storage.setItem(key, note.getData());
          }
        }
      }

      await storage.setItem('keys', Object.keys(this.notes));
    },

    /**
     * Reelect the active note when the task changed
     */
    handleTaskChange() {
      const settingsStore = stores.settings();
      const tasksStore = stores.tasks();

      if (settingsStore.notice_boards > 0) {
        this.activeKey = Note.buildKey(0, tasksStore.currentTask?.task_id);
      }
    },

    /**
     * Check all notes if an update is needed
     * @param forced - force the updates
     */
    async checkUpdates(forced = false) {

      for (const key in this.notes) {
        await this.updateContent(key, forced);
      }

      // reset the interval
      // this should start the interval again if it stopped accidentally
      stores.api().setInterval('notesStore.checkUpdates', this.checkUpdates, checkInterval);
    },

    /**
     * Update the stored content
     * Triggered from the editor component when the content is changed
     * Triggered every checkInterval
     */
    async updateContent(key, force = false) {

      const apiStore = stores.api();
      const changesStore = stores.changes();
      const writerStore = stores.writer();

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
      if (writerStore.writingEndReached) {
        return false;
      }

      try {
        // ensure it is not changed because it is bound to tiny
        const clonedNote = this.editNotes[key].getClone();
        const storedNote = this.notes[key] ?? new Note();

        if (!clonedNote.isEqual(storedNote)) {
          clonedNote.last_change = apiStore.getServerTime(Date.now());
          this.editNotes[key].setData(clonedNote.getData());
          this.notes[key] = clonedNote;

          await storage.setItem(key, clonedNote.getData());
          await changesStore.setChange(new Change({
            type: Change.TYPE_NOTES,
            action: Change.ACTION_SAVE,
            key: key
          }))
        }
      }
      catch (error) {
        console.error(error);
      }

      // set this here
      this.lastCheck = currentTime;
      lockUpdate = 0;
    },


    /**
     * Get all changed notes from the storage as flat data objects
     * This is called for sending the nots to the backend
     * @param {integer} sendingTime - timestamp of the sending or 0 to get all
     * @return {array} Change objects
     */
    async getChangedData(sendingTime = 0) {
      const changesStore = stores.changes();
      const changes = [];
      for (const change of changesStore.getChangesFor(Change.TYPE_NOTES, sendingTime)) {
        const data = await storage.getItem(change.key);
        changes.push(changesStore.getChangeDataToSend(change, data));
      }
      return changes;
    },
  }
});
