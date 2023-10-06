# WebHotkeys

Easy solution to integrate keyboard shortcuts into the webpage.

```javascript
<script src="https://cdn.jsdelivr.net/gh/e3rd/WebHotkeys@0.7/WebHotkeys.js"></script>
```

## Usage

```javascript
const wh = new WebHotkeys()
// shortcut, hint, callback, [scope]
wh.grab("Enter", "Displays an alert", () => alert("This happens"))

// You can use modifiers: Alt, Shift, Ctrl (Control)
// wh.grab("Shift+Alt+l", ...
```

## Example
See the live [example](https://e3rd.github.io/WebHotkeys/example.html).

## Shortcut syntax

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

# LICENSE
GNU GPLv3.
