// Quiq Notes — background service worker v1.1
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onInstalled.addListener(() => {
  console.log('Quiq Notes v1.1 installed!');
});

// ─── Feature #10: Keyboard Shortcut (Alt+N) ───────────────────────────────

function getPageKey(url) {
  try {
    const u = new URL(url);
    return 'notes_' + u.hostname + u.pathname;
  } catch {
    return 'notes_global';
  }
}

browserAPI.commands.onCommand.addListener(async (command) => {
  if (command !== 'add-note') return;

  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url) return;
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('about:')
  ) return;

  const colors = ['#fef08a', '#86efac', '#93c5fd', '#f9a8d4', '#fdba74', '#d8b4fe'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const now = new Date().toISOString();

  const note = {
    id: Date.now().toString(),
    color,
    text: '',
    x: Math.floor(Math.random() * 300 + 80),
    y: Math.floor(Math.random() * 200 + 80),
    width: 200,
    height: 180,
    zIndex: Date.now(),
    createdAt: now,
    updatedAt: now,
    locked: false,
    theme: 'light',
    pinned: null,
    mode: 'text',
    items: [],
    tags: [],
    pageUrl: tab.url,
  };

  const key = getPageKey(tab.url);
  const result = await browserAPI.storage.local.get(key);
  const notes = result[key] || [];
  notes.push(note);
  await browserAPI.storage.local.set({ [key]: notes });

  try {
    await browserAPI.tabs.sendMessage(tab.id, { type: 'ADD_NOTE', note });
  } catch {
    await browserAPI.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  }
});
