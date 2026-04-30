const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let selectedColor = '#fef08a';
let notesHidden = false;
let searchQuery = '';

function showError(msg) {
  const btn = document.getElementById('addNoteBtn');
  const prev = btn.innerHTML;
  btn.innerHTML = '⚠ ' + msg.split('\n')[0];
  btn.style.background = '#e05050';
  btn.style.boxShadow = '0 3px 0 #902020';
  btn.style.color = '#fff';
  btn.style.fontSize = '11px';
  setTimeout(() => {
    btn.innerHTML = prev;
    btn.style.background = '';
    btn.style.boxShadow = '';
    btn.style.color = '';
    btn.style.fontSize = '';
  }, 2500);
}

function escapeHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  return dy + 'd ago';
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.',''); } catch { return ''; }
}

// Color picker
document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    selectedColor = dot.dataset.color;
  });
});

async function getCurrentTab() {
  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getPageKey(url) {
  try { const u = new URL(url); return 'notes_' + u.hostname + u.pathname; }
  catch { return 'notes_global'; }
}

async function loadNotes() {
  const tab = await getCurrentTab();
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    document.getElementById('noteCount').textContent = 'N/A';
    document.getElementById('emptyState').querySelector('p').innerHTML = "Can't access Chrome<br>system pages.";
    return;
  }
  const key = getPageKey(tab.url);
  const result = await browserAPI.storage.local.get([key, 'hidden_' + key]);
  const notes = result[key] || [];
  notesHidden = result['hidden_' + key] || false;
  renderNotesList(notes);
  updateToggleBtn();
  document.getElementById('noteCount').textContent = notes.length + (notes.length === 1 ? ' NOTE' : ' NOTES');
}

function renderNotesList(notes, isSearch = false) {
  const list = document.getElementById('notesList');
  const empty = document.getElementById('emptyState');
  list.querySelectorAll('.note-item, .search-page-group, .search-page-header').forEach(el => el.remove());

  if (notes.length === 0) {
    empty.style.display = 'block';
    empty.querySelector('p').innerHTML = isSearch ? 'No notes match<br>your search.' : 'No notes yet.<br>Drop one on this page!';
    return;
  }
  empty.style.display = 'none';

  notes.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-item';

    // Feature #9: Page URL badge + Feature #2: timestamps
    const domain = note.pageUrl ? getDomain(note.pageUrl) : '';
    const icons = [
      note.locked ? '🔒' : '',
      note.theme === 'dark' ? '🌙' : '',
      note.mode === 'checklist' ? '☑' : '',
      note.pinned ? '📌' : '',
    ].filter(Boolean).join('');

    const previewText = note.mode === 'checklist' && note.items && note.items.length
      ? note.items.map(i => (i.checked ? '✓ ' : '○ ') + i.text).join(', ')
      : (note.text || 'Empty note…');

    const tagsStr = (note.tags || []).join(' ');

    item.innerHTML = `
      <div class="note-item-left">
        <div class="note-item-dot" style="background:${note.color}"></div>
        ${icons ? `<div class="note-item-icons">${icons}</div>` : ''}
      </div>
      <div class="note-item-body">
        <div class="note-item-text">${escapeHtml(previewText)}</div>
        ${domain ? `<div class="note-item-url">📍 ${escapeHtml(domain)}</div>` : ''}
        ${tagsStr ? `<div class="note-item-meta">${escapeHtml(tagsStr)}</div>` : ''}
        <div class="note-item-meta">${timeAgo(note.createdAt)}</div>
      </div>
      <button class="note-item-del" data-id="${note.id}" title="Delete">✕</button>
    `;
    item.querySelector('.note-item-del').addEventListener('click', async e => {
      e.stopPropagation();
      await deleteNote(note.id, note.pageUrl);
    });
    list.appendChild(item);
  });
}

function updateToggleBtn() {
  document.getElementById('toggleBtn').textContent = notesHidden ? 'Show Notes' : 'Hide Notes';
}

// Feature #5: Global Search
document.getElementById('searchInput').addEventListener('input', async e => {
  searchQuery = e.target.value.trim().toLowerCase();
  const label = document.getElementById('searchModeLabel');

  if (!searchQuery) {
    label.textContent = '';
    await loadNotes();
    return;
  }

  label.textContent = 'Searching all pages…';
  const allData = await browserAPI.storage.local.get(null);
  const matches = [];

  for (const [key, value] of Object.entries(allData)) {
    if (!key.startsWith('notes_') || !Array.isArray(value)) continue;
    value.forEach(note => {
      const textMatch = (note.text || '').toLowerCase().includes(searchQuery);
      const tagMatch  = (note.tags || []).some(t => t.toLowerCase().includes(searchQuery));
      const itemMatch = (note.items || []).some(i => i.text.toLowerCase().includes(searchQuery));
      if (textMatch || tagMatch || itemMatch) matches.push(note);
    });
  }

  label.textContent = `${matches.length} result${matches.length !== 1 ? 's' : ''} across all pages`;
  document.getElementById('noteCount').textContent = matches.length + ' FOUND';
  renderNotesList(matches, true);
});

