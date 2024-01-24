/**
 * Default configuration options for Web Hotkeys.
 *
 * @typedef {Object} WebHotkeysDefaults
 * @property {boolean} [grabF1=true] Put basic help text under F1
 * @property {boolean} [replaceAccesskeys=true] If true, [accesskey] elements will be converted to hotkeys.
 * @property {boolean} [observe=true] Monitors DOM changes. Automatically un/grab hotkeys as DOM elements with the given selector dis/appear.
 * @property {string} [selector='data-hotkey']  Attribute name to link DOM elements to shorcuts.
 * @property {string} [selectorGroup='data-hotkey-group']  Attribute name to link DOM elements to shorcut groups.
 * @property {string|boolean} [hint='title'] Values: 'title', 'text', false. Append shorcut text to the element title (ex: 'anchor (Alt+1)') or its text (or its label for the case of a form element). (TODO docs)
 *
 */
const WebHotkeysDefaults = {
    replaceAccesskeys: true, grabF1: true,
    selector: "data-hotkey", selectorGroup: 'data-hotkey-group',
    observe: true, hint: "title"
}

/**
 * Like KeyboardEvent but does not have guaranteed to contain all info.
 * Ex: {"code": "Digit1", "altKey": true} (missing shiftKey)
 * @typedef {KeyboardEvent} KeyEvent
 */
/** Key combination. Either event.code "Digit1", event.key "1" or a combination with a modifier "Ctrl+Digit1"
 * @typedef {string} Key
 */
/** @typedef {HTMLElement|Function} ResolvedAction An element or a callback function. */
/** @typedef {ResolvedAction|string} Action An element, its selector or a callback function. */
/**
 * Key letter combined with modifiers. Just because JS does not support tuple as a key dict.
 * @typedef {string} KeyState
 */
/**
 * Modifiers as a string. Just because JS does not support tuple as a key dict.
 * @typedef {string} ModState
 */

const FORM_TAGS = ["INPUT", "SELECT", "TEXTAREA"]

class Hotkey {
    /**
     *
     * @param {ResolvedAction} action
     * @param {string} hint
     * @param {Action} scope
     * @param {KeyEvent} event
     * @param {WebHotkeys} wh
     */
    constructor(action, hint, scope, event, wh) {
        this.action = action
        this.hint = hint
        this.scope = scope
        this.event = event
        this.wh = wh
        this.enabled = false
    }

    /**
    * Generate hotkey combination as text
    * @returns {string}
    */
    getHotkey(append_parenthesis = false) {
        const pre = (this.event.ctrlKey ? "Ctrl+" : "") + (this.event.shiftKey ? "Shift+" : "") + (this.event.altKey ? "Alt+" : "")
        const key = this.event.key || this.event.code.replace(/^Digit(\d)$/, "$1") // 'Alt+Digit1' -> 'Alt+1'
        if (append_parenthesis) {
            return ` (${pre + key})`
        }
        return pre + key
    }

    /**
     * @returns {KeyState}
     */
    get key_state() {
        return (this.event.key || this.event.code) + Hotkey.mod_state(this.event)
    }

    /**
     * @returns {Hotkey[]}
     */
    get registry() {
        return this.wh._hotkeys[this.key_state] ||= []
    }

    /**
     *
     * @param {KeyEvent} e
     * @returns {ModState}
     */
    static mod_state(e, supress_shift = false) {
        // If there ever be a clash between key and code, we might put a list into storage
        // and compare hotkeys like this: [modifiers] = [{key: 1}, {code: Digit1}]
        return String((supress_shift ? 0 : e.shiftKey << 3) | e.altKey << 2 | e.ctrlKey << 1 | e.metaKey)
    }

    enable() {
        this.enabled = true
        if (!this.registry.includes(this)) {
            this.registry.unshift(this)
        }
        return this
    }
    disable() {
        this.enabled = false
        this.registry.splice(this.registry.indexOf(this), 1)
        return this
    }
    toggle(enable = null) {
        enable === null && !this.enabled || enable ? this.enable() : this.disable()
        return this
    }
}

/**
 * @extends {Array<Hotkey>}
 */
class HotkeyGroup extends Array {
    enable() {
        this.forEach(hotkey => hotkey.enable())
        return this
    }
    disable() {
        this.forEach(hotkey => hotkey.disable())
        return this
    }
    toggle(enable = null) {
        this.forEach(hotkey => hotkey.toggle(enable))
        return this
    }
}

/**
 * Main interface to define hotkeys
 */
