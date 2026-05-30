# RTL for Skool — Chrome Extension

Fixes the display of Hebrew/Arabic text on Skool so it reads right-to-left (RTL)
instead of being stuck left-aligned. Works automatically on every page of
skool.com.

## ⚠️ Important limitation

The extension only runs **in the browser it's installed on**:

- ✅ **For you** — Hebrew text is right-aligned, both when reading
  (descriptions, posts, comments) and when writing (the post editor, the About
  editor, the title field).
- ❌ **For your visitors / community members** — they still see left-aligned
  text, unless they install the same extension themselves.

Great for comfortably writing and managing your content. It does **not** fix
the public-facing display for people who don't have the extension.

## Installation

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select this folder (`skool-rtl-extension`).
5. Go to skool.com — Hebrew text should now display right-to-left.
   (If a page was already open, reload it once.)

## How it works

Two mechanisms, both delivered through our own stylesheet (CSS) — because
Skool's text editors strip foreign attributes you add from outside, but they
can't strip a CSS rule:

1. **Read-only text** (descriptions, posts, comments): a script detects elements
   containing Hebrew/Arabic and adds `dir="auto"`, letting the browser choose
   direction and alignment from the content.
2. **Editors and input fields** (post editor, About description, title): a
   `unicode-bidi: plaintext` rule makes each paragraph adopt its direction from
   its own first strong character — Hebrew → RTL, English → LTR — automatically.

This keeps the English UI from breaking. A `MutationObserver` ensures
dynamically loaded content (and text you type) is handled too.

## Removal

Go to `chrome://extensions` and click **Remove** on "RTL for Skool".

## License

MIT — see [LICENSE](LICENSE).
