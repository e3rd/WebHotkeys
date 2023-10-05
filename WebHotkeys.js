/**
 * XX In the future, replace with event.key|code instead of event.keyCode (which)
 *  Ex: key: +, location: 0, 0 (General keys), which: 49, code: Digit1
 *      (probably use .key for letters and code for Digits)
 *  This will help us to implement '?' shortcut I think.
 * @type {{}}
 */
const KEY = {
    N0: 48, N1: 49, N2: 50, N3: 51, N4: 52, N5: 53, N6: 54, N7: 55, N8: 56, N9: 57,
    Numpad0: 96, Numpad1: 97, Numpad2: 98, Numpad3: 99, Numpad4: 100, Numpad5: 101, Numpad6: 102, Numpad7: 103, Numpad8: 104, Numpad9: 105,
    DOWN: 40, UP: 38, LEFT: 37, RIGHT: 39, ENTER: 13, SPACE: 32, COMMA: 188, DASH: 189, DOT: 190, ESCAPE: 27,// XX keyDown vs keyPress → this displays wrong chars in help :( ALT: 17,
    A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76,
    M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
    KP_Add: 107, KP_Subtract: 109,
    PageUp: 33, PageDown: 34, Home: 36, End: 35
}


/**
 * Stores shortcuts in the form `storage[keyCode] = { method, hint, scope }`
 */
class _Storage extends Array {
    constructor(help_text = "") {
        super()
        this._help_text = help_text
        return this
    }
    /**
     * Generate shortcut text for given keycode
     * @param {int} keyCode
     * @returns
     */
    shortcut_for(keyCode, append_paranthesis = false) {
        const pre = this._help_text ? this._help_text + "+" : ""
        const key = Object.keys(KEY)
            .find(key => KEY[key] === Number.parseInt(keyCode))
            ?.replace(/^N(\d)$/, "$1") // 'Alt+N1' -> 'Alt+1'
        if (append_paranthesis) {
            return ` (${pre + key})`
        }
        return pre + key
    }
}

class Shortcut {
    /**
     *
     * @param {function} method
     * @param {string} hint
     * @param {*} scope
     * @param {_Storage} storage
     * @param {int} keyCode
     */
    constructor(method, hint, scope, storage, keyCode) {
        this.method = method
        this.hint = hint
        this.scope = scope
        this.storage = storage
        this.keyCode = keyCode
        this.enable()
    }
    shortcut_text(append_paranthesis = false) {
        return this.storage.shortcut_for(this.keyCode, append_paranthesis)
    }
    enable() {
        this.storage[this.keyCode] = this
    }
    disable() {
        delete this.storage[this.keyCode]
    }
}

/**
 * Interface pro vsechny stranky se zkratkami
 */
class WebHotkeys {
    constructor() {
        this._bindings = {
            "alt": new _Storage("Alt"),
            "ctrl": new _Storage("Ctrl"),
            "shift": new _Storage("Shift"),
            "letter": new _Storage()
        }

        // Start listening
        document.addEventListener('keydown', e => this.trigger(e), true)
    }

    get_info_pairs() {
        const res = [];
        [this._bindings.letter, this._bindings.alt, this._bindings.ctrl, this._bindings.shift].forEach(storage => {
            Object.entries(storage).forEach(([keyCode, o]) => {
                if (keyCode !== "_help_text") { // XX I do not know how to ignore _Storage._help_text while looping
                    res.push([storage.shortcut_for(keyCode), o])
                }
            })
        })
        return res
    }

    /**
     * XX group by scopes
     * XX if there are a lot of them, they are not displayed in the alert text
     * @returns {string} Help text to current hotkeys' map.
     */
    getText() {
        return "Current bindings: \n" + this.get_info_pairs().map(([shortcut, method]) => shortcut + ": " + method.hint).join("\n")
    }

    /**
     * .press(keyCode[, hint], method[, scope])
     */
    press(keyCode, hint, method, scope) {
        return this._press(this._bindings.letter, keyCode, hint, method, scope);
    }

    /**
     * .press(keyCode[, hint], method)
     */
    pressAlt(keyCode, hint, method, scope) {
        return this._press(this._bindings.alt, keyCode, hint, method, scope);
    }

    /**
     * .press(keyCode[, hint], method)
     */
    pressShift(keyCode, hint, method, scope) {
        return this._press(this._bindings.shift, keyCode, hint, method, scope);
    }

    /**
     * .press(keyCode[, hint], method[, scope])
     *
     * @param {_Storage} storage
     * @param {type} keyCode
     * @param {string|function} hint If Fn, this is taken as method parameter.
     * @param {function|jQuery} method If jQuery, its click method is taken as Fn.
     * @parem {jQuery|Node} Scope within the shortcut is allowed to be launched.
     *                      The scope can be jQuery -> the element matched by the selector doesn't have to exist at the shortcut definition time.
     * @returns {Shortcut}
     */
    _press(storage, keyCode, hint, method, scope = null) {
        if (typeof hint === "function") {
            scope = method; // hint (optional parameter) was not used - shift the others
            method = hint;
            hint = "";
        }
        if (typeof (jQuery) !== "undefined" && method instanceof jQuery && method.get(0)) {
            // append shorcut text to the element (ex: display 'anchor (Alt+1)')
            if (!method.data("webhotkeys-displayed")) { // append just once
                method.data("webhotkeys-displayed", true)
                method.append(storage.shortcut_for(keyCode, true))
            }

            // getting the click function with the right context
            // (I don't know why, plain method.click.bind(method) didnt work in Chromium 67)
            method = method.get(0).click.bind(method.get(0));
        }
        return new Shortcut(method, hint, scope, storage, keyCode)
    }

    /**
     * .press(keyCode[, hint], method)
     */
    pressCtrl(keyCode, hint, method, scope) {
        return this._press(this._bindings.ctrl, keyCode, hint, method, scope)
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
     * Trigger shortcut if exists
     */
    trigger(e) {
        if ([KEY.DOWN, KEY.UP].includes(e.keyCode)
            && !e.altKey
            && ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
            && document.activeElement.type !== "checkbox") {
            // arrow shortcuts don't work when we are in an input field
            return
        }

        /** @type {Shortcut|undefined} */
        const shortcut = (e.altKey ? this._bindings.alt : (e.ctrlKey ? this._bindings.ctrl : (e.shiftKey ? this._bindings.shift : this._bindings.letter)))[e.keyCode];
        if (shortcut != null) { // shortcut is defined
            if (shortcut.scope) { // check we are in allowed scope (the focused element has shortcut.scope for the ancestor)
                // XX scopes should allow negative scope. Ex: down arrow should work unless there is DialogOverlay in the document root.
                // How to define this? By a lambda function? By a dictionary {"allowed-scope":, "disallowed":}?
                // Plus it should support jQuery object, resolved lazily, at the keystroke time.
                // UPDATE: jQuery and lambda works!
                let scope = (typeof (jQuery) !== "undefined" && shortcut.scope instanceof jQuery) ? shortcut.scope.get()[0] : shortcut.scope
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
            let result = shortcut.method.call(this, e.keyCode)
            if (result !== false) {//uspesne vykoname akci
                if (result != null && result.go != null) { // we found a macro, run it
                    result.go(e.keyCode)
                }
                return false // prevent default browser action
            }
        }
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
        this._wh.press(KEY.UP, "Lists up", f);
        this._wh.press(KEY.DOWN, "Lists down", f);
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

    go(keyCode, steps) {
        if (this._loadSiblings(steps)) {
            let el = [KEY.DOWN, KEY.KP_Add].includes(keyCode) ? this.next : this.prev;
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
