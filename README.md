# WebHotkeys

Easy solution to integrate keyboard shortcuts into the webpage.

```javascript
<script src="https://cdn.jsdelivr.net/gh/e3rd/WebHotkeys@0.9.0/WebHotkeys.js"></script>
```

# Usage

```javascript
const wh = new WebHotkeys()
// shortcut, hint, callback, [scope]
wh.grab("Enter", "Displays an alert", () => alert("This happens"))

// You can use modifiers: Alt, Shift, Ctrl (Control)
// wh.grab("Shift+Alt+l", ...
```

OR

```html
<a href="..." data-shortcut="Ctrl+Enter" title="Help text">link</a>
```

```javascript
new WebHotkeys().init()  // grabs all [data-shortcut] elements
```

# Example
See the live [example](https://e3rd.github.io/WebHotkeys/example.html).

# Documentation

The library intercepts [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) on key down and reads its `code`, `key` and modifier properties.

## `WebHotkeys` object

Start with: `const wh = new WebHotkeys()`

### Method `init`

Grabs all [data-shortcut] elements. Puts its title as a help text. Returns self.

```html
<a href="..." data-shortcut="Alt+1" title="Go to an example link 1">link 1</a>
<a href="..." data-shortcut="Alt+2" title="Go to an example link 2">link 2</a>
```

```javascript
new WebHotkeys().init()
```

### Method `grab`

Start listening to a shortcut. Specify hint and callback to be triggered on hit. Returns a `Shortcut` object. It accepts following parameters:

* `shortcut` (`string`)
    Key combination to be grabbed. Either use any `code` value https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values of the event:

    ```javascript
    wh.grab("Digit1", "Hint", () => alert("Digit1 key (whatever keyboard layout) hit"))
    wh.grab("Alt+ArrowDown", "Hint", () => alert("Alt+ArrowDown hit"))
    wh.grab("KeyF", "Hint", () => alert("Litter f hit (specified by the `code` property)"))
    ```

    Or use any `key` value
    ```javascript
    wh.grab("1", "Hint", () => alert("Number 1 hit"))
    wh.grab("+", "Hint", () => alert("Plus sign hit"))
    wh.grab("?", "Hint", () => alert("Question mark hit (you don't have to mention shift in the shortcut)"))
    wh.grab("Alt++", "Hint", () => alert("Plus sign with the Alt hit"))
    wh.grab("f", "Hint", () => alert("Letter f hit (specified by the `key` property)"))
    ```

    If you define both `code` and `key`, the `code` has the precedence.

    If multiple shortcuts are defined, only the first one is executed.

    Some special shortcuts like `Ctrl+PageDown` will likely never be passed to the webpage and therefore do not function.
* `hint` (`string`): Help text.
* `callback` (`{HTMLElement|Function|jQuery}`): What will happen on shortcut trigger.
     *  If callback returns false, shortcut will be treated as non-existent and event will propagate further.
     *  If callback is a HTMLElement, its click or focus method (form elements) is taken instead.
     *  If callback is jQuery, its click method is taken instead.
* `scope` (`{HTMLElement|Function|jQuery}`): Scope within the shortcut is allowed to be launched.
     *  The scope can be an HTMLElement that the active element is being search under when the shortcut triggers.
     *  The scope can be a function, resolved at the keystroke time. True means the scope matches. That way, you can implement negative scope.
     *  (Ex: down arrow should work unless there is DialogOverlay in the document root.)
     *  The scope can be jQuery -> the element matched by the selector doesn't have to exist at the shortcut definition time.


### Method `group`
Grab multiple shortcuts at once. Returns a `ShortcutGroup` that you may call methods `enable`, `disable`, `toggle(enable=null)` on.

```javascript
// name, definitions (grab method parameters as a list)
const general = wh.group("General shortcuts", [
    ["n", "Next", () => this.nextFrame()],
    ["p", "Prev", () => this.previousFrame()],
])

general.disable() // disable all shortcuts
general.toggle() // re-enable them
general.toggle(false) // re-disable them
```

### Method `simulate`

Manually trigger a shortcut.

```javascript
// Simulate hitting Shift+1 shortcut
wh.grab("Shift+Digit1", "Number 1 shortcut", () => alert("Shift+Number 1 hit"))
wh.simulate("Shift+Digit1")

// You can include KeyEvent object or its part too
wh.simulate( { shiftKey: true, code: "Digit1" })
```

### Method `getText`
Display hints.

## `Shortcut` object

### Method `enabled`

Start listening (by default after calling `wh.grab`). Returns itself.

### Method `disable`

Stop listening. Returns itself.

### Migrate from 0.7 to 0.8
(Remove the paragraph.)

```
KEY\.([A-Z]\w+), "\L$1",
KEY\.([A-Z]), $1
wh\.press\( wh.grab(
wh\.pressAlt\(" wh.grab("Alt+
removed get_info_pairs()
```

# LICENSE
GNU GPLv3.
