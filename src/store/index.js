import { useAlertStore } from "@/store/alerts";
import { useAnnotationsStore } from '@/store/annotations';
import { useApiStore } from '@/store/api';
import { useChangesStore } from "@/store/changes";
import { useClipboardStore } from "@/store/clipboard";
import { useConfigStore } from "@/store/config"
import { useEssayStore } from "@/store/essay";
import { useLayoutStore } from "@/store/layout";
import { useNotesStore } from "@/store/notes";
import { usePreferencesStore } from "@/store/preferences";
import { useResourcesStore } from "@/store/resources";
import { useSettingsStore } from "@/store/settings";
import { useStepsStore } from "@/store/steps";
import { useTasksStore } from "@/store/tasks";
import { useWriterStore } from "@/store/writer";

/**
 * Service locator for pinia stores
 */
export const stores = {
    alert: () => useAlertStore(),
    annotations: () => useAnnotationsStore(),
    api: () => useApiStore(),
    changes: () => useChangesStore(),
    clipboard: () => useClipboardStore(),
    config: () => useConfigStore(),
    essay: () => useEssayStore(),
    layout: () => useLayoutStore(),
    notes: () => useNotesStore(),
    preferences: () => usePreferencesStore(),
    resources: () => useResourcesStore(),
    settings: () => useSettingsStore(),
    steps: () => useStepsStore(),
    tasks: () => useTasksStore(),
    writer: () => useWriterStore()
}

/**
 * Clear all data of the stores
 */
export async function clearAllStores() {
    for (const key of Object.values(stores)) {
        const store = key();
        store.clearStorage();
    }
}
