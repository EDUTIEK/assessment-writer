<script setup>
/**
 * Help button and dialog in the app bar
 */
import {stores} from "@/store";

const layoutStore = stores.layout();

</script>

<template>
  <v-btn class="app-header-item" @click="layoutStore.showHelp=true">
    <v-icon left icon="mdi-keyboard-outline"></v-icon>
    {{ $t('helpButton') }}
  </v-btn>

  <v-dialog v-model="layoutStore.showHelp" max-width="1000">
    <v-card>
      <v-card-text>
        <h1>{{ $t('helpGeneralNavigation') }}</h1>
        <v-table>
          <thead>
          <tr>
            <th width="50%">{{ $t('helpAction') }}</th>
            <th width="50%">{{ $t('helpShortcut') }}</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>{{ $t('helpNextElement') }}</td>
            <td>{{ $t('helpKeyTab') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpPreviousElement')}}</td>
            <td>{{ $t('helpKeyShiftTab') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpHeaderButtons') }}</td>
            <td>{{ $t('helpKeyAlt0') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpNavigationButtons') }}</td>
            <td>{{ $t('helpKeyAltNum') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpContentLeftColumn') }}</td>
            <td>{{ $t('helpKeyAlt1') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpContentRightColumn') }}</td>
            <td>{{ $t('helpKeyAlt2') }}</td>
          </tr>
          </tbody>

        </v-table>

        <h1>{{ $t('helpEditorNavigation') }}</h1>

        <v-table>
          <thead>
          <tr>
            <th width="50%">{{ $t('helpAction') }}</th>
            <th width="50%">{{ $t('helpShortcut') }}</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>{{ $t('helpToolbarFocusIn') }}</td>
            <td>{{ $t('helpKeyAltF10') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpToolbarFocusOut') }}</td>
            <td>{{ $t('helpKeyEsc') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpToolbarNavigate') }}</td>
            <td>{{ $t('helpKeysLeftRight') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpPopupBlockFormatsShow') }}</td>
            <td>{{ $t('helpKeyReturn') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpPopupBlockFormatsNavigate') }}</td>
            <td>{{ $t('helpKeysUpDown') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpPopupBlockFormatsSelect') }}</td>
            <td>{{ $t('helpKeyReturn') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpPopupBlockFormatsClose') }}</td>
            <td>{{ $t('helpKeyEsc') }}</td>
          </tr>

          </tbody>
        </v-table>

        <h1>{{  $t('helpEditorCommands')  }}</h1>
        <v-table>
          <thead>
          <tr>
            <th width="50%">{{ $t('helpAction') }}</th>
            <th width="50%">{{ $t('helpShortcut') }}</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>{{ $t('helpCommandBold') }}</td>
            <td>{{ $t('Ctrl + B') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandItalic') }}</td>
            <td>{{ $t('helpKeyCtrlI') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommundUnderline') }}</td>
            <td>{{ $t('Ctrl + U') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandSelectAll') }}</td>
            <td>{{ $t('Ctrl + A') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandRedo') }}</td>
            <td>{{ $t('helpKeyCtrlYOrCtrlShiftZ') }}</td>
          </tr>
          <tr>
            <td>{{ $t('Rückgängig machen' )}}</td>
            <td>{{ $t('Ctrl + Z') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandH1') }}</td>
            <td>{{ $t('helpKeyShiftAlt1') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandH2') }}</td>
            <td>{{ $t('helpKeyShiftAlt2') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandH3') }}</td>
            <td>{{ $t('helpKeyShiftAlt3') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandH4') }}</td>
            <td>{{ $t('helpKeyShiftAlt4') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandH5') }}</td>
            <td>{{ $t('helpKeyShiftAlt5') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandH6') }}</td>
            <td>{{ $t('helpKeyShiftAlt6') }}</td>
          </tr>
          <tr>
            <td>{{ $t('helpCommandParagraph') }}</td>
            <td>{{ $t('helpKeyShiftAlt7') }}</td>
          </tr>
          </tbody>
        </v-table>

      </v-card-text>
      <v-card-actions>
        <v-btn @click="layoutStore.showHelp=false">
          <span>{{ $t('helpCloseHelp') }}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<style scoped>
h1 {
  font-size: 1.5rem;
}
</style>
