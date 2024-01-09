/**
 * Like KeyboardEvent but does not have guaranteed to contain all info.
 * Ex: {"code": "Digit1", "altKey": true} (missing shiftKey)
 * @typedef {KeyboardEvent} KeyEvent
 */
/** event.code "Digit1", event.key "1" or a combination with a modifier "Ctrl+Digit1"
 * @typedef {string} Key
 */
/**
 *  @typedef {HTMLElement|Function|jQuery} Target
 */
/**
 * Key letter combined with modifiers. Just because JS does not support tuple as a key dict.
 * @typedef {string} KeyState
 */
/**
 * Modifiers as a string. Just because JS does not support tuple as a key dict.
 * @typedef {string} ModState
 */

const FORM_TAGS = ["INPUT", "SELECT", "TEXTAREA"]

class Shortcut {
    /**
     *
     * @param {function} callback
     * @param {string} hint
     * @param {Target} scope
     * @param {KeyEvent} event
     * @param {WebHotkeys} wh
     */
    constructor(callback, hint, scope, event, wh) {
        this.callback = callback
        this.hint = hint
        this.scope = scope
        this.event = event
        this.wh = wh
        this.enabled = true
        this.enable()
    }

    /**
    * Generate shortcut text for given keycode
    * @param {int} keyCode
    * @returns {string}
    */
    shortcut_text(append_parenthesis = false) {
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
        return (this.event.key || this.event.code) + Shortcut.mod_state(this.event)
    }

    /**
     *
     * @param {KeyEvent} e
     * @returns {ModState}
     */
    static mod_state(e, supress_shift = false) {
        // If there ever be a clash between key and code, we might put a list into storage
        // and compare shortcuts like this: [modifiers] = [{key: 1}, {code: Digit1}]
        return String((supress_shift ? 0 : e.shiftKey << 3) | e.altKey << 2 | e.ctrlKey << 1 | e.metaKey)
    }

    enable() {
        this.enabled = true
        if (!this.wh._shortcuts[this.key_state]?.includes(this)) {
            (this.wh._shortcuts[this.key_state] ||= []).unshift(this)
        }
        return this
    }
    disable() {
        this.enabled = false
        return this
    }
    toggle(enable = null) {
        enable === null && !this.enabled || enable ? this.enable() : this.disable()
        return this
    }
}

/**
 * @extends {Array<Shortcut>}
 */
class ShortcutGroup extends Array {
    enable() {
        this.forEach(shortcut => shortcut.enable())
        return this
    }
    disable() {
        this.forEach(shortcut => shortcut.disable())
        return this
    }
    toggle(enable = null) {
        this.forEach(shortcut => shortcut.toggle(enable))
        return this
    }
}

/**
 * Main interface to define shortcuts
 */
class WebHotkeys {
    constructor() {
        /**  @type {Object.<KeyState, Array<Shortcut>>} */
        this._shortcuts = {}

        /**  @type {Object.<string, Shortcut[]>} */
        this._groups = {}

        // Start listening
        document.addEventListener('keydown', e => this._trigger(e), true)
    }

    /**
     * Grabs all [data-shortcut] elements. Puts its title as a help text.
     * @param {boolean} grab_f1 Put basic help text under F1
     * @returns {WebHotkeys}
     */
    init(grab_f1 = true) {
        document.querySelectorAll("[data-shortcut]").forEach(el => this.grab(
            el.getAttribute("data-shortcut"),
            el.getAttribute("title"),
            () => FORM_TAGS.includes(el.tagName) ? el.focus() : el.click())
        )

        if (grab_f1) {
            this.grab("F1", "Help", () => alert(this.getText()))
        }
        return this
    }