class WebHotkeys {
    /**
     * @param {WebHotkeysDefaults} options
     */
    constructor(options) {
        //
        // Definitions
        //
        options = this.options = { ...WebHotkeysDefaults, ...options }

        /**  @type {Object.<KeyState, Hotkey[]>} */
        this._hotkeys = {}
        /** @type {WeakMap.<HTMLElement, Hotkey>} Links DOM elements to its shorcuts. */
        this._dom = new WeakMap()

        /**  @type {Object.<string, Hotkey[]>} */
        this._groups = {}

        //
        // Helper methods
        //
        /**
         * @param {HTMLElement} el
         * @returns {boolean} Has [data-hotkey] attribute
         */
        const eligible = el => el.getAttribute?.(options.selector)?.length
        /** @param {HTMLElement} el Grab the element's [data-hotkey] attribute */
        const grab = el => this._dom.set(el, this.grab(el.getAttribute(options.selector), el.getAttribute("title"), el))

        //
        // Process options
        //
        if (options.replaceAccesskeys) {
            document.querySelectorAll("[accesskey]:not([accesskey=''])").forEach(el => {
                // if concurrent accesskeys exists, preventDefault of the WebHotkeys would make it to fire alongside the hotkey,
                // hence we transform accesskeys to hotkeys as well
                el.setAttribute(options.selector, "Alt+" + el.getAttribute("accesskey"))
                el.removeAttribute("accesskey")
            })
        }

        // Grabs all [data-hotkey] elements. Puts its title as a help text.
        document.querySelectorAll(`[${options.selector}]`).forEach(grab)

        if (options.grabF1) {
            this.grab("F1", "Help", () => alert(this.getText()))
        }

        if (options.observe) {
            // un/register hotkey on DOM change
            new MutationObserver(mutationList => {
                for (const mutation of mutationList) {
                    if (mutation.type === "attributes") {
                        const el = mutation.target
                        this._dom.get(el)?.disable() // old hotkey vanished
                        if (eligible(el)) { // new hotkey appeared
                            grab(el)
                        }
                    } else if (mutation.type === "childList") {
                        Array.from(mutation.addedNodes).filter(eligible).forEach(grab)
                        Array.from(mutation.removedNodes).filter(eligible).forEach(el => this._dom.get(el).disable())
                    }

                }
            }).observe(document, { attributeFilter: [options.selector], childList: true, subtree: true })
        }

        //
        // Start listening
        //
        document.addEventListener('keydown', e => this._trigger(e), true)
        return this
    }

    /**
     * XX if there are a lot of them, they are not displayed in the alert text
     * @returns {string} Help text to current hotkeys' map.
     */
    getText() {
        const all = Object.values(this._hotkeys).flat().filter(s => s.enabled)
        const enabled = new Set(all)
        const seen = new Set

        const grouped = Object.entries(this._groups).map(([name, group]) => {
            const list = group
                .filter(hotkey => enabled.has(hotkey)) // filter out disabled hotkeys
                .map(hotkey => {
                    seen.add(hotkey)
                    return `${hotkey.getHotkey()}: ${hotkey.hint}`
                })
            if (list.length) { // if at least one hotkey from a group remains enabled
                return `\n**${name}**\n` + list.join("\n")
            }
        })

        const ungrouped = all
            .filter(hotkey => !seen.has(hotkey))
            .map(hotkey => hotkey.hotkey_text() + ": " + hotkey.hint)

        return [...ungrouped, ...grouped].join("\n").trim()
    }

