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
}