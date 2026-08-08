import Change from "@/data/Change";


/**
 * Provide status information
 */
export default class Status {

    /**
     * @return float|null
     */
    static async getBatteryLevel() {
        if ("getBattery" in navigator) {
            const battery = await navigator.getBattery();
            return battery.level;
        }
        return null;
    }

    /**
     * @return bool
     */
    static async getHidden() {
        return document.hidden;
    }


    static async getChanges() {
        return [new Change({
            action: Change.ACTION_SAVE,
            type: Change.TYPE_STATUS,
            key: '',
            payload: {
                'battery': await Status.getBatteryLevel(),
                'hidden': await Status.getHidden(),
            }
        })];
    }
}