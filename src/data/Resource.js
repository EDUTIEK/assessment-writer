/**
 * Resource
 */
export default class Resource {

  static TYPE_FILE = 'file';
  static TYPE_URL = 'url';
  static TYPE_INSTRUCTION = 'instruct';
  static TYPE_SOLUTION = 'solution';

  static ALLOWED_TYPES = [Resource.TYPE_FILE, Resource.TYPE_URL, Resource.TYPE_INSTRUCTION, Resource.TYPE_SOLUTION];

  static order(res1, res2) {
    return res1.title < res2.title ? -1
        : res1.title > res2.title ? 1
            : 0
  }

  /**
   * Id of the resource
   * @type {integer}
   */
  id = '';

  /**
   * Id of the task to which the resource belongs
   * null, if the resource should belong to all tasks
   * @type {integer}
   */
  task_id = null;

  /**
   * title
   * @type {string}
   */
  title = '';

  /**
   * Resource type
   * @type {string}
   */
  type = null;

  /**
   * Should the resource be shown embedded
   * @type {bool}
   */
  embedded = true

  /**
   * Source of the resource
   * File, Instructions, Solution: filename
   * URL: url
   * @type {string}
   */
  source = '';

  /**
   * URL of the resource
   * @type {string}
   */
  url = '';

  /**
   * Mime Type of the file
   * @type {string}
   */
  mimetype = '';

  /**
   * Size of the resource file
   * @type {integer}
   */
  size = null;

  /**
   * Calculated key
   * @type {string}
   */
  key = null;

  /**
   * Constructor - gets properties from a data object
   * @param {object} data
   */
  constructor(data = {}) {
    if (data.id !== undefined && data.id !== null) {
      this.id =  parseInt(data.id);
    }
    if (data.task_id !== undefined && data.task_id !== null) {
      this.task_id =  parseInt(data.task_id);
    }
    if (data.title !== undefined && data.title !== null) {
      this.title = data.title.toString();
    }
    if (data.type !== undefined && Resource.ALLOWED_TYPES.includes(data.type)) {
      this.type = data.type.toString();
    }
    if (data.embedded !== undefined && data.embedded !== null) {
      this.embedded = !!data.embedded;
    }
    if (data.source !== undefined && data.source !== null) {
      this.source = data.source.toString();
    }
    if (data.url !== undefined && data.url !== null) {
      this.url = data.url.toString();
    }
    if (data.mimetype !== undefined && data.mimetype !== null) {
      this.mimetype = data.mimetype;
    }
    if (data.size !== undefined && data.size !== null) {
      this.size = parseInt(data.size);
    }

    this.key = 'R' + this.id.toString();
  }

  /**
   * Get a string key of the resource
   * @return {string}
   */
  getKey() {
    return this.key;
  }

  /**
   * Get a plain data object from the public properties
   * @returns {object}
   */
  getData() {
    return Object.assign({}, this)
  }

  isPdf() {
    return [Resource.TYPE_FILE, Resource.TYPE_SOLUTION, Resource.TYPE_INSTRUCTION].includes(this.type);
  }

  isExternalUrl() {
    return this.type == Resource.TYPE_URL && !this.embedded
  }

  isEmbeddedUrl() {
    return this.type == Resource.TYPE_URL && this.embedded
  }

  isEmbeddedSelectable() {
    return (this.type == Resource.TYPE_FILE || this.type == Resource.TYPE_URL && this.embedded);
  }

  canBeAnnoteted() {
    return [Resource.TYPE_FILE, Resource.TYPE_SOLUTION, Resource.TYPE_INSTRUCTION].includes(this.type);
  }

  hasFileToLoad() {
    return [Resource.TYPE_FILE, Resource.TYPE_SOLUTION, Resource.TYPE_INSTRUCTION].includes(this.type);
  }
}

