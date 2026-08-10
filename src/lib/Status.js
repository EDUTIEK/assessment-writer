import Change from "@/data/Change";


/**
 * Provide status information
 */
export default class Status {

    static async getChanges() {

        let battery_level = null;

        if ("getBattery" in navigator) {
            const battery = await navigator.getBattery();
            battery_level = battery.level;
        }

        return [new Change({
            action: Change.ACTION_SAVE,
            type: Change.TYPE_STATUS,
            key: '',
            payload: {
                'battery': battery_level,
                'hidden': document.hidden,
                'user_agent': navigator.userAgent,
                'platform': navigator.platform
            }
        })];
    }
}