    /**
     * .grab(hotkey, [hint], action, [scope])
     *
     * @param {Key} hotkey
     * @param {string|Action} hintOrAction Either hint text or an action (if the action parameter stays undefined). (TODO docs)
     * @param {Action} action  What will happen on hotkey trigger.
     *   If action returns false, hotkey will be treated as non-existent and event will propagate further.
     *   If action is a HTMLElement, its click or focus method (form elements) is taken instead.
     *   If action is jQuery, its first HTMLElement is taken instead. (TODO NO jquery + into docs)
     * @param {?Action} scope Scope within the hotkey is allowed to be launched.
     *  The scope can be an HTMLElement that the active element is being search under when the hotkey triggers.
     *  The scope can an HTMLElement selector, does not have to exist at the shorcut definition time. (TODO docs scope gets rid of jQuery)
     *  The scope can be a function, resolved at the keystroke time. True means the scope matches. That way, you can implement negative scope.
     *  (Ex: down arrow should work unless there is DialogOverlay in the document root.)
     * @returns {Hotkey}
     */
    grab(hotkey, hintOrAction, action, scope = null) {
        const event = this._parseHotkey(hotkey)

        // juggle optional parameters
        if (action === undefined) {  // action parameter was not used - shift the others
            action = hintOrAction
            hintOrAction = ""
        }
        let error = !hotkey || !action
        if (isString(action)) {
            try {
                action = document.querySelector(action)
            } catch (e) {
                error = true
            }
        }
        if (error) {
            console.error(`WebHotkeys.js> Unknown action hotkey for action ${hotkey} ${action}`)
            return
        }

        const _hotkey = new Hotkey(action, hintOrAction, scope, event, this).enable()

        if (action instanceof HTMLElement) {
            if (!hintOrAction) {
                _hotkey.hint = action.title || action.innerText.substring(0, 50)
            }
            if (this.options.hint && !action.webhotkeys_displayed) {
                const hint = _hotkey.getHotkey(true)
                if (this.options.hint === "title") {
                    action.title += hint
                }
                else if (this.options.hint === "text") {
                    if (FORM_TAGS.includes(action.tagName)) {
                        if (action.labels?.[0]?.innerHTML) {
                            action.labels[0].innerHTML += hint
                        }
                    } else {
                        action.innerHTML += hint
                    }
                }
                action.webhotkeys_displayed = true // prevent from being written twice
            }
        }
        return _hotkey
    }

    /**
     * Grab multiple hotkeys at once. They are appended to a group.
     * @param {string} name Group name
     * @param {Array} definitions List of grab parameters. Ex: [["Ctrl+c", "Copy", callback], ["Ctrl+v", "Paste", callback]]
     * @returns {HotkeyGroup}
     */
    group(name, definitions) {
        return (this._groups[name] ||= new HotkeyGroup()).push(...definitions.map(d => this.grab(...d)))
    }

    /**
     *
     * @param {Key} hotkey Ex: Shift+s or Alt+Shift+Digit1
     * @returns {KeyEvent}
     */
    _parseHotkey(hotkey) {
        const modifiers = {
            "alt": "alt",
            "shift": "shift",
            "meta": "meta",
            "ctrl": "ctrl",
            "control": "ctrl",
        }
        const parts = hotkey.split('+')
        if (parts[parts.length - 1] === '' && parts[parts.length - 2] === '') { // handle the plus key
            parts.splice(parts.length - 2, 2, '+') // `Alt++` -> ["Alt", "", ""] -> ["Alt", "+"]
        }
        const key = parts.pop() // the last element is the actual key, ex: Shift+Digit1 -> Digit1
        const event = { [key.length > 1 ? "key" : "code"]: key } // {"key": "KeyF"} | {"code": "f"}

        parts.forEach(part => {
            const modifier = modifiers[part.toLowerCase()]
            if (modifier) {
                event[modifier + "Key"] = true // {"shiftKey": true}
            } else {
                console.warn(`Unknown modifier at ${hotkey}`)
            }
        })
        return event
    }

    /**
     * Looping over the items (yt tracks list, fb notification list...)
     * ∀ page can use this list helper that handles different sorts of menus.
     *
     * @param {String} query DOM selector of li or anchors
     * @param {String} currentSelector The part of selector, describing currently selected item. If not defined or null, the default is: ":focus".
     * @param {fn} changeFn Visitor called on change (when we go next or back). Receives (newEl, oldEl) and returns true if we should continue (and change currentSelector of the newEl and oldElement).
     * @param {boolean} handleUpDown If true, UP and DOWN key are bound to this item listing.
     * @returns {_List}
     *
     * @example wh.list("ul#list li, #div a").handleUpDown() will cycle amongst li-s and a-s at once, using the default (:focus) selector.
     */
    list(query, currentSelector = null, changeFn = null, handleUpDown = false) {
        if (typeof this._list === "undefined") {
            // constructor
            this._list = new _List(query, currentSelector, changeFn, this);
        }
        if (typeof query !== "undefined") {
            this._list.setQuery(query);
        }
        if (currentSelector) {
            this._list.setCurrentSelector(currentSelector);
        }
        if (changeFn) {
            this._list.setChangeFn(changeFn);
        }
        if (handleUpDown) {
            this._list.handleUpDown();
        }
        return this._list;
    }

