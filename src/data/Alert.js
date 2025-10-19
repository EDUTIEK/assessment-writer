/**
 * Alert to be shown
 *
 * Alerts are sent from the exam supervision to single or multiple writers
 */
export default class Alert {

    static order(alert1, alert2) {
        return alert1.time > alert2.time ? -1
            : alert1.time < alert2.time ? 1
                : 0
    }

    /**
     * Id of the alert
     * @type {integer}
     */
    id = null;

    /**
     * Unix timestamp when the alert is shown
     * @type {integer}
     */
    time = 0;

    /**
     * Message to be shown
     * @type {string}
     */
    message = null;

    /**
     * Constructor - gets properties from a data object
     * @param {object} data
     */
    constructor(data = {}) {
        if (data.id !== undefined && data.id !== null) {
            this.id = parseInt(data.id);
        }
        if (data.time !== undefined && data.time !== null) {
            this.time = parseInt(data.time);
        }
        if (data.message !== undefined && data.message !== null) {
            this.message = data.message.toString();
        }
    }

    /**
     * Format the time as string like '2022-02-21 21:22'
     */
    formatTime() {
        return new Date(this.time * 1000).toLocaleString();
    }

    /**
     * Get a string key of the alert
     * @return {string}
     */
    getKey() {
        return 'A' + this.id.toString()
    }

    /**
     * Get a plain data object from the public properties
     * @return {object}
     */
    getData() {
        return Object.assign({}, this)
    }
}
