/**
 * Written Essay
 */
class Essay {

  static buildKey(task_id) {
    return 'E' + task_id;
  }

  /**
   * Number of the task o which the essay belongs
   * @type {integer}
   */
  task_id = 0;

  /**
   * Essay text
   * @type {string}
   */
  content = '';

  /**
   * Hash of the content
   * @type {string}
   */
  hash = '';

  /**
   * Sum of levenshtine distances sice the last full save
   * @type {integer}
   */
  sum_of_distances = 0;

  /**
   * Timestamp (ms) of the last check if an update needs a saving
   * @type {number}
   */
  last_check = 0;

  /**
   * Timestamp (ms) of the last saving in the storage
   * @type {number}
   */
  last_save = 0;

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
    if (data.content !== undefined && data.content !== null) {
      this.content = data.content.toString()
    }
    if (data.hash !== undefined && data.hash !== null) {
      this.hash = data.hash.toString()
    }
    if (data.sum_of_distances !== undefined && data.sum_of_distances !== null) {
      this.sum_of_distances = parseInt(data.sum_of_distances);
    }
    if (data.last_check !== undefined && data.last_check !== null) {
      this.last_check = parseInt(data.last_check);
    }
    if (data.last_save !== undefined && data.last_save !== null) {
      this.last_save = parseInt(data.last_save);
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
    return Essay.buildKey(this.task_id);
  }

  /**
   * Get a clone of the object
   * @returns {Essay}
   */
  getClone() {
    return new Essay(this.getData());
  }

  /**
   * Check if this object is equal to another object
   * @param {Essay} other
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

export default Note;
