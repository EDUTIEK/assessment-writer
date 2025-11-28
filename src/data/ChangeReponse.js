import Change from "./Change.js";

/**
 * Backend result of a change request
 */
export default class ChangeResponse {

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
     * Action was procesed
     * @type {boolean}
     */
    done = false;

    /**
     * Result of the processing
     * @type {object|null}
     */
    result = null;


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
        if (data.done !== undefined && data.done !== null) {
            this.done = !!data.done;
        }
        if (data.result !== undefined && data.result !== null) {
            this.result = data.result;
        }

        if (this.last_change == 0) {
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
}