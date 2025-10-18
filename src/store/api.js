import { defineStore } from 'pinia';
import axios from 'axios'
import Cookies from 'js-cookie';
import { useConfigStore } from "@/store/config";
import { useSettingsStore } from "@/store/settings";
import { useWriterStore } from "@/store/writer";
import { usePreferencesStore } from "@/store/preferences";
import { useTasksStore } from "@/store/tasks";
import { useLayoutStore } from "@/store/layout";
import { useResourcesStore } from "@/store/resources";
import { useEssayStore } from "@/store/essay";
import { useNotesStore } from "@/store/notes";
import { useAlertStore } from "@/store/alerts";
import { useChangesStore } from "@/store/changes";
import { useAnnotationsStore } from '@/store/annotations';

import md5 from 'md5';
import Change from "@/data/Change";
import SendingResult from "@/data/SendingResult";

const syncInterval = 5000;      // time (ms) to wait for syncing with the backend


function getSendingResultFromError(error) {
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

/**
 * API Store
 * Handles the communication with the backend
 */
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
      initialized: false,                 // used to switch from startup screen to the editing view
      review: false,                      // used to switch to the review and confirmation for a final submission
      showInitFailure: false,             // show a message that the initialisation failed
      showReplaceConfirmation: false,     // show a confirmation that the stored data should be replaced by another task or user
      showReloadConfirmation: false,      // show a confirmation that all data for the same task and user shod be reloaded from the server
      showFinalizeFailure: false,         // show a failure message for the final saving
      showAuthorizeFailure: false,        // show a failure message for the final authorization

      // should be unified in the next version
      lastStepsTry: 0,                    // timestamp of the last try to send writing steps
      lastChangesTry: 0,                  // timestamp of the last try to send changes
    }
  },

  /**
   * Getter functions (with params) start with 'get', simple state queries not
   */
  getters: {

    isAllSent: state => {
      const essayStore = useEssayStore();
      const changesStore = useChangesStore();
      return !state.isSending && essayStore.openSendings + changesStore.countChanges == 0;
    },

    isSending: state => {
      state.lastChangesTry > 0 || state.lastStepsTry > 0;
    },

    getRequestConfig: state => {

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

    getResourceUrl: state => {

      /**
       * Get the Url for loading a file ressource
       * @param {string}  resourceKey
       */
      const fn = function (resourceKey) {
        const config = this.getRequestConfig(this.fileToken);
        return config.baseURL + '/writer/file/' + resourceKey + '?' + config.params.toString();
      }
      return fn;
    },

    getServerTime: state => {

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


    getChangeDataToSend: state => {

      /**
       * Get the data of a change to be sent to the backend
       * @param {Change} change
       * @param {object|null} payload
       */
      const fn = function (change, payload = null) {
        const data = change.getData();
        if (payload) {
          data.payload = payload;
        }
        data.server_time = state.getServerTime(change.last_change);
        return data;
      }
      return fn;
    }


  },


  actions: {

    /**
     * Init the state
     * Take the state from the cookies or local store
     * Trigger a reload of all data if cookie values differ from local store
     */
    async init() {

      let newContext = false;
      let lastHash = Cookies.get('xlasLastHash');

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
        this.showInitFailure = true;
        return;
      }

      const essayStore = useEssayStore();
      const changesStore = useChangesStore();

      if (newContext) {
        // switching to a new task or user always requires a load from the backend
        // be shure that existing data is not unintentionally replaced

        if (await essayStore.hasUnsentSavingsInStorage()
          || changesStore.countChanges > 0) {
          console.log('init: new context, open savings');
          this.showReplaceConfirmation = true;
        } else {
          console.log('init: new context, no open savings');
          await this.loadDataFromBackend();
        }
      } else if (lastHash) {
        // savings already exists on the server
        // check that it matches with the data in the app

        if (await essayStore.hasHashInStorage(lastHash)) {
          console.log('init: same context, same hash');
          await this.loadDataFromStorage();
        } else if (await essayStore.hasUnsentSavingsInStorage()
          || changesStore.countChanges > 0) {
          console.log('init: same context, hashes differ, open savings');
          this.showReloadConfirmation = true;
        } else {
          console.log('init: same context, hashes differ, no open savings');
          await this.loadDataFromBackend();
        }
      } else {
        // no savings exist on the server
        // check if data is already entered but not sent

        if (await essayStore.hasUnsentSavingsInStorage()
          || changesStore.countChanges > 0) {
          console.log('init: same context, no server hash, open savings');
          await this.loadDataFromStorage();
        } else {
          console.log('init: same context, no server hash, no open savings');
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

      const settingsStore = useSettingsStore();
      const preferencesStore = usePreferencesStore();
      const tasksStore = useTasksStore();
      const alertStore = useAlertStore();
      const resourcesStore = useResourcesStore();
      const essayStore = useEssayStore();
      const notesStore = useNotesStore();
      const layoutStore = useLayoutStore();
      const changesStore = useChangesStore();
      const annotationsStore = useAnnotationsStore();

      await settingsStore.loadFromStorage();
      await preferencesStore.loadFromStorage();
      await tasksStore.loadFromStorage();
      await alertStore.loadFromStorage();
      await resourcesStore.loadFromStorage();
      await essayStore.loadFromStorage();
      await notesStore.loadFromStorage();
      await notesStore.prepareNotes(settingsStore.notice_boards);
      await layoutStore.loadFromStorage();
      await changesStore.loadFromStorage();
      await annotationsStore.loadFromStorage();


      // directy check for updates of task settings to avoid delay
      await this.loadUpdateFromBackend();
      await layoutStore.initialize();
      this.initialized = true;
    },


    /**
     * Load all data from the backend
     */
    async loadDataFromBackend() {

      console.log("loadDataFromBackend...");
      this.updateConfig();

      let response = {};
      try {
        response = await axios.get('/writer/data', this.getRequestConfig(this.dataToken));
        this.setTimeOffset(response);
        this.refreshToken(response);
      }
      catch (error) {
        console.error(error);
        this.showInitFailure = true;
        return;
      }

      console.log(response.data);

      const configStore = useConfigStore();
      const settingsStore = useSettingsStore();
      const writerStore = useWriterStore();
      const preferencesStore = usePreferencesStore();
      const tasksStore = useTasksStore();
      const alertStore = useAlertStore();
      const resourcesStore = useResourcesStore();
      const essayStore = useEssayStore();
      const notesStore = useNotesStore();
      const changesStore = useChangesStore();
      const layoutStore = useLayoutStore();
      const annotationsStore = useAnnotationsStore();

      await configStore.loadFromBackend(response.data['Assessment']['Config']);
      await writerStore.loadFromBackend(response.data['Assessment']['Writer']);
      await tasksStore.loadFromBackend(response.data['Task']['Tasks']);
      await settingsStore.loadFromBackend(response.data['EssayTask']['WritingSettings']);
      await preferencesStore.loadFromBackend(response.data['EssayTask']['WriterPrefs']);
      // await alertStore.loadFromData(response.data.alerts, false);
      // await resourcesStore.loadFromData(response.data.resources);
      // await essayStore.loadFromData(response.data.essay);
      // await notesStore.loadFromData(response.data.notes);
      // await notesStore.prepareNotes(settingsStore.notice_boards);
      // await annotationsStore.loadFromData(response.data.annotations);

      await changesStore.clearStorage();
      await layoutStore.initialize();

      // send the time when the working on the task is started
      if (!writerStore.working_start ?? false) {
        await this.sendStart();
      }
      this.initialized = true;
    },

    /**
     * Check for updates from the backend
     * - new writing end
     * - messages
     * - settings
     */
    async loadUpdateFromBackend() {

      // don't interfer with a running request
      if (this.lastChangesTry > 0) {
        return false;
      }
      this.lastChangesTry = Date.now();

      try {
        const response = await axios.get('/writer/update', this.getRequestConfig(this.dataToken));
        this.setTimeOffset(response);
        this.refreshToken(response);

        const configStore = useConfigStore();
        const settingsStore = useSettingsStore();
        const writerStore = useWriterStore();
        const tasksStore = useTasksStore();
        const alertStore = useAlertStore();
        const notesStore = useNotesStore();
        await configStore.loadFromBackend(response.data['Assessment']['Config']);
        await writerStore.loadFromBackend(response.data['Assessment']['Writer']);
        await tasksStore.loadFromBackend(response.data['Task']['Tasks']);
        await settingsStore.loadFromBackend(response.data['EssayTask']['WritingSettings']);
        await preferencesStore.loadFromBackend(response.data['EssayTask']['WriterPrefs']);
        // await alertStore.loadFromData(response.data.alerts, true);
        // await settingsStore.loadFromBackend(response.data);
        // await notesStore.prepareNotes(settingsStore.notice_boards);

        this.lastChangesTry = 0;
        return true;
      }
      catch (error) {
        console.error(error);
        this.lastChangesTry = 0;
        return false;
      }
    },

    /**
     * Send the time when the editing has started
     */
    async sendStart() {

      let response = {};
      let data = {
        started: this.getServerTime(Date.now())
      }
      try {
        response = await axios.put('/writer/start', data, this.getRequestConfig(this.dataToken));
        this.setTimeOffset(response);
        this.refreshToken(response);
        return true;
      }
      catch (error) {
        console.error(error);
        this.showInitFailure = true;
        return false;
      }
    },


    /**
     * Save the writing steps to the backend
     * @param WritingStep[] steps
     * @return SendingResult
     */
    async saveWritingStepsToBackend(steps) {
      let response = {};
      let data = {
        steps: steps.map(step => step.getData())
      }

      this.lastStepsTry = Date.now();
      try {
        response = await axios.put('/writer/steps', data, this.getRequestConfig(this.dataToken));
        this.setTimeOffset(response);
        this.refreshToken(response);
        this.lastStepsTry = 0;
        return new SendingResult({
          success: true,
          message: response.statusText,
          details: response.data
        })
      }
      catch (error) {
        this.lastStepsTry = 0;
        return getSendingResultFromError(error);
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
      const annotationsStore = useAnnotationsStore();
      const changesStore = useChangesStore();
      const notesStore = useNotesStore();
      const preferencesStore = usePreferencesStore();

      // wait up to seconds for a running request to finish before giving up
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

      if (changesStore.countChanges > 0) {
        this.lastChangesTry = Date.now();

        try {
          const data = {
            annotations: await annotationsStore.getChangedData(this.lastChangesTry),
            notes: await notesStore.getChangedData(this.lastChangesTry),
            preferences: await preferencesStore.getChangedData(this.lastChangesTry)
          };

          const response = await axios.put('/writer/changes', data, this.getRequestConfig(this.dataToken));
          this.setTimeOffset(response);
          this.refreshToken(response);

          await changesStore.setChangesSent(Change.TYPE_ANNOTATIONS,
              response.data.annotations,
              this.lastChangesTry);
          await changesStore.setChangesSent(Change.TYPE_NOTES,
            response.data.notes,
            this.lastChangesTry);
          await changesStore.setChangesSent(Change.TYPE_PREFERENCES,
            response.data.preferences,
            this.lastChangesTry);

          this.lastChangesTry = 0;
          return new SendingResult({
            success: true,
            message: response.statusText,
            details: response.data
          })
        }
        catch (error) {
          this.lastChangesTry = 0;
         return getSendingResultFromError(error);
        }
      }

      return null;
    },


    /**
     * Save the final authorization to the backend
     * @param WritingStep[] steps
     * @param string content
     * @param string hash
     * @param bool authorized
     */
    async saveFinalContentToBackend(steps, content, hash, authorized) {
      let response = {};
      let data = {
        steps: steps.map(step => step.getData()),
        content: content,
        hash: hash,
        authorized: authorized
      }
      try {
        response = await axios.put('/final', data, this.getRequestConfig(this.dataToken));
        this.refreshToken(response);
        return true;
      }
      catch (error) {
        console.error(error);
        return false;
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
      Cookies.remove('xlasHash');

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
     * Finalize the writing
     * This is called from the final review screen
     * The written content is sent to the server and the local storage is cleared
     * @param {boolean} authorize the final content should be authorized for correction
     */
    async finalize(authorize) {

      const settingsStore = useSettingsStore();
      const tasksStore = useTasksStore();
      const resourcesStore = useResourcesStore();
      const essayStore = useEssayStore();
      const notesStore = useNotesStore();
      const layoutStore = useLayoutStore();
      const alertStore = useAlertStore();
      const changesStore = useChangesStore();

      if (authorize || essayStore.openSendings > 0) {
        if (!await this.saveFinalContentToBackend(
          essayStore.unsentHistory,
          essayStore.storedContent,
          essayStore.storedHash,
          authorize,
        )) {
          this.review = true
          this.showFinalizeFailure = true
          this.showAuthorizeFailure = authorize
          return;
        }
      }

      await settingsStore.clearStorage();
      await tasksStore.clearStorage();
      await resourcesStore.clearStorage();
      await essayStore.clearStorage();
      await notesStore.clearStorage();
      await layoutStore.clearStorage();
      await alertStore.clearStorage();
      await changesStore.clearStorage();
      localStorage.clear();

      window.location = this.returnUrl;
    },

    /**
     * Retry the final transmission
     * This is called from the review screen
     * A retry should not authorize and close the writer
     * Instead the review screen is shown again and allows to auhorize
     */
    async retry() {

      const essayStore = useEssayStore();
      if (await this.saveFinalContentToBackend(
        essayStore.unsentHistory,
        essayStore.storedContent,
        essayStore.storedHash,
        false,
      )) {
        await essayStore.setAllSavingsSent();
      } else {
        this.showFinalizeFailure = true
      }

      this.review = true;
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