// Add note
document.getElementById('addNoteBtn').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  if (!tab.id) return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    showError("Can't add notes on Chrome system pages.\nNavigate to any website first!");
    return;
  }
  const now = new Date().toISOString();
  const note = {
    id: Date.now().toString(),
    color: selectedColor,
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
  await loadNotes();
  window.close();
});

// Delete note (works for both page notes and global search results)
async function deleteNote(noteId, pageUrl) {
  const tab = await getCurrentTab();
  // Determine the correct storage key — use pageUrl if available (for search results)
  const key = pageUrl ? getPageKey(pageUrl) : getPageKey(tab.url);
  const result = await browserAPI.storage.local.get(key);
  const notes = (result[key] || []).filter(n => n.id !== noteId);
  await browserAPI.storage.local.set({ [key]: notes });
  // Try to remove from page if it's the current tab
  try { await browserAPI.tabs.sendMessage(tab.id, { type: 'DELETE_NOTE', id: noteId }); } catch {}
  if (searchQuery) {
    // Re-run search
    document.getElementById('searchInput').dispatchEvent(new Event('input'));
  } else {
    await loadNotes();
  }
}

// Clear all on current page
document.getElementById('clearBtn').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  const key = getPageKey(tab.url);
  await browserAPI.storage.local.set({ [key]: [] });
  try { await browserAPI.tabs.sendMessage(tab.id, { type: 'CLEAR_NOTES' }); } catch {}
  await loadNotes();
});

// Toggle visibility
document.getElementById('toggleBtn').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  const key = getPageKey(tab.url);
  notesHidden = !notesHidden;
  await browserAPI.storage.local.set({ ['hidden_' + key]: notesHidden });
  try { await browserAPI.tabs.sendMessage(tab.id, { type: 'TOGGLE_NOTES', hidden: notesHidden }); } catch {}
  updateToggleBtn();
});

// Export all notes to JSON
document.getElementById('exportBtn').addEventListener('click', async () => {
  const allData = await browserAPI.storage.local.get(null);
  const notesData = {};
  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('notes_') || key.startsWith('hidden_notes_')) notesData[key] = value;
  }
  const blob = new Blob([JSON.stringify(notesData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `quiq-notes-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
  URL.revokeObjectURL(url);
});

// Export current page notes to TXT
document.getElementById('exportTxtBtn').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  const key = getPageKey(tab.url);
  const result = await browserAPI.storage.local.get(key);
  const notes = result[key] || [];
  if (notes.length === 0) { showError('No notes to export on this page!'); return; }
  const lines = [
    `=== Quiq Notes — ${new Date().toLocaleDateString()} ===`,
    `Page: ${tab.url}`, '',
    ...notes.map((n, i) => {
      const content = n.mode === 'checklist' && n.items
        ? n.items.map(it => (it.checked ? '[x] ' : '[ ] ') + it.text).join('\n')
        : (n.text || '(empty)');
      const tags = (n.tags||[]).join(' ');
      return `Note ${i+1}${tags ? ' ' + tags : ''}:\n${content}`;
    }), ''
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `quiq-notes-${new Date().toISOString().split('T')[0]}.txt`; a.click();
  URL.revokeObjectURL(url);
});

// Import
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());

document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const tab = await getCurrentTab();
    const key = getPageKey(tab.url);
    if (file.name.endsWith('.txt')) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (!lines.length) throw new Error('Empty file');
      const result = await browserAPI.storage.local.get(key);
      const existing = result[key] || [];
      const colors = ['#fef08a','#86efac','#93c5fd','#f9a8d4','#fdba74','#d8b4fe'];
      const now = new Date().toISOString();
      const newNotes = lines.map((line, i) => ({
        id: Date.now().toString() + '_' + i,
        color: colors[i % colors.length],
        text: line, x: Math.floor(Math.random()*300+80), y: Math.floor(Math.random()*200+80),
        width: 200, height: 180, zIndex: Date.now()+i,
        createdAt: now, updatedAt: now, locked: false, theme: 'light',
        pinned: null, mode: 'text', items: [], tags: [], pageUrl: tab.url,
      }));
      await browserAPI.storage.local.set({ [key]: [...existing, ...newNotes] });
      for (const note of newNotes) {
        try { await browserAPI.tabs.sendMessage(tab.id, { type: 'ADD_NOTE', note }); }
        catch { await browserAPI.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); }
      }
      showError(`Imported ${newNotes.length} notes!`);
    } else {
      const data = JSON.parse(text);
      await browserAPI.storage.local.set(data);
      try {
        await browserAPI.tabs.sendMessage(tab.id, { type: 'CLEAR_NOTES' });
        await browserAPI.tabs.sendMessage(tab.id, { type: 'RELOAD_NOTES' });
      } catch {}
      showError('Notes imported successfully!');
    }
    await loadNotes();
  } catch (err) {
    showError('Failed to import: ' + (err.message || 'invalid file'));
  }
  e.target.value = '';
});

loadNotes();
