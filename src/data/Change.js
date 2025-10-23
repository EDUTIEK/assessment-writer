/**
 * Notion of a change that has been sent to the backend
 */
export default class Change {

  static ACTION_SAVE = 'save';
  static ACTION_DELETE = 'delete';

  static ALLOWED_ACTIONS = [Change.ACTION_SAVE, Change.ACTION_DELETE];

  static TYPE_ANNOTATIONS = 'annotations';
  static TYPE_NOTES = 'notes';
  static TYPE_PREFERENCES = 'preferences';

  static ALLOWED_TYPES = [Change.TYPE_ANNOTATIONS, Change.TYPE_NOTES, Change.TYPE_PREFERENCES];


  /**
   * Action to be executed
   * @type {string|null}
   */
  action = null;

  /**
   * Type of the data that is changed
   * @type {string|null}
   */
  type = null;


  /**
   * Key of the data that is changed
   * @type {string}
   */
  key = '';


  /**
   * Timestamp of the last change (Microseconds)
   * @type {integer}
   */
  last_change = null;


  /**
   * Payload to be added in apiStore.getChangeDataToSend()
   * The keys of deleted objects may be added before
   * @type {object|null}
   */
  payload = null;

  /**
   * Constructor - gets properties from a data object
   * @param {object} data
   */
  constructor(data = {}) {
    if (data.action !== undefined && Change.ALLOWED_ACTIONS.includes(data.action)) {
      this.action = data.action.toString()
    }
    if (data.type !== undefined && Change.ALLOWED_TYPES.includes(data.type)) {
      this.type = data.type.toString()
    }
    if (data.key !== undefined && data.key !== null) {
      this.key = data.key.toString()
    }
    if (data.last_change !== undefined && data.last_change !== null) {
      this.last_change = parseInt(data.last_change);
    }
    if (data.payload !== undefined && data.payload !== null) {
      this.payload = data.payload;
    }

    if (this.last_change === null) {
      this.last_change = Date.now();
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
   * Check if the change data is valid
   * @returns {boolean}
   */
  isValid() {
    return (
      Change.ALLOWED_TYPES.includes(this.type)
      && Change.ALLOWED_ACTIONS.includes(this.action)
      && this.key != ''
    );
  }
}
