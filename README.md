<div align="center">

# 🏷️ Quiq Notes

**Drop sticky notes on any webpage — fast, colorful, and always there.**

![Version](https://img.shields.io/badge/version-1.1.0-f5c842?style=flat-square)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Firefox-orange?style=flat-square)

</div>

---

## ✨ What is Quiq Notes?

Quiq Notes is a lightweight browser extension that lets you place sticky notes directly on any webpage. Notes are saved **per page** and survive reloads — so your notes on `github.com` stay there every time you visit.

No accounts. No cloud. No tracking. Everything is stored locally on your device.

---

## 🚀 Installation

### Chrome / Edge (Manual — Developer Mode)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/itzdharmik08/Quiq-notes.git
   ```
2. Open Chrome and go to: `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `quiq-notes` folder
6. The 🏷️ icon will appear in your toolbar — pin it for easy access!

### Firefox (Manual — Temporary)

1. Open Firefox and go to: `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the `manifest.json` file inside the `quiq-notes` folder

> **Note:** Firefox temporary add-ons are removed on browser restart. For permanent installation, the extension must be submitted to the Firefox Add-on store.

---

## 🎯 Features

### 🗒️ Sticky Notes
- Drop colorful draggable sticky notes on **any webpage**
- Notes are **saved per page URL** and persist across reloads
- **Resize** notes by dragging the bottom-right corner
- Notes use an isolated **Shadow DOM** — they never clash with page styles

### 🎨 7 Note Colors
Yellow · Green · Blue · Pink · Orange · Lavender · White

### ⌨️ Keyboard Shortcut
Press **`Alt + N`** anywhere on any page to instantly drop a new note — no need to open the popup!

### 🌙 Dark Mode (per note)
Toggle each note individually between light and dark themes using the **🌙** button in the note header.

### 🔒 Lock Notes
Click the **🔓** button to lock a note into read-only mode. Locked notes can't be edited or resized — perfect for pinned reminders.

### ☑ Checklist Mode
Click the **☑** button to convert any note into an interactive checklist:
- Press **Enter** after each item to add the next
- Check off items with a click
- Items from text notes are auto-converted to checklist rows

### 📌 Pin to Corner
Click the **📌** button to pin a note to a screen corner — it stays visible as you scroll. Cycles through:
`Unpinned → ↖ Top-Left → ↗ Top-Right → ↙ Bottom-Left → ↘ Bottom-Right`

### 🏷️ Tags
Type a tag (e.g. `#todo`) in the tag field at the bottom of a note and press **Enter** to add it as a chip. Tags appear in the popup list and are searchable.

### ⏰ Timestamps
Every note shows how long ago it was created (e.g. `just now`, `5m ago`, `2d ago`).

### 🔍 Global Search
Use the search bar in the popup to search across notes on **all pages** — matches text content, checklist items, and tags.

### 📍 Page URL Badge
The popup list shows which domain each note belongs to, so you always know where a note came from.

### 📤 Export & Import
| Format | What it exports |
|---|---|
| **Export JSON** | Full backup of all notes on all pages |
| **Export TXT** | Current page notes as plain text (checklists use `[x]` / `[ ]`) |
| **Import JSON** | Restore a full JSON backup |
| **Import TXT** | Each line in the file becomes a new note |

### 👁️ Hide / Show All Notes
Toggle all notes on the current page visible or hidden with one click.

---

## 🖱️ How to Use

### Adding a Note
1. Click the **🏷️ Quiq Notes** icon in your toolbar
2. Pick a color from the color dots
3. Click **Drop a New Note** — or press **Alt+N** directly on the page

### Writing in a Note
- Just start typing! Notes save automatically as you type
- Use **Ctrl+V** / **Cmd+V** to paste text

### Using Checklist Mode
1. Click the **☑** button in the note header
2. Type an item and press **Enter** to add the next
3. Click a checkbox to mark items done (they get a strikethrough)

### Adding Tags
1. Click the tag input field at the bottom of any note
2. Type `#mytag` and press **Enter**
3. Tags appear as chips and are searchable from the popup

### Pinning a Note
Click **📌** in the note header to cycle through screen corners. The note will stay fixed in that corner even while scrolling.

### Searching Notes
1. Open the popup
2. Type in the **Search all notes…** bar
3. Results from all pages appear instantly with their page domain

---

## 📁 Project Structure

```
quiq-notes/
├── manifest.json      # Extension config, permissions, keyboard shortcut
├── background.js      # Service worker — handles Alt+N keyboard shortcut
├── content.js         # Injected into every page — renders all sticky notes
├── content.css        # Hides notes when toggled off
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic — search, add, delete, import/export
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔐 Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save your notes locally in the browser |
| `activeTab` | Get the current page URL to scope notes |
| `scripting` | Inject the content script when needed |
| `<all_urls>` | Allow notes on any website |

> Quiq Notes does **not** send any data to any server. Everything stays on your device.

---

## 🗺️ Roadmap

- [ ] Image / screenshot attachment inside notes
- [ ] Cloud sync across devices
- [ ] Context-menu shortcut (right-click → Add Note Here)
- [ ] Note reminders / alarms

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT © [itzdharmik08](https://github.com/itzdharmik08)

---

<div align="center">
  Made with ☕ and sticky notes
</div>
