<script setup>
/**
 * Counter of remaining working time shown in the app bar
 * can be hidden
 */
import i18n from "@/plugins/i18n";
import {stores} from "@/store";
import {ref, watch} from 'vue';

const writerStore = stores.writer();
const layoutStore = stores.layout();
const { t } = i18n.global;

const liveMessage = ref('');
const urgentLiveMessage = ref('');

/**
 *
 * @param int timespan  seconds
 * @returns {string}
 */
function formatTimespan(timespan) {
  const seconds = ('00' + (Math.floor(timespan) % 60)).slice(-2);
  const minutes = ('00' + (Math.floor(timespan / 60) % 60)).slice(-2);
  const hours = ('00' + (Math.floor(timespan / 3600) % 24)).slice(-2);
  const days = Math.floor(timespan / 86400);

  if (days > 1) {
    return days + ' Tage ' + hours + ' Stunden';
  } else if (days > 0) {
    return days + ' Tag ' + hours + ' Stunden';
  } else if (hours != '00') {
    return hours + ':' + minutes + ':' + seconds + ' Stunden'; // todo: don't show seconds
  } else if (minutes != '00') {
    return minutes + ':' + seconds + ' Minuten';              // todo: don't show seconds
  } else {
    return seconds + ' Sekunden';
  }
}

function announceRemainingTime() {
  if (layoutStore.showTimer && writerStore.remaining_time !== null && !writerStore.writingEndReached) {
    liveMessage.value = t('timerLiveRemaining', { time: formatTimespan(writerStore.remaining_time) });
  }
}

watch(() => writerStore.writingEndReached, (reached) => {
  if (reached) {
    urgentLiveMessage.value = t('reviewContentTimeOver');
  }
});

watch(() => layoutStore.showTimer, (shown) => {
  if (shown) {
    announceRemainingTime();
  }
});

</script>


<template>
  <v-btn class="app-header-item" @click="layoutStore.toggleTimer()" v-show="!writerStore.writingEndReached">
    <v-icon left icon="mdi-clock-outline"></v-icon>
    <span v-show=layoutStore.showTimer>{{ formatTimespan(writerStore.remaining_time) }}</span>
    <span v-show=!layoutStore.showTimer>Restzeit</span>
  </v-btn>
  <span class="sr-only" aria-live="assertive" aria-atomic="true">{{ urgentLiveMessage }}</span>
  <span class="sr-only" aria-live="polite" aria-atomic="true">{{ liveMessage }}</span>
</template>


<style scoped>

</style>
