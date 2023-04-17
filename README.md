# WebHotkeys

Easy solution to integrate keyboard shortcuts into the webpage.

```javascript
const wh = new WebHotkeys()
// keyCode, hint, method[, scope]
wh.press(KEY.ENTER, "Enter key shortcut", () => alert("This happens"))

// You can use modifiers:
// wh.pressAlt
// wh.pressShift
// wh.pressCtrl
```

# LICENSE
GNU GPLv3.