    /**
     * XX if there are a lot of them, they are not displayed in the alert text
     * @returns {string} Help text to current hotkeys' map.
     */
    getText() {
        const all = Object.values(wh._shortcuts).flat().filter(s => s.enabled)
        const enabled = new Set(all)
        const seen = new Set

        const grouped = Object.entries(wh._groups).map(([name, group]) => {
            const list = group
                .filter(shortcut => enabled.has(shortcut)) // filter out disabled shortcuts
                .map(shortcut => {
                    seen.add(shortcut)
                    return `${shortcut.shortcut_text()}: ${shortcut.hint}`
                })
            if (list.length) { // if at least one shortcut from a group remains enabled
                return `\n**${name}**\n` + list.join("\n")
            }
        })

        const ungrouped = all
            .filter(shortcut => !seen.has(shortcut))
            .map(shortcut => shortcut.shortcut_text() + ": " + shortcut.hint)

        return [...ungrouped, ...grouped].join("\n").trim()
    }

    /**
     * .grab(key, [hint], callback, [scope])
     *
     * @param {Key} shortcut
     * @param {string|Function} hint If Fn, this is taken as the callback parameter.
     * @param {Target} callback  What will happen on shortcut trigger.
     *   If callback returns false, shortcut will be treated as non-existent and event will propagate further.
     *   If callback is a HTMLElement, its click or focus method (form elements) is taken instead.
     *   If callback is jQuery, its click method is taken instead.
     * @param {?Target} scope Scope within the shortcut is allowed to be launched.
     *  The scope can be an HTMLElement that the active element is being search under when the shortcut triggers.
     *  The scope can be a function, resolved at the keystroke time. True means the scope matches. That way, you can implement negative scope.
     *  (Ex: down arrow should work unless there is DialogOverlay in the document root.)
     *  The scope can be jQuery -> the element matched by the selector doesn't have to exist at the shortcut definition time.
     * @returns {Shortcut}
     */
    grab(shortcut, hint, callback, scope = null) {
        const event = this._parseShortcut(shortcut)

        // juggle optional parameters
        if (typeof hint === "function") {
            scope = callback // hint (optional parameter) was not used - shift the others
            callback = hint
            hint = ""
        }
        const _shortcut = new Shortcut(callback, hint, scope, event, this)

        if (typeof (jQuery) !== "undefined" && callback instanceof jQuery && callback.get(0)) {
            // append shorcut text to the element (ex: display 'anchor (Alt+1)')
            if (!callback.data("webhotkeys-displayed")) { // append just once
                callback.data("webhotkeys-displayed", true)
                callback.append(_shortcut.shortcut_text(true))
            }

            // getting the click function with the right context
            // (I don't know why, plain method.click.bind(method) didnt work in Chromium 67)
            _shortcut.callback = callback.get(0).click.bind(callback.get(0))
        } else if (callback instanceof HTMLElement) {
            _shortcut.callback = () => FORM_TAGS.includes(callback.tagName) ? callback.focus() : callback.click()
        }
        return _shortcut
    }

    /**
     * Grab multiple shortcuts at once
     * @param {string} name Group name
     * @param {Array} definitions List of grab parameters. Ex: [["Ctrl+c", "Copy", callback], ["Ctrl+v", "Paste", callback]]
     * @returns
     */
    group(name, definitions) {
        return this._groups[name] = new ShortcutGroup(...definitions).map(d => this.grab(...d))
    }

