/**
 * Writing Note
 */
export default class Note {

  static buildKey(note_no, task_id) {
    return 'N' + note_no + '_' + task_id;
  }

  /**
   * Number of the task o which the note belongs
   * @type {integer}
   */
  task_id = 0;

  /**
   * Number of the notice board
   * @type {integer}
   */
  note_no = 0;

  /**
   * Note text
   * @type {string}
   */
  note_text = '';

  /**
   * Timestamp of the last change (server time)
   * @type {integer}
   */
  last_change = null;


  /**
   * Constructor - gets properties from a data object
   * @param {object} data
   */
  constructor(data = {}) {
    this.setData(data);
  }
  

  /**
   * Set the data from a plain object
   * @param {object} data
   */
  setData(data) {
    if (data.task_id !== undefined && data.task_id !== null) {
      this.task_id = parseInt(data.task_id);
    }
    if (data.note_no !== undefined && data.note_no !== null) {
      this.note_no = parseInt(data.note_no);
    }
    if (data.note_text !== undefined && data.note_text !== null) {
      this.note_text = data.note_text.toString()
    }
    if (data.last_change !== undefined && data.last_change !== null) {
      this.last_change = parseInt(data.last_change);
    }
  }

  /**
   * Get a plain data object from the public properties
   * @returns {object}
   */
  getData() {
    return Object.assign({}, this);
  }

  /**
   * @return {string}
   */
  getKey() {
    return Note.buildKey(this.note_no, this.task_id);
  }

  /**
   * Get a clone of the object
   * @returns {Note}
   */
  getClone() {
    return new Note(this.getData());
  }

  /**
   * Check if this object is equal to another object
   * @param {Note} other
   * @return boolean
   */
  isEqual(other) {
    for (const key in this) {
      if (this[key] !== other[key]) {
        return false;
      }
    }
    return true;
  }
}

