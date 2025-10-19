/**
 * Writing Task
 *
 * This provides basic data for a list of tasks to be taken
 */
export default class Task {

    static TYPE_ESSAY = 'essay';

    static ALLOWED_TYPES = [Task.TYPE_ESSAY];

    /**
     * Id of the task
     * @type {integer}
     */
    task_id = null;

    /**
     * Position of the task in the list
     * @type {integer}
     */
    position = 0;

    /**
     * Type of the task
     * @type {null}
     */
    type = null;

    /**
     * Title of the tasks
     * @type {string}
     */
    title = null;

    /**
     * Html instructions of the task
     * @type {string}
     */
    instructions = null;

    /**
     * Constructor - gets properties from a data object
     * @param {object} data
     */
    constructor(data = {}) {
        if (data.task_id !== undefined && data.task_id !== null) {
            this.task_id = parseInt(data.task_id);
        }
        if (data.position !== undefined && data.position !== null) {
            this.position = parseInt(data.position);
        }
        if (data.type !== undefined && Task.ALLOWED_TYPES.includes(data.type)) {
            this.type = data.type.toString()
        }
        if (data.title !== undefined && data.title !== null) {
            this.title = data.title.toString();
        }
        if (data.instructions !== undefined && data.instructions !== null) {
            this.instructions = data.instructions.toString();
        }

    }

    /**
     * Get a string key of the task
     * @return {string}
     */
    getKey() {
        return 'T' + this.task_id.toString()
    }

    /**
     * Get a plain data object from the public properties
     * @return {object}
     */
    getData() {
        return Object.assign({}, this)
    }
}
