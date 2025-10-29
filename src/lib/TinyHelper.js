import tinymce from "tinymce";
import {useSettingsStore} from "@/store/settings";
import {useClipboardStore} from "@/store/clipboard";
import {usePreferencesStore} from "@/store/preferences";
import {nextTick, ref, watch} from 'vue';
import i18n from "@/plugins/i18n";

let settingsStore;
let clipboardStore;
let preferencesStore;

const { t } = i18n.global

export default class TinyHelper {

    editor_id = null;
    editor = null;
    scroll_top = 0;
    scroll_left = 0;

    wordCount = ref(0);
    characterCount = ref(0);

    constructor(editor_id) {
        this.editor_id = editor_id;

        settingsStore = useSettingsStore();
        clipboardStore = useClipboardStore();
        preferencesStore = usePreferencesStore();
    }

    getInit() {
        return {
            license_key: 'gpl',
            language: 'de',
            height: '100%',
            menubar: false,
            statusbar: false,
            statusbar: false,
            plugins: 'lists charmap wordcount table pagebreak',
            toolbar1: 'undo redo styles bold italic underline bullist numlist forecolor backcolor removeformat charmap table pagebreak wordcount',
            pagebreak_split_block: true,
            // valid_elements: settingsStore.tinyValidElements,
            // formats: settingsStore.tinyFormats,
            // style_formats: settingsStore.tinyStyles,
            custom_undo_redo_levels: 10,
            text_patterns: false,
            skin: 'default',
            content_css: 'default',
            content_style: settingsStore.tinyContentStyle,
            browser_spellcheck: settingsStore.allow_spellcheck,
            highlight_on_focus: true,
            iframe_aria_text: t('tinyHelperIframeAriaText'),
            paste_as_text: false,         // keep formats when copying between clipboards
            paste_block_drop: true,       // prevent unfiltered content from drag & drop
            paste_merge_formats: true,    // default
            paste_tab_spaces: 4,          // default
            smart_paste: false,           // don't create hyperlinks automatically
            paste_data_images: false,     // don't paste images
            paste_remove_styles_if_webkit: true,  // default
            paste_webkit_styles: 'none',          // default
            paste_preprocess: this.handlePaste
        }
    }

    /**
     * Init the editor
     * To be called from the init event handler
     * Can't be used directly used as handler
     */
    init() {
        this.editor = tinymce.get(this.editor_id);
        const window = this.editor.getWin();
        window.addEventListener('scroll', this.saveScrolling.bind(this));

        this.applyZoom();
        this.applyFormat();
        this.applyWordCount();
    }

    /**
     * Handle copy to the clipboard
     * @param {ClipboardEvent} event
     */
    handleCopy(event) {
        clipboardStore.setContent(event.clipboardData.getData('text/html'));
    }

    /**
     * Check if paste is allowed (called from tiny plugin)
     */
    handlePaste(plugin, args) {
        if (!clipboardStore.getPasteAllowed(args.content)) {
            args.content = '';
            clipboardStore.showWarning();
        }
    }

    /**
     * Set the focus to the editor
     */
    async applyFocus() {
        try {
            await nextTick();
            this.editor.focus();
        } catch (e) {
        }
    }


    /**
     * Add classes for the headline styles to the overlay element of the tiny menu
     */
    applyFormat() {
        if (settingsStore.contentClass) {
            for (const element of document.getElementsByClassName('tox-tinymce-aux')) {
                element.classList.add(settingsStore.contentClass);
            }
        }
    }

    /**
     * Apply a zoom level to the elements in the editor
     */
    applyZoom() {
        try {
            this.editor.dom.setStyle(this.editor.dom.doc.body, 'font-size', (preferencesStore.editor_zoom) + 'rem');
            this.editor.dom.setStyle(this.editor.dom.select('h1'),
                'font-size',
                (preferencesStore.editor_zoom * settingsStore.tinyH1Size) + 'rem');
            this.editor.dom.setStyle(this.editor.dom.select('h2'),
                'font-size',
                (preferencesStore.editor_zoom * settingsStore.tinyH2Size) + 'rem');
            this.editor.dom.setStyle(this.editor.dom.select('h3'), 'font-size', (preferencesStore.editor_zoom) + 'rem');
            this.editor.dom.setStyle(this.editor.dom.select('h4'), 'font-size', (preferencesStore.editor_zoom) + 'rem');
            this.editor.dom.setStyle(this.editor.dom.select('h5'), 'font-size', (preferencesStore.editor_zoom) + 'rem');
            this.editor.dom.setStyle(this.editor.dom.select('h6'), 'font-size', (preferencesStore.editor_zoom) + 'rem');
        } catch (e) {
        }
    }

    saveScrolling() {
        const window = this.editor.getWin();
        if (window.scrollX > 0 || window.scrollY > 0) {
            this.scroll_left = window.scrollX;
            this.scroll_top = window.scrollY;
        }
    }

    /**
     * Workaround for a TinyMCE bug in Chrome that set scrolling to top if editor is shown
     * This bug is fixed in TinyMCE 7.9.0
     * It can't be updated before it is supported by tinymce-vue
     */
    restoreScrolling() {
        try {
            const window = this.editor.getWin();
            window.scroll({left: this.scroll_left, top: this.scroll_top});
        }
        catch(e) {
            console.log(e);
        }
    }

    /**
     * Fix for dragon extension in chrome browser
     * CAUTION: this causes strange effects - do not use!
     */
    applyScrolling() {
        try {
            const selection = this.editor.selection.getNode();

            // not available in all browsers
            // if (Element.prototype.scrollIntoViewIfNeeded) {
            // }

            const selRect = selection.getBoundingClientRect();
            const contRect = this.editor.getContentAreaContainer().getBoundingClientRect();
            if (selRect.top < contRect.top || selRect.bottom > contRect.bottom
                || selRect.right > contRect.right || selRect.left < contRect.left) {
                selection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Update the word counter
     */
    applyWordCount() {
        try {
            const plugin = this.editor.plugins.wordcount;
            this.wordCount.value = plugin.body.getWordCount();
            this.characterCount.value = plugin.body.getCharacterCount();
        } catch (e) {
        }
    }
}
