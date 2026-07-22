/**
 * Helper for use of TinyMCE in components
 */
import {stores} from "@/store";
import i18n from "@/plugins/i18n";
import {nextTick, ref, watch} from 'vue';
import contentCss from '@/styles/content.css?inline';

import tinymce from "tinymce";
import 'tinymce/icons/default/icons.min.js';
import 'tinymce/themes/silver/theme.min.js';
import 'tinymce/models/dom/model.min.js';

import 'tinymce/skins/ui/oxide/skin.js';
import 'tinymce/skins/ui/oxide/content.js';
import 'tinymce/skins/content/default/content.js';

import '@/plugins/tiny_de.js';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/table';
import 'tinymce/plugins/pagebreak';

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

        settingsStore = stores.settings();
        clipboardStore = stores.clipboard();
        preferencesStore = stores.preferences();
    }

    getInit() {
        return {
            license_key: 'gpl',
            language: 'de',
            height: '100%',
            menubar: false,
            statusbar: false,
            body_class: 'xlas-content ' + settingsStore.contentClass,     // used by content.css
            plugins: 'lists charmap wordcount table pagebreak',
            toolbar: this.tinyToolbar(settingsStore.formatting_options),
            toolbar_mode: 'wrap',
            valid_elements: this.tinyValidElements(settingsStore.formatting_options),
            valid_styles: this.tinyValidStyles(settingsStore.formatting_options),
            formats: this.tinyFormats(),
            style_formats: this.tinyStyleFormats(settingsStore.formatting_options, settingsStore.headline_scheme),
            text_patterns: false,
            skin_url: 'default',
            content_css: 'default',
            content_style: contentCss.toString(),
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
            paste_preprocess: this.handlePaste,
            table_appearance_options: false,
            table_tab_navigation: true,
            table_advtab: false,
            table_cell_advtab: false,
            table_row_advtab: false,
            table_sizing_mode: 'responsive',
            table_default_styles: {},         // no inline styles on new tables
            table_default_attributes: {},      // no default attributes like width
            table_resize_bars: false,
            table_toolbar: 'tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol  | tablecellbackgroundcolor',
            pagebreak_separator: '<hr>',
            pagebreak_split_block: true,  // ensures clean split, important for xsl in backend
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
                element.classList.add('xlas-content');
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

    tinyToolbar(formatting_options) {
        switch (formatting_options) {
            case 'extended':
                return 'undo redo styles bold italic underline bullist numlist indent outdent forecolor backcolor removeformat charmap table pagebreak wordcount'
            case 'full':
                return 'undo redo styles bold italic underline bullist numlist removeformat charmap wordcount';
            case 'medium':
                return 'undo redo bold italic underline bullist numlistremoveformat charmap wordcount';
            case 'minimal':
                return 'undo redo bold italic underline removeformat charmap wordcount';
            case 'none':
            default:
                return 'undo redo charmap wordcount';
        }
    }

    /**
     * @see https://www.tiny.cloud/docs/configure/content-filtering/#valid_elements
     */
    tinyValidElements(formatting_options) {
        switch (formatting_options) {
            case 'extended':
                return '@[style|border|colspan|rowspan],'
                  // #td/#th: pad empty cells with &nbsp; so caret/arrow-key navigation works after reload
                  // (fresh inserts already get this; loaded HTML with custom valid_elements does not otherwise)
                    + 'p/div,br,strong/b,em/i,u,s,ol,ul,li,h1,h2,h3,h4,h5,h6,pre,code,blockquote,span,sub,sup,table,thead,tbody,#th,tr,#td,hr,'
                    + 'img[class<mce-pagebreak|src|data-mce-resize|data-mce-placeholder|data-mce-selected]';
            case 'full':
                return 'p/div,br,strong/b,em/i,u,ol,ul,li,h1,h2,h3,h4,h5,h6,pre';
            case 'medium':
                return 'p/div,br,strong/b,em/i,u,ol,ul,li';
            case 'minimal':
                return 'p/div,p/li,br,strong/b,em/i,u';
            case 'none':
            default:
                return 'p/div,p/li,br';
        }
    }

    tinyValidStyles(formatting_options) {
        switch (formatting_options) {
            case 'extended':
                return {
                    '*': 'background-color,background,color,text-align,mce-pagebreak,padding-left'
                };
            default:
                return {};
        }
    }

    tinyStyleFormats(formatting_options, headline_scheme) {

        const headings = {title: t('settingsHeadings'), items: [] };
        switch (headline_scheme) {
            case 'single':
                headings.items = [
                    { title: t('settingsHeadings'), format: 'h1' },
                ];
                break;
            case 'three':
                headings.items = [
                    { title: t('settingsHeading1'), format: 'h1' },
                    { title: t('settingsHeading2'), format: 'h2' },
                    { title: t('settingsHeading3'), format: 'h3' },
                ];
                break;
            default:
                headings.items = [
                    { title: t('settingsHeading1'), format: 'h1' },
                    { title: t('settingsHeading2'), format: 'h2' },
                    { title: t('settingsHeading3'), format: 'h3' },
                    { title: t('settingsHeading4'), format: 'h4' },
                    { title: t('settingsHeading5'), format: 'h5' },
                    { title: t('settingsHeading6'), format: 'h6' },
                ];
        }

        const inline = {title: t('settingsInline'), items: [] };
        switch (formatting_options) {
            case 'extended':
                inline.items = [
                    { title: t('settingsBold'), format: 'bold' },
                    { title: t('settingsItalic'), format: 'italic' },
                    { title: t('settingsUnderline'), format: 'underline' },
                    { title: t('settingsStrikethrough'), format: 'strikethrough' },
                    { title: t('settingsSuperscript'), format: 'superscript' },
                    { title: t('settingsSubscript'), format: 'subscript' },
                    { title: t('settingsCode'), format: 'code' }
                ];
                break;
            case 'full':
            case 'medium':
            case'minimal':
                inline.items = [
                    { title: t('settingsBold'), format: 'bold' },
                    { title: t('settingsItalic'), format: 'italic' },
                    { title: t('settingsUnderline'), format: 'underline' },
                ];
                break;
        }

        const blocks = { title: t('settingsBlocks'), items: [] };
        switch (formatting_options) {
            case 'extended':
                blocks.items = [
                    { title: t('settingsParagraph'), format: 'p' },
                    { title: t('settingsBlockquote'), format: 'blockquote' },
                    { title: t('settingsPre'), format: 'pre' },
                ];
                break;
            case 'full':
                blocks.items = [
                    { title: t('settingsParagraph'), format: 'p' },
                    { title: t('settingsPre'), format: 'pre' },
                ];
                break;
            case 'medium':
            case 'minimal':
                blocks.items = [
                    { title: t('settingsParagraph'), format: 'p' },
                ];
                break;
        }

        const align = { title: t('settingsAlign'), items: [] };
        switch (formatting_options) {
            case 'extended':
                align.items = [
                    { title: t('settingsAlignLeft'), format: 'alignleft' },
                    { title: t('settingsAlignCenter'), format: 'aligncenter' },
                    { title: t('settingsAlignRight'), format: 'alignright' },
                    { title: t('settingsAlignJustify'), format: 'alignjustify' }
                ];
                break;
        }

        const formats = [];
        if (headings.items.length) {
            formats.push(headings);
        }
        if (inline.items.length) {
            formats.push(inline);
        }
        if (blocks.items.length) {
            formats.push(blocks);
        }
        if (align.items.length) {
            formats.push(align);
        }

        return formats;
    }

    /**
     * @see https://www.tiny.cloud/docs/configure/content-formatting/#formats
     */
    tinyFormats() {
        return {
            underline: { inline: 'u', remove: 'all' },
            strikethrough: { inline: 's', remove: 'all' }
        }
    }
}
