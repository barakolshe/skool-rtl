(() => {
  "use strict";

  // Hebrew, Arabic, Syriac, Thaana + Arabic presentation forms.
  const RTL_RE = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

  // Displays where `text-align` actually controls alignment.
  const BLOCK_DISPLAYS = new Set([
    "block", "list-item", "table-cell", "flow-root",
    "table-caption", "inline-block"
  ]);

  // Displays we must NOT touch — setting `dir` reorders their children.
  const LAYOUT_DISPLAYS = new Set([
    "flex", "grid", "inline-flex", "inline-grid"
  ]);

  // All our styling lives in our OWN stylesheet, not in inline attributes —
  // that way Skool rewriting an element's `style`/`dir` on re-render can't wipe
  // it (a controlled rich-text editor strips foreign attributes, but not a
  // stylesheet rule).
  const style = document.createElement("style");
  style.textContent = [
    // (1) Read-only text we tag below (see mark()) — align to its auto direction.
    '[data-skool-rtl="block"]{text-align:start !important}',
    // (2) Rich-text editors (post composer, About editor, comments). They strip
    // the dir attribute we'd set, so instead we use `unicode-bidi: plaintext`:
    // each paragraph's direction follows its own first strong character
    // (Hebrew -> RTL, English -> LTR), and the editor's existing
    // `text-align: start` then aligns it to the correct side.
    '[contenteditable] p,[contenteditable] div,[contenteditable] li,[contenteditable]{unicode-bidi:plaintext !important}',
    // (3) Plain inputs / textareas (post title, etc.) — same auto-direction idea.
    'input,textarea{unicode-bidi:plaintext}'
  ].join("\n");
  (document.head || document.documentElement).appendChild(style);

  function display(el) {
    try {
      return getComputedStyle(el).display;
    } catch (_) {
      return "";
    }
  }

  // Idempotent: only writes when something is missing, and returns whether it
  // changed anything — so observing our own writes can't cause a feedback loop.
  function mark(el, kind) {
    let changed = false;
    if (el.getAttribute("dir") !== "auto") {
      el.setAttribute("dir", "auto");
      changed = true;
    }
    if (el.getAttribute("data-skool-rtl") !== kind) {
      el.setAttribute("data-skool-rtl", kind);
      changed = true;
    }
    return changed;
  }

  // Walk up from an RTL text node to the nearest block that owns its alignment,
  // and align that block. Bail to a bidi-only fix if we hit a layout container.
  function handleTextNode(textNode) {
    if (!textNode.nodeValue || !RTL_RE.test(textNode.nodeValue)) return;

    const inlineParent = textNode.parentElement;
    if (!inlineParent) return;

    let el = inlineParent;
    while (el && el !== document.body && el !== document.documentElement) {
      const disp = display(el);
      if (LAYOUT_DISPLAYS.has(disp)) {
        // Don't reorder a flex/grid container — just fix the text's bidi.
        mark(inlineParent, "inline");
        return;
      }
      if (BLOCK_DISPLAYS.has(disp)) {
        mark(el, "block");
        return;
      }
      el = el.parentElement;
    }
    mark(inlineParent, "inline");
  }

  function scan(root) {
    if (!root || (root.nodeType !== 1 && root.nodeType !== 9)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        return RTL_RE.test(n.nodeValue || "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });
    let n;
    while ((n = walker.nextNode())) handleTextNode(n);
  }

  // Initial pass over the whole page.
  scan(document.body || document.documentElement);

  // Skool is a single-page app. Re-scan on:
  //   childList   -> new content streamed in / navigation between sections
  //   characterData -> text typed or edited
  //   attributes  -> Skool re-rendering an element's class/style/dir, which
  //                  could otherwise overwrite or drop our fix
  const pending = new Set();
  let queued = false;

  function flush() {
    queued = false;
    const batch = Array.from(pending);
    pending.clear();
    for (const node of batch) {
      if (node.nodeType === 3) handleTextNode(node);
      else scan(node);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 || node.nodeType === 3) pending.add(node);
        }
      } else if (m.type === "characterData") {
        pending.add(m.target);
      } else if (m.type === "attributes") {
        // Re-evaluate this element (mark() is idempotent, so no loop).
        pending.add(m.target);
      }
    }
    if (!queued && pending.size) {
      queued = true;
      requestAnimationFrame(flush);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style", "dir", "data-skool-rtl"]
  });
})();
