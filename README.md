# WebHotkeys

Easy solution to integrate keyboard shortcuts into the webpage.

```javascript
<script src="https://cdn.jsdelivr.net/gh/e3rd/WebHotkeys@0.7/WebHotkeys.js"></script>
```

# Usage

```javascript
const wh = new WebHotkeys()
// shortcut, hint, callback, [scope]
wh.grab("Enter", "Displays an alert", () => alert("This happens"))

// You can use modifiers: Alt, Shift, Ctrl (Control)
// wh.grab("Shift+Alt+l", ...
```

# Example
See the live [example](https://e3rd.github.io/WebHotkeys/example.html).

# Documentation

## `WebHotkeys` object

Start with: `const wh = new WebHotkeys()`

### Method `grab`

Start listening to a shortcut. Specify hint and callback to be triggered on hit. Returns a `Shortcut` object.

#### Shortcut syntax

The library intercepts [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) on key down and reads its `code`, `key` and modifier properties.

Either use any `code` value https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values of the event:

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

### Method `trigger`

Manually trigger a shortcut. Input can be a `KeyboardEvent` (or only some of its properties).

```javascript
// Simulate hitting Shift+1 shortcut
wh.grab("Shift+Digit1", "Number 1 shortcut", () => alert("Shift+Number 1 hit"))
wh.trigger({"code": "Digit1", "shiftKey": true})
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
