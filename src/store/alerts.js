/**
 * Alert Store
 * handles alert messages coming from the exam supervision
 */
import Alert from "@/data/Alert";
import {getStorage} from "@/lib/Storage";
import {defineStore} from 'pinia';

const storage = getStorage('alerts');
const startState = {
  // saved in storage
  alerts: {},                 // all task objects, indexed by string key

  // not saved in storage
  activeKey: '',              // key of the active alert
  showAllAlerts: false
}

export const useAlertStore = defineStore('alerts', {
  state: () => {
    return startState;
  },

  getters: {
    countAlerts: state => Object.keys(state.alerts).length,
    hasAlerts: state => state.countAlerts > 0,
    hasActiveAlert: state => state.activeKey !== '',
    activeMessage: state => state.alerts[state.activeKey]?.message ?? '',
    sortedAlerts: state => Object.values(state.alerts).toSorted(Alert.order),
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
        this.$reset();
        await storage.clear();
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromStorage() {
      try {
        this.$reset();

        const keys = await storage.getItem('keys') ?? [];
        for (const key of keys) {
          this.alerts[key] = new Alert(await storage.getItem(key));
        }
      }
      catch (err) {
        console.log(err);
      }
    },

    async loadFromBackend(data = []) {
      try {
        await storage.clear();
        this.$reset();

        for (const item of data) {
          const alert = new Alert(item);
          this.alerts[alert.getKey()] = alert;
          await storage.setItem(alert.getKey(), alert.getData());
        }
        await storage.setItem('keys', Object.keys(this.alerts));
      }
      catch (err) {
        console.log(err);
      }
    },

  }
});