    /**
     *
     * @param {KeyEvent} e
     * @returns {undefined|boolean}
     */
    _trigger(e) {
        // an input field has precedence over shorcuts
        // Ex: arrow hotkeys must not work, these control text caret
        if (!e.altKey
            && !e.metaKey
            && (// this is a mere letter (not Escape, F1... which anticipate a hotkey)
                e.key.length === 1
                // or a text editing keys that can take use of Ctrl (Left and Ctrl+Left is text editing)
                || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Delete", "Backspace"].includes(e.key)
                // or a text editing key that cannot take use of Ctrl (Enter is text editing, Ctrl+Enter is not)
                || ["Tab", "Enter"].includes(e.key) && !e.ctrlKey
            )
            && FORM_TAGS.includes(document.activeElement.tagName)
            && document.activeElement.type !== "checkbox") {
            return
        }

        // First check whether a `code` hotkey was defined (`Alt+Digit1`).
        // If not, try its `key` property (`Alt+1` (EN) or `Alt++` (CZ)).
        // If the key is a one-char but-not-letter sign ( -> not affectable by Shift), we ignore the Shift state.
        // Ex: To access the question mark on eng and cz keyboard, we have to hit Shift.
        // However, the developper sets the hotkey as "?", not "Shift+?".
        // If the key is a one-char upper-letter ( -> for sure affected by Shift), we convert it to the lower case.
        // Ex: Grabbed combination "Shift+Alt+l" would always produce "Shift+Alt+L".
        for (const hotkey of /** @type {Hotkey[]} */ ([...this._hotkeys[e.code + Hotkey.mod_state(e)]?.filter(s => s.enabled) || [], ...this._hotkeys[(e.key?.length === 1 && /[A-Z]/.test(e.key) ? e.key.toLowerCase() : e.key) + Hotkey.mod_state(e, e.key?.length === 1 && !/[A-Za-z]/.test(e.key))]?.filter(s => s.enabled) || []])) {
            if (hotkey.scope) { // check we are in allowed scope (the focused element has hotkey.scope for the ancestor)
                const scope = isString(hotkey.scope) ? document.querySelector(hotkey.scope) : hotkey.scope
                if (scope instanceof Function) {
                    if (!scope()) {
                        continue
                    }
                } else { // check whether active element is contained under the scope
                    if (!closest(document.activeElement, hotkey.scope)) {
                        continue // not allowed scope
                    }
                }
            }

            // trigger the hotkey
            let result
            const action = hotkey.action
            if (action instanceof HTMLElement) {
                if (action.disabled) {
                    continue // action is a disabled HTMLElement, continue to next shorcut
                }
                result = FORM_TAGS.includes(action.tagName) ? action.focus() : action.click()
            } else {
                result = action.call(this)
            }

            if (result !== false) {// custom method suceeded
                // prevent default behaviour (ex: Ctrl+L going to the address bar)
                e.stopPropagation?.() // the method may not be available in a crafted event
                e.preventDefault?.()
            }
            return
        }
    }

    /**
     *
     * @param {Key|KeyEvent} hotkey
     */
    simulate(hotkey) {
        this._trigger(hotkey.constructor === String ? this._parseHotkey(hotkey) : hotkey)
    }

    /**
     * Easily get the stylesheet on the fly.
     *
     * Based on: https://davidwalsh.name/add-rules-stylesheets
     *
     * @return {CSSStyleSheet}
     */
    getSheet() {
        if (typeof this._sheet === "undefined") {
            this._sheet = (() => {
                // Create the <style> tag
                const style = document.createElement("style");

                // Add a media (and/or media query) here if you'd like!
                // style.setAttribute("media", "screen")
                // style.setAttribute("media", "only screen and (max-width : 1024px)")

                // WebKit hack :(
                style.appendChild(document.createTextNode(""));

                // Add the <style> this to the page
                document.head.appendChild(style);

                return style.sheet;
            })();
        }
        return this._sheet;
    }

    /**
     * Easily add to the stylesheet on the fly.
     *
     * @param {string} cssRule
     * @example wh.listHandlesUpDown().list("ul li"); wh.insertCss("ul li:focus {border:5px solid red}");
     * @returns {undefined}
     */
    insertCss(cssRule) {
        this.getSheet().insertRule(cssRule);
    }
}


/**
 * @see WebHotkeys.list
 */
class _List {
    constructor(query, currentSelector, method, _wh) {
        if (typeof query === "undefined") {
            query = "div";
        }
        if (typeof currentSelector === "undefined" || currentSelector === null) {
            currentSelector = ":focus";
        }

        this.query = query
        this.currentSelector = currentSelector
        this.method = method
        this.selected = null
        this._wh = _wh
    }

    /**
     * @see WebHotkeys.list
     */
    setQuery(query) {
        this.query = query;
        return this;
    }

    /**
     * @param {String} currentSelector The part of selector, describing currently selected item. If not defined or null, the default is: ":focus".
     * @param {String} css Code that will highlight the selector.
     * @example wh.list("ul li").setCurrentSelector(".custom-active", "{border:5px solid red}")
     */
    setCurrentSelector(currentSelector, css = null) {
        this.currentSelector = currentSelector
        if (css) {
            this._wh.insertCss(this.query + this.currentSelector + css);
        }
        return this
    }