    /**
     *
     * @param {Key} shortcut Ex: Shift+s or Alt+Shift+Digit1
     * @returns {KeyEvent}
     */
    _parseShortcut(shortcut) {
        const modifiers = {
            "alt": "alt",
            "shift": "shift",
            "meta": "meta",
            "ctrl": "ctrl",
            "control": "ctrl",
        }
        const parts = shortcut.split('+')
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
                console.warn(`Unknown modifier at ${shortcut}`)
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
        if (!e.altKey
            && !e.metaKey
            && (e.key !== e.code // Escape, F1... anticipate a shortcut
                || ["Delete", "Backspace", "Tab"].includes(e.key)) // except it is a text editing key
            && ( // Ctrl without Arrows anticipates a shortcut
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
                || !e.ctrlKey
            )
            && FORM_TAGS.includes(document.activeElement.tagName)
            && document.activeElement.type !== "checkbox") {
            // arrow shortcuts don't work when we are in an input field
            return
        }

        /** @type {?Shortcut} */
        // First check whether a `code` shortcut was defined (`Alt+Digit1`).
        // If not, try its `key` property (`Alt+1` (EN) or `Alt++` (CZ)).
        // If the key is a one-char but-not-letter sign ( -> not affectable by Shift), we ignore the Shift state.
        // Ex: To access the question mark on eng and cz keyboard, we have to hit Shift.
        // However, the developper sets the shortcut as "?", not "Shift+?".
        // If the key is a one-char upper-letter ( -> for sure affected by Shift), we convert it to the lower case.
        // Ex: Grabbed combination "Shift+Alt+l" would always produce "Shift+Alt+L".
        const shortcut = this._shortcuts[e.code + Shortcut.mod_state(e)]?.find(s => s.enabled)
            || this._shortcuts[(e.key?.length === 1 && /[A-Z]/.test(e.key) ? e.key.toLowerCase() : e.key) + Shortcut.mod_state(e, e.key?.length === 1 && !/[A-Za-z]/.test(e.key))]?.find(s => s.enabled)
        if (shortcut) {
            if (shortcut.scope) { // check we are in allowed scope (the focused element has shortcut.scope for the ancestor)
                const scope = (typeof jQuery !== "undefined" && shortcut.scope instanceof jQuery) ? shortcut.scope.get()[0] : shortcut.scope
                if (!scope) { // scope element is not contained in the page – we can't be focused within the scope
                    return
                }
                if (scope instanceof Function) {
                    if (!scope()) {
                        return
                    }
                } else {
                    let el = document.activeElement
                    while (!el.isSameNode(scope)) {
                        el = el.parentNode
                        if (!el) {
                            return // not allowed scope
                        }
                    }
                }
            }
            const result = shortcut.callback.call(this)
            if (result !== false) {// custom method suceeded
                // XX rather than checking "go", use instanceof _List
                // XX Or event better, maybe these liner are not needed anymore.
                if (result != null && result.go != null) { // we found a macro, run it
                    result.go(e.code)
                }

                // prevent default behaviour (ex: Ctrl+L going to the address bar)
                e.stopPropagation?.() // the method may not be available in a crafted  event
                e.preventDefault?.()
            }
        }
    }

    /**
     *
     * @param {Key|KeyEvent} shortcut
     */
    simulate(shortcut) {
        this._trigger(shortcut.constructor === String ? this._parseShortcut(shortcut) : shortcut)
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
        const f = function (e) {
            return this._list.go(e);
        };
        this._wh.grab("ArrowUp", "Lists up", f);
        this._wh.grab("ArrowDown", "Lists down", f);
        return this;
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
        //if (this._debug) {
        //    console.warn("WebHotkeys.js list:", this.selected, this.next);
        //}
        return false;
    }

    setCurrent(el) {
        if (this._loadSiblings()) {
            this._change(el);
            if (!this._loadSiblings()) {
                console.error("Webhotkeys.js: Could not change successfully to:", el);
            }
        }
        return this;
    }

    /**
     * Get current this matching the selector. (Even if it changed since ex: last go call due to another user activity on page.)
     * @return {null|Element|*}
     */
    getCurrent() {
        this._loadSiblings();
        return this.selected;
    }

    goNext(steps) {
        if (this._loadSiblings(steps)) {
            return this._change(this.next, this.selected);
        } else {
            return false;
        }
    }

    goPrev(steps) {
        if (this._loadSiblings(steps)) {
            return this._change(this.prev, this.selected);
        } else {
            return false;
        }
    }

    /**
     *
     * @param {string} code KeyboardEvent.code
     * @param {int} steps
     * @returns
     */
    go(code, steps) {
        if (this._loadSiblings(steps)) {
            let el = ["ArrowDown", "NumpadAdd"].includes(code) ? this.next : this.prev;
            return this._change(el, this.selected);
        } else {
            return false;
        }
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
                console.error("Webhotkeys.js: Don't know how to process selector type:", this.currentSelector);
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
