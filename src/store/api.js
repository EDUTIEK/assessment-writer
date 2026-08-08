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
import i18n from "@/plugins/i18n";
import md5 from 'md5';

const { t } = i18n.global;

/**
 * Interval (ms) to check if something needs to be synced with the backend
 * this can be either getting an update or sending open changes
 */
const syncInterval = 1000;

/**
 * Maximum time (ms) to get an update from the backend, even if no changes exist
 */
const updateInterval = 5000;

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


      lastSyncTry: 0,                     // timestamp of the last try to get an update from the server
      lastSyncDone: 0                     // timestamp of the last successful update from the server
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
      return ((state.lastSyncDone < state.lastSyncTry) && (state.lastSyncTry > (Date.now() - updateInterval)));
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
     */
    async clearStorage() {
      // Don't clear the api store because these values need to be kept for a page reload
    },

    /**
     * Init the state
     * Take the state from the cookies or local store
     * Trigger a reload of all data if cookie values differ from local store
     */
    async init() {

      let newContext = false;

      // take values formerly stored
      this.backendUrl = localStorage.getItem('xlasWriterBackendUrl') ?? '';
      this.returnUrl = localStorage.getItem('xlasWriterReturnUrl') ?? '';
      this.userId = localStorage.getItem('xlasWriterUserId') ?? '';
      this.assId = localStorage.getItem('xlasWriterAssId') ?? '';
      this.contextId = localStorage.getItem('xlasWriterContextId') ?? '';
      this.dataToken = localStorage.getItem('xlasWriterDataToken') ?? '';
      this.fileToken = localStorage.getItem('xlasWriterFileToken') ?? '';
      this.timeOffset = Math.floor(localStorage.getItem('xlasWriterTimeOffset') ?? 0);

      // check if context given by cookies differs and force a reload if neccessary
      if (!!Cookies.get('xlasUserId') && Cookies.get('xlasUserId') != this.userId) {
        this.userId = Cookies.get('xlasUserId');
        newContext = true;
      }
      if (!!Cookies.get('xlasAssId') && Cookies.get('xlasAssId') != this.assId) {
        this.assId = Cookies.get('xlasAssId');
        newContext = true;
      }
      if (!!Cookies.get('xlasContextId') && Cookies.get('xlasContextId') != this.contextId) {
        this.contextId = Cookies.get('xlasContextId');
        newContext = true;
      }

      // these values can be changed without forcing a reload
      if (!!Cookies.get('xlasBackendUrl') && Cookies.get('xlasBackendUrl') != this.backendUrl) {
        this.backendUrl = Cookies.get('xlasBackendUrl');
      }
      if (!!Cookies.get('xlasReturnUrl') && Cookies.get('xlasReturnUrl') != this.returnUrl) {
        this.returnUrl = Cookies.get('xlasReturnUrl');
      }
      if (Cookies.get('xlasDataToken') != undefined && Cookies.get('xlasDataToken') != this.dataToken) {
        this.dataToken = Cookies.get('xlasDataToken');
      }
      if (Cookies.get('xlasFileToken') != undefined && Cookies.get('xlasFileToken') != this.dataToken) {
        this.fileToken = Cookies.get('xlasFileToken');
      }

      if (!this.backendUrl || !this.returnUrl
          || !this.userId || !this.assId || !this.contextId
          || !this.dataToken || !this.fileToken) {
        stores.layout().initFailure = t('apiMissingParams');
        return;
      }

      // remove the cookies
      // needed to distinct the call from the backend from a later reload
      Cookies.remove('xlasBackendUrl');
      Cookies.remove('xlasReturnUrl');
      Cookies.remove('xlasUserId');
      Cookies.remove('xlasAssId');
      Cookies.remove('xlasContextId');
      Cookies.remove('xlasDataToken');
      Cookies.remove('xlasFileToken');

      localStorage.setItem('xlasWriterBackendUrl', this.backendUrl);
      localStorage.setItem('xlasWriterReturnUrl', this.returnUrl);
      localStorage.setItem('xlasWriterUserId', this.userId);
      localStorage.setItem('xlasWriterAssId', this.assId);
      localStorage.setItem('xlasWriterContextId', this.contextId);
      localStorage.setItem('xlasWriterDataToken', this.dataToken);
      localStorage.setItem('xlasWriterFileToken', this.fileToken);

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

      // todo: re-initialize, e.g. by click on cloud symbol
      this.setInterval('apiStore.syncWithBackend', this.syncWithBackend, syncInterval);
    },



    /**
     * Load all data from the storage
     */
    async loadDataFromStorage() {

      console.log("loadDataFromStorage...");

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
      this.syncWithBackend();
      await stores.layout().initialize();
    },


    /**
     * Load all data from the backend
     */
    async loadDataFromBackend() {

      console.log("loadDataFromBackend...");

      await clearAllStores();

      let response = {};
      try {
        response = await axios.get('/writer/data', this.getRequestConfig(this.dataToken));
        this.setTimeOffset(response);
        this.refreshToken(response);
      }
      catch (error) {
        console.error(error);
        stores.layout().initFailure = t('apiLoadingDataFailed');
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
     * Periodically sync with the backend
     * Timer is set in initialisation
     *
     * @param bool wait    wait some seconds for a running sending to finish (if not called by timer)
     * @return SendingResult|null
     */
    async syncWithBackend(wait = false) {
      const changesStore = stores.changes();

      // wait wile a sync try is open and young
      if (wait) {
        while (this.lastSyncDone < this.lastSyncTry && this.lastSyncTry > Date.now() - updateInterval) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // don't interfer with a running sync
      if (this.lastSyncDone < this.lastSyncTry && this.lastSyncTry > Date.now() - updateInterval) {
        console.log('still sending');
        return null;
      }

      // sync if update is due or changes exist
      if (this.lastSyncDone < Date.now() - updateInterval || changesStore.countChanges > 0) {
        this.lastSyncTry = Date.now();

        try {
          const data = {
            'Update': {
              'Assessment': {}
            },
            'Changes': {
              'Task': {},
              'EssayTask': {}
            }
          };

          data['Update']['Assessment']['Status'] = {'battery': 0.5, 'hidden': false};

          data['Changes']['Task'][Change.TYPE_ANNOTATIONS] = await stores.annotations().getChangedData(this.lastSyncTry);
          data['Changes']['EssayTask'][Change.TYPE_PREFERENCES] =  await stores.preferences().getChangedData(this.lastSyncTry);
          data['Changes']['EssayTask'][Change.TYPE_NOTES] = await stores.notes().getChangedData(this.lastSyncTry);
          data['Changes']['EssayTask'][Change.TYPE_STEPS] = await stores.steps().getChangedData(this.lastSyncTry);

          const response = await axios.put('/writer/sync', data, this.getRequestConfig(this.dataToken));
          this.setTimeOffset(response);
          this.refreshToken(response);

          if (response.data) {
            for (const component in response.data['Changes']) {
              const changes = response.data['Changes'][component];
              for (const type in changes ?? []) {
                await changesStore.setChangesSent(type, changes[type],  this.lastSyncTry)
              }
            }

            await stores.config().loadFromBackend(response.data['Update']['Assessment']['Config']);
            await stores.writer().loadFromBackend(response.data['Update']['Assessment']['Writer']);
            await stores.alert().loadFromBackend(response.data['Update']['Assessment']['Alerts'], true);
            await stores.settings().loadFromBackend(response.data['Update']['EssayTask']['WritingSettings']);
          }

          this.lastSyncDone = Date.now();
          return sendingSuccessResult(response);
        }
        catch (error) {
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

      // queue Assesment as last because authorization may block other updates
      const data = {'EssayTask': {}, 'Assessment': {}};
      data['EssayTask'][Change.TYPE_STEPS] = await stores.steps().getChangedData(0);
      data['EssayTask'][Change.TYPE_ESSAY] = await stores.essay().getFinalData();
      data['Assessment'][Change.TYPE_WRITER] = await stores.writer().getStatusToSend(set_authorized);

      try {
        const response = await axios.put('/writer/final', data, this.getRequestConfig(this.dataToken));
        this.refreshToken(response);

        const changesStore = stores.changes();
        for (const component in response.data ?? []) {
          const changes = response.data[component];
          for (const type in changes ?? []) {
            changesStore.setChangesSent(type, changes[type],  Date.now());
          }
        }

        if (response.data['Assessment']) {
          await stores.writer().setStatusResponses(response.data['Assessment'][Change.TYPE_WRITER] ?? [])
        }
        return sendingSuccessResult(response);
      }
      catch (error) {
        console.error(error);
        return sendingErrorResult(error);
      }
    },

    /**
     * Set the offset between server time and client time
     * The offset is used to calculate the correct remaining time of the task
     * The offset should be set from the response of a REST call
     * when the response data transfer is short (no files)
     */
    setTimeOffset(response) {
      if (response.headers['xlastime']) {
        const serverTimeMs = response.headers['xlastime'] * 1000;
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