    /**
     * @see WebHotkeys.list
     */
    setChangeFn(method) {
        this.method = method;
        return this
    }

    /**
     * @param {fn} Method will be called after the successful change of the selected element, receives newEl as a param.
     * @returns {_List}
     */
    setCallback(method) {
        this._callback = method
        return this
    }

    /**
     * Macro: Arrows UP/DOWN grabbed for listing instead of `this.list().goPrev/goNext`
     */
    handleUpDown() {
        this._wh.grab("ArrowUp", "Lists up", () => this.goPrev())
        this._wh.grab("ArrowDown", "Lists down", () => this.goNext())
        return this
    }

    /**
     * Set .next, .prev, .selected
     * @param {int} steps Default: 1. Distance between .next and .selected.
     * @returns {boolean}
     */
    _loadSiblings(steps = 1) {
        // check if there is a selected item already
        this.items = document.querySelectorAll(this.query);


        if (!this.items.length) {
            //if (this._debug) {
            //    console.warn("WebHotkeys.js list: Can't list items on query: " + this.query);
            //}
            return false;
        }
        for (let el of document.querySelectorAll(this.query)) {
            if (el.matches(this.currentSelector)) {
                this.selected = el;
            }
        }

        if (this.selected) {// item already selected
            for (let i = 0; i < this.items.length; i++) { // loops the items
                if (this.selected.isSameNode(this.items[i])) { // this is our selected item in the DOM
                    this.prev = this.items[Math.max(i - steps, 0)];
                    this.next = this.items[Math.min(i + steps, this.items.length - 1)];
                    return true;
                }
            }
        } else {
            this.prev = this.next = this.selected = this.items[0];
            return true;
        }
        return false;
    }

    setCurrent(el) {
        if (this._loadSiblings()) {
            this._change(el);
            if (!this._loadSiblings()) {
                console.error("WebHotkeys.js> Could not change successfully to:", el);
            }
        }
        return this;
    }

    /**
     * Get current this matching the selector. (Even if it changed since ex: last go call due to another user activity on page.)
     * @return {null|HtmlElement|*}
     */
    getCurrent() {
        this._loadSiblings()
        return this.selected
    }

    goNext(steps) {
        return this._loadSiblings(steps) ? this._change(this.next, this.selected) : false
    }

    goPrev(steps) {
        return this._loadSiblings(steps) ? this._change(this.prev, this.selected) : false
    }

    /**
     *
     * @param {boolean} forward
     * @param {int} steps
     * @returns {boolean}
     */
    go(forward = true, steps = 1) {
        return this._loadSiblings(steps) ? this._change((forward ? this.next : this.prev), this.selected) : false
    }

    _change(newEl, oldEl) {
        let proceed = true;
        if (typeof this.method === "function") {
            proceed = this.method(newEl, oldEl);
        }
        if (proceed) {
            if (this.currentSelector.substr(0, 1) === ".") {
                let cl = this.currentSelector.substr(1)
                if (oldEl) {
                    oldEl.classList.remove(cl);
                }
                if (newEl) {
                    newEl.classList.add(cl);
                }
            } else if (this.currentSelector.substring(0, 1) === "[") {
                const attrName = this.currentSelector.substring(1, this.currentSelector.length - 1)
                if (oldEl) {
                    oldEl.removeAttribute(attrName)
                }
                if (newEl) {
                    newEl.setAttribute(attrName, "1")
                }
            } else if (this.currentSelector.indexOf(":focus") === 0) {
                newEl.focus();
            } else { //selector can be I.E. a data-attribute
                console.error("WebHotkeys.js> Don't know how to process selector type:", this.currentSelector);
                return false;
            }
            this.selected = newEl;
            if (this._callback) {
                this._callback(newEl)
            }
        }
        return true;
    }
}

//
// Static methods
//

function isString(t) {
    return typeof t === 'string' || t instanceof String
}

/** TODO not used yet for groups
 * jQuery-like closest
 * @param {Element} el Element being queried
 * @param {string|HTMLElement|null} selector Matching selector
 * @returns {Element|undefined} Matching element (self, parent) or undefined
 */
function closest(el, selector) {
    if (!selector) {
        return
    }
    const match = isString(selector) ? el => el.matches(selector) : el => el.isSameNode(selector)
    while (el) {
        if (match(el)) {
            return el
        }
        el = el.parentElement
    }
}
