/**
 * Result from sending date to the backend
 */
export default class SendingResult
{
    /**
     * Step is a delta saving
     * @type {boolean}
     */
    success = true;

    /**
     * Return status message
     * @type {string}
     */
    message = '';

    /**
     * Result details
     * @type {string}
     */
    details = '';


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
        if (data.success !== undefined && data.success !== null) {
            this.success = !!data.success;
        }
        if (data.message !== undefined && data.message !== null) {
            this.message = data.message.toString()
        }
        if (data.details !== undefined && data.details !== null) {
            this.details = data.details.toString()
        }
    }

    /**
     * Get a plain data object from the public properties
     * @returns {object}
     */
    getData() {
        return {
            success: this.success,
            message: this.message,
            details: this.details
        }
    }
}
