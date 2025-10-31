/**
 * API Store
 * handles app state initialisation
 * handles ommunication with the backend
 */
import Change from "@/data/Change";
import SendingResult from "@/data/SendingResult";
import {clearAllStores, stores} from "@/store";
import {defineStore} from 'pinia';
import axios from 'axios'
import Cookies from 'js-cookie';
import md5 from 'md5';

const syncInterval = 1000;      // time (ms) to wait for syncing with the backend
const updateInterval = 5000;    // time (ms) for next update from the backend (min. syncInterval)

export const useApiStore = defineStore('api', {

  state: () => {
    return {
      // saved in storage
      backendUrl: '',                     // url to be used for REST calls
      returnUrl: '',                      // url to be called when the wsriter is closed
      userId: '',                         // identifying id of the writing user
      assId: '',                          // identifying id of the assesment
      contextId: '',                      // identifying id of the context fpr permission checks
      dataToken: '',                      // authentication token for transmission of data
      fileToken: '',                      // authentication token for loading files
      timeOffset: 0,                      // differnce between server time and client time (ms)

      // not saved
      intervals: {},                      // list of all registered timer intervals, indexed by their name
      lastChangesTry: 0,                  // timestamp of the last try to send changes
      lastUpdateTry: 0,                   // timestamp of the last try to get an update from the server
      lastUpdateDone: 0                   // timestamp of the last successful update from the server
    }
  },

  /**
   * Getter functions (with params) start with 'get', simple state queries not
   */
  getters: {

    isAllSent(state) {
      return !state.isSending && stores.changes().countChanges == 0;
    },

    isSending(state) {
      return state.lastChangesTry > 0;
    },

    getRequestConfig(state) {

      /**
       * Get the config object for REST requests
       * @param {string}  token
       * @return {object}
       */
      const fn = function (token) {
        let baseURL = state.backendUrl;
        let params = new URLSearchParams();

        // cut query string and set it as params
        // a REST path is added as url to the baseURL by axias calls
        let position = baseURL.search(/\?+/);
        if (position != -1) {
          params = new URLSearchParams(baseURL.substr(position))
          baseURL = baseURL.substr(0, position);
        }

        // add authentication info as url parameters
        // use signature instead of token because it is visible
        params.append('user_id', state.userId);
        params.append('ass_id', state.assId);
        params.append('context_id', state.contextId);
        params.append('signature', md5(state.userId + state.assId + state.contextId + token));

        return {
          baseURL: baseURL,
          params: params,
          timeout: 30000,             // milliseconds
          responseType: 'json',       // default
          responseEncoding: 'utf8',   // default
        }
      }
      return fn;
    },

    getResourceUrl(state) {

      /**
       * Get the Url for loading a file ressource
       * @param {Resource}
       */
      const fn = function (resource) {
        const config = this.getRequestConfig(this.fileToken);
        return config.baseURL + '/writer/file/task/resource/' + resource.id + '?' + config.params.toString();
      }
      return fn;
    },

    getServerTime(state) {

      /**
       * Get the server unix timestamp (s) corresponding to a client timestamp (ms)
       * @param {number} clientTime
       * @return {number}
       */
      const fn = function (clientTime) {
        return clientTime == 0 ? 0 : Math.floor((clientTime - state.timeOffset) / 1000);
      }
      return fn;
    },
  },

  actions: {

    /**
     * Clear the store
     * Don't clear local variables of the api store
     */
    async clearStorage() {
      localStorage.clear();
    },

    /**
     * Init the state
     * Take the state from the cookies or local store
     * Trigger a reload of all data if cookie values differ from local store
     */
    async init() {

      let newContext = false;

      // take values formerly stored
      this.backendUrl = localStorage.getItem('xlasWriterBackendUrl');
      this.returnUrl = localStorage.getItem('xlasWriterReturnUrl');
      this.userId = localStorage.getItem('xlasWriterUserId');
      this.assId = localStorage.getItem('xlasWriterAssId');
      this.contextId = localStorage.getItem('xlasWriterContextId');
      this.dataToken = localStorage.getItem('xlasWriterDataToken');
      this.fileToken = localStorage.getItem('xlasWriterFileToken');
      this.timeOffset = Math.floor(localStorage.getItem('xlasWriterTimeOffset') ?? 0);

      // check if context given by cookies differs and force a reload if neccessary
      if (!!Cookies.get('xlasUserId') && Cookies.get('xlasUserId') !== this.userId) {
        this.userId = Cookies.get('xlasUserId');
        newContext = true;
      }
      if (!!Cookies.get('xlasAssId') && Cookies.get('xlasAssId') !== this.assId) {
        this.assId = Cookies.get('xlasAssId');
        newContext = true;
      }
      if (!!Cookies.get('xlasContextId') && Cookies.get('xlasContextId') !== this.contextId) {
        this.contextId = Cookies.get('xlasContextId');
        newContext = true;
      }

      // these values can be changed without forcing a reload
      if (!!Cookies.get('xlasBackendUrl') && Cookies.get('xlasBackendUrl') !== this.backendUrl) {
        this.backendUrl = Cookies.get('xlasBackendUrl');
      }
      if (!!Cookies.get('xlasReturnUrl') && Cookies.get('xlasReturnUrl') !== this.returnUrl) {
        this.returnUrl = Cookies.get('xlasReturnUrl');
      }
      if (!!Cookies.get('xlasToken') && Cookies.get('xlasToken') !== this.dataToken) {
        this.dataToken = Cookies.get('xlasToken');
      }

      if (!this.backendUrl || !this.returnUrl || !this.userId || !this.assId || !this.contextId || !this.dataToken) {
        stores.layout().showInitFailure = true;
        return;
      }

      const changesStore = stores.changes();
      await changesStore.loadFromStorage();

      if (newContext) {
        // switching to a new task or user always requires a load from the backend
        // be sure that existing data is not unintentionally replaced

        if (changesStore.countChanges > 0) {
          console.log('init: new context, open savings');
          stores.layout().showReplaceConfirmation = true;
        } else {
          console.log('init: new context, no open savings');
          await this.loadDataFromBackend();
        }
      } else {
        // no savings exist on the server
        // check if data is already entered but not sent

        if (changesStore.countChanges > 0) {
          console.log('init: same context, open savings');
          await this.loadDataFromStorage();
        } else {
          console.log('init: same context, no open savings');
          await this.loadDataFromBackend();
        }
      }

      this.setInterval('apiStore.timedSync', this.timedSync, syncInterval);
    },

    /**
     * Do the regular synchronisation (called from timer)
     */
    async timedSync() {
      await this.saveChangesToBackend();
      await this.loadUpdateFromBackend();
    },


    /**
     * Load all data from the storage
     */
    async loadDataFromStorage() {

      console.log("loadDataFromStorage...");
      this.updateConfig();

      await stores.settings().loadFromStorage();
      await stores.preferences().loadFromStorage();
      await stores.tasks().loadFromStorage();
      await stores.alert().loadFromStorage();
      await stores.resources().loadFromStorage();
      await stores.essay().loadFromStorage();
      await stores.notes().loadFromStorage();
      await stores.notes().prepareNotes(stores.settings().notice_boards);
      await stores.layout().loadFromStorage();
      await stores.changes().loadFromStorage();
      await stores.annotations().loadFromStorage();

      // directy check for updates of task settings to avoid delay
      await this.loadUpdateFromBackend();
      await stores.layout().initialize();
    },


    /**
     * Load all data from the backend
     */
    async loadDataFromBackend() {

      console.log("loadDataFromBackend...");

      await clearAllStores();
      this.updateConfig();

      let response = {};
      try {
        response = await axios.get('/writer/data', this.getRequestConfig(this.dataToken));
        this.setTimeOffset(response);
        this.refreshToken(response);
      }
      catch (error) {
        console.error(error);
        stores.layout().showInitFailure = true;
        return;
      }

      await stores.config().loadFromBackend(response.data['Assessment']['Config']);
      await stores.writer().loadFromBackend(response.data['Assessment']['Writer']);
      await stores.alert().loadFromBackend(response.data['Assessment']['Alerts']);

      await stores.tasks().loadFromBackend(response.data['Task']['Tasks']);
      await stores.resources().loadFromBackend(response.data['Task']['Resources']);
      await stores.annotations().loadFromBackend(response.data['Task']['Annotations']);

      await stores.settings().loadFromBackend(response.data['EssayTask']['WritingSettings']);
      await stores.preferences().loadFromBackend(response.data['EssayTask']['WriterPrefs']);
      await stores.essay().loadFromBackend(response.data['EssayTask']['Essays']);
      await stores.notes().loadFromBackend(response.data['EssayTask']['WriterNotices']);
      await stores.notes().prepareNotes(stores.settings().notice_boards);

      await stores.layout().initialize();
    },

    /**
     * Check for updates from the backend
     * - new writing end
     * - messages
     * - settings
     */
    async loadUpdateFromBackend() {

      // don't interfer with a running request and respect update interval
      if (this.lastUpdateTry > 0 ||
          (this.lastUpdateDone > Date.now() - updateInterval)) {
        return;
      }
      this.lastUpdateTry = Date.now();

      try {
        const response = await axios.get('/writer/update', this.getRequestConfig(this.dataToken));
        this.setTimeOffset(response);
        this.refreshToken(response);

        await stores.config().loadFromBackend(response.data['Assessment']['Config']);
        await stores.writer().loadFromBackend(response.data['Assessment']['Writer']);
        await stores.alert().loadFromBackend(response.data['Assessment']['Alerts']);
        await stores.settings().loadFromBackend(response.data['EssayTask']['WritingSettings']);

        this.lastUpdateTry = 0;
        this.lastUpdateDone = Date.now();
        return;
      }
      catch (error) {
        console.error(error);
        this.lastUpdateTry = 0;
        return;
      }
    },

    /**
     * Periodically send changes to the backend
     * Timer is set in initialisation
     *
     * @param bool wait    wait some seconds for a running sending to finish (if not called by timer)
     * @return SendingResult|null
     */
    async saveChangesToBackend(wait = false) {
      // wait up to five second for a running request to finish before giving up
      if (wait) {
        let tries = 0;
        while (tries < 5 && this.lastChangesTry > 0) {
          tries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // don't interfer with a running request
      if (this.lastChangesTry > 0) {
        return null;
      }

      const changesStore = stores.changes();
      if (changesStore.countChanges > 0) {
        this.lastChangesTry = Date.now();

        try {
          const data = {
            'Task': {
              'Annotations': await stores.annotations().getChangedData(this.lastChangesTry)
            },
            'EssayTask': {
              'WriterPrefs': await stores.preferences().getChangedData(this.lastChangesTry),
              'Notes': await stores.notes().getChangedData(this.lastChangesTry),
              'Steps': await stores.steps().getChangedData(this.lastChangesTry),
            }
          };

          const response = await axios.put('/writer/changes', data, this.getRequestConfig(this.dataToken));
          this.setTimeOffset(response);
          this.refreshToken(response);

          if (response.data['Task']) {
            await changesStore.setChangesSent(Change.TYPE_ANNOTATIONS,
                response.data['Task']['Annotations'] ?? [], this.lastChangesTry);
          }
          if (response.data['EssayTask']) {
            await changesStore.setChangesSent(Change.TYPE_STEPS,
                response.data['EssayTask']['Steps'] ?? [], this.lastChangesTry);
            await changesStore.setChangesSent(Change.TYPE_NOTES,
                response.data['EssayTask']['Notes'] ?? [], this.lastChangesTry);
            await changesStore.setChangesSent(Change.TYPE_PREFERENCES,
                response.data['EssayTask']['WriterPrefs'] ?? [], this.lastChangesTry);
          }

          this.lastChangesTry = 0;
          return sendingSuccessResult(response);
        }
        catch (error) {
          this.lastChangesTry = 0;
          console.log(error);
          return sendingErrorResult(error);
        }
      }
      return null;
    },

    /**
     * Save the final authorization to the backend
     * @param bool set_authorized
     */
    async saveFinalContentToBackend(set_authorized) {
       const data = {
        'EssayTask': {
          'Steps': await stores.steps().getChangedData(0),
          'Essays': await stores.essay().getFinalData(),
        },
        'Assessment': {
          // queue as last because authorization may block other updates
          'Writer': await stores.writer().getStatusToSend(set_authorized)
        },
       };

      try {
        const response = await axios.put('/writer/final', data, this.getRequestConfig(this.dataToken));
        this.refreshToken(response);

        if (response.data['EssayTask']) {
          await stores.changes().setChangesSent(Change.TYPE_STEPS,
              response.data['EssayTask']['Steps'] ?? [], Date.now());
        }
        if (response.data['Assessment']) {
          await stores.writer().setStatusResponses(response.data['Assessment']['Writer'] ?? [])
        }
        return sendingSuccessResult(response);
      }
      catch (error) {
        console.error(error);
        return sendingErrorResult(error);
      }
    },


    /**
     * Update the app configuration
     * This is called when the initialisation can be done silently
     * Or when a confirmation dialog is confirmed
     */
    updateConfig() {

      // remove the cookies
      // needed to distinct the call from the backend from a later reload
      Cookies.remove('xlasBackendUrl');
      Cookies.remove('xlasReturnUrl');
      Cookies.remove('xlasUserId');
      Cookies.remove('xlasAssId');
      Cookies.remove('xlasContextId');
      Cookies.remove('xlasToken');

      localStorage.setItem('xlasWriterBackendUrl', this.backendUrl);
      localStorage.setItem('xlasWriterReturnUrl', this.returnUrl);
      localStorage.setItem('xlasWriterUserId', this.userId);
      localStorage.setItem('xlasWriterAssId', this.assId);
      localStorage.setItem('xlasWriterContextId', this.contextId);
      localStorage.setItem('xlasWriterDataToken', this.dataToken);
      localStorage.setItem('xlasWriterFileToken', this.fileToken);
    },


    /**
     * Set the offset between server time and client time
     * The offset is used to calculate the correct remaining time of the task
     * The offset should be set from the response of a REST call
     * when the response data transfer is short (no files)
     */
    setTimeOffset(response) {
      if (response.headers['longessaytime']) {
        const serverTimeMs = response.headers['longessaytime'] * 1000;
        const clientTimeMs = Date.now();

        this.timeOffset = clientTimeMs - serverTimeMs;
        localStorage.setItem('xlasWriterTimeOffset', this.timeOffset);
      }
    },

    /**
     * Refresh the auth token with the value from the REST response
     * Each REST call will generate a new auth token
     * A token has only a certain valid time (e.g. one our)
     * Within this time a new REST call must be made to get a new valid token
     */
    refreshToken(response) {
      if (response.headers['xlasdatatoken']) {
        this.dataToken = response.headers['xlasdatatoken'];
        localStorage.setItem('xlasWriterDataToken', this.dataToken);
      }

      if (response.headers['xlasfiletoken']) {
        this.fileToken = response.headers['xlasfiletoken'];
        localStorage.setItem('xlasWriterFileToken', this.fileToken);
      }
    },

    /**
     * Set a timer interval
     * @param {string} name unique name of the interval to set
     * @param {function} handler function that is called
     * @param {integer} interval milliseconds between each call
     */
    setInterval(name, handler, interval) {
      if (name in this.intervals) {
        clearInterval(this.intervals[name]);
      }
      this.intervals[name] = setInterval(handler, interval);
    },

    /**
     * Clear all timer intervals
     */
    clearAllIntervals() {
      for (const name in this.intervals) {
        clearInterval(this.intervals[name]);
        delete this.intervals[name];
      }
    }
  }
})

function sendingSuccessResult(response) {
  return new SendingResult({
    success: true,
    message: response.statusText,
    details: response.data
  })
}

function sendingErrorResult(error = null) {
  if (error.response) {
    return new SendingResult({
      success: false,
      message: error.response.statusText,
      details: error.response.data
    })
  }
  else if (error.message) {
    return new SendingResult({
      success: false,
      message: error.message,
      details: ''
    })
  }
  else {
    return new SendingResult({
      success: false,
      message: 'Unknown error',
      details: ''
    })
  }
}