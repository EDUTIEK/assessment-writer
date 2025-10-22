/**
 * PDF Annotation
 */
class Annotation {

  static RESOURCE_ID_INSTRUCTIONS = 0;

  /**
   * Build an annotation key
   * @param {integer} resource_id
   * @param {string} mark_key
   * @returns {string}
   */
  static buildKey(resource_id, mark_key) {
    // use underscore as separator because mark key has a dash inside
    return 'A_' + resource_id.toString() + '_' + mark_key
  }

  /**
   * Get a minimal annotation from an annotation key
   * This is used to create the payload of a delete change
   * @param {string} key
   * @returns {Annotation}
   */
  static getFromKey(key) {
    const parts = key.split('_');
    return new Annotation({
          resource_id: parseInt(parts[1]),
          mark_key: parts[2],
        }
    );
  }

  static order(annotation1, annotation2) {
    if (annotation1.resource_id < annotation2.resource_id) {
      return -1;
    } else if (annotation1.resource_id > annotation2.resource_id) {
      return 1;
    } else if (annotation1.parent_number < annotation2.parent_number) {
      return -1;
    } else if (annotation1.parent_number > annotation2.parent_number) {
      return 1;
    } else if (annotation1.start_position < annotation2.start_position) {
      return -1;
    } else if (annotation1.start_position > annotation2.start_position) {
      return 1;
    } else {
      return 0;
    }
  }

  /**
   * Id if the resource to annotate
   * @type {string}
   */
  resource_id = null;

  /**
   * Id of task to which the annotation belongs
   * @type {string}
   */
  task_id = null;

  /**
   * unique key of the mark within the pdf document
   * random key of the mark in the instructions
   * @type {string}
   */
  mark_key = '';

  /**
   * Raw mark data in the pdf document (stringified)
   * @type {string}
   */
  mark_value = null;

  /**
   * Number of the parent (page or paragraph)
   * @type {number}
   */
  parent_number = 0

  /**
   * Number of start position (only for text marks)
   * @type {number}
   */
  start_position = 0;

  /**
   * Number of start position (only for text marks)
   * @type {number}
   */
  end_position = 0;

  /**
   * Comment for this annotation
   * @type {string}
   */
  comment = null;

  /**
   * Annotation label (not stored, renumbered when annotations are added or deleted)
   * @type {string}
   */
  label = '';

  /**
   * Constructor - gets properties from a data object
   * @param {object} data
   */
  constructor(data = {}) {
    if (data.resource_id !== undefined && data.resource_id !== null) {
      this.resource_id = parseInt(data.resource_id);
    }
    if (data.task_id !== undefined && data.task_id !== null) {
      this.task_id = parseInt(data.task_id);
    }
    if (data.mark_key !== undefined && data.mark_key !== null) {
      this.mark_key = data.mark_key
    } else {
      this.mark_key = Math.random().toString();
    }
    if (data.mark_value !== undefined && data.mark_value !== null) {
      this.mark_value = data.mark_value;
    }
    if (data.parent_number !== undefined && data.parent_number !== null) {
      this.parent_number = data.parent_number
    }
    if (data.start_position !== undefined && data.start_position !== null) {
      this.start_position = data.start_position
    }
    if (data.end_position !== undefined && data.end_position !== null) {
      this.end_position = data.end_position
    }
    if (data.comment !== undefined && data.comment !== null) {
      this.comment = data.comment
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
    return Annotation.buildKey(this.resource_id, this.mark_key);
  }

}

export default Annotation;
