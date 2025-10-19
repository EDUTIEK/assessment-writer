import { defineStore } from 'pinia';
import { getStorage } from "@/lib/Storage";

const storage = getStorage('alerts');

/**
 * Resources Store
 */
export const useAlertStore = defineStore('alerts', {
  state: () => {
    return {
      // saved in storage
      keys: [],                   // list of string keys
      alerts: [],                 // list of alert objects

      // not saved in storage
      activeKey: '',              // key of the active alert
      showAllAlerts: false
    }
  },


  getters: {
    countAlerts: (state) => state.alerts.length,
    hasAlerts: (state) => state.alerts.length > 0,
    hasActiveAlert: (state) => state.activeKey != '',

    activeMessage(state) {
      const alert = state.alerts.find(element => element.key == state.activeKey);
      return alert ? alert.message : ""
    },

    getAlert(state) {
      return (key) => state.alerts.find(element => element.key == key)
    },

    /**
     * Format a timestamp as string like '2022-02-21 21:22'
     */
    formatTimestamp() {
      return (timestamp) => (new Date(timestamp * 1000)).toLocaleString();
    },
  },

  actions: {

    showAlerts() {
      this.showAllAlerts = true;
    },

    hideAlert() {
      this.activeKey = '';
      this.showAllAlerts = false;
    },


    async clearStorage() {
      try {
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromStorage() {
      try {
        const keys = await storage.getItem('alertKeys');
        if (keys) {
          this.keys = JSON.parse(keys);
        }
        this.alerts = [];
        for (const key of this.keys) {
          let alert = await storage.getItem(key);
          this.alerts.unshift(alert);     // show alerts in reverse order
        }

      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromData(data, show_new = false) {
      try {
        await storage.clear();

        let keys = [];
        let alerts = [];

        for (const alert of data) {
          if (show_new && !this.keys.includes(alert.key)) {
            this.activeKey = alert.key;
          }
          alerts.unshift(alert);          // show alerts in reverse order
          keys.push(alert.key);
          await storage.setItem(alert.key, alert);
        }

        this.keys = keys;
        this.alerts = alerts;

        await storage.setItem('alertKeys', JSON.stringify(this.keys));
      }
      catch (err) {
        console.log(err);
      }
    },
  }
});