(() => {
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  if (window.__quiqNotesLoaded) return;
  window.__quiqNotesLoaded = true;

  function getPageKey() {
    try { const u = new URL(location.href); return 'notes_' + u.hostname + u.pathname; }
    catch { return 'notes_global'; }
  }
  function darken(hex, amount = 20) {
    const n = parseInt(hex.replace('#',''), 16);
    return `rgb(${Math.max(0,(n>>16)-amount)},${Math.max(0,((n>>8)&0xFF)-amount)},${Math.max(0,(n&0xFF)-amount)})`;
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
  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  const KEY = getPageKey(), HIDDEN_KEY = 'hidden_' + KEY;
  let notes = [], hidden = false;
  const noteEls = new Map();
  let activeTextarea = null;

  browserAPI.storage.local.get([KEY, HIDDEN_KEY], (r) => {
    notes = r[KEY] || []; hidden = r[HIDDEN_KEY] || false;
    notes.forEach(n => renderNote(n));
    if (hidden) document.body.classList.add('quiq-notes-hidden');
  });

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :host{position:fixed!important;z-index:2147483600!important;display:block!important;min-width:160px;min-height:120px;border-radius:4px 14px 14px 14px;box-shadow:0 4px 6px rgba(0,0,0,.18),0 12px 32px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.5);overflow:hidden;font-family:'Caveat',cursive;cursor:default;user-select:none;animation:pop-in .25s cubic-bezier(.34,1.56,.64,1) both;}
    @keyframes pop-in{from{transform:scale(.6) rotate(-4deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
    :host(.dragging){box-shadow:0 18px 48px rgba(0,0,0,.3);transform:rotate(2deg) scale(1.03);}
    .wrapper{width:100%;height:100%;display:flex;flex-direction:column;position:relative;}
    .wrapper::before{content:'';position:absolute;top:-5px;left:18px;width:12px;height:12px;background:radial-gradient(circle at 40% 35%,#ff6b6b,#c0392b);border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);z-index:2;pointer-events:none;}
    .header{padding:5px 6px 4px;display:flex;align-items:center;justify-content:space-between;cursor:grab;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,.08);background:rgba(0,0,0,.06);}
    .header:active{cursor:grabbing;}
    .dots{display:flex;gap:4px;align-items:center;}
    .dot{width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,.2);}
    .actions{display:flex;align-items:center;gap:2px;}
    .ab{width:20px;height:20px;border-radius:5px;background:rgba(0,0,0,.08);border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.5);transition:background .15s,transform .1s;padding:0;}
    .ab:hover{background:rgba(0,0,0,.18);transform:scale(1.1);}
    .ab.on{background:rgba(0,0,0,.22);color:rgba(0,0,0,.9);}
    .del-btn:hover{background:rgba(200,40,40,.25)!important;color:#c02020!important;}
    .body{flex:1;padding:8px 10px 4px;display:flex;flex-direction:column;background:transparent;overflow:hidden;min-height:0;}
    textarea{flex:1;width:100%;min-height:50px;background:transparent;border:none;outline:none;resize:none;font-family:'Caveat',cursive;font-size:17px;color:#1a1208;-webkit-text-fill-color:#1a1208;line-height:1.5;cursor:text;padding:0;}
    textarea::placeholder{color:rgba(0,0,0,.28);-webkit-text-fill-color:rgba(0,0,0,.28);font-style:italic;}
    textarea:disabled{cursor:default;opacity:.85;}
    .checklist{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:2px;min-height:50px;}
    .checklist::-webkit-scrollbar{width:3px;}
    .checklist::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:2px;}
    .ci{display:flex;align-items:center;gap:5px;padding:1px 0;}
    .ci input[type=checkbox]{width:14px;height:14px;cursor:pointer;flex-shrink:0;margin:0;accent-color:rgba(0,0,0,.6);}
    .ci .it{flex:1;font-family:'Caveat',cursive;font-size:16px;color:#1a1208;background:transparent;border:none;outline:none;padding:0;min-width:0;}
    .ci.done .it{text-decoration:line-through;opacity:.45;}
    .ci .ri{width:14px;height:14px;background:transparent;border:none;cursor:pointer;font-size:10px;color:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;flex-shrink:0;padding:0;}
    .ci:hover .ri{opacity:1;}
    .ni-row{display:flex;align-items:center;gap:5px;margin-top:2px;}
    .ni-plus{font-size:13px;color:rgba(0,0,0,.25);width:14px;text-align:center;flex-shrink:0;}
    .ni{flex:1;font-family:'Caveat',cursive;font-size:16px;color:#1a1208;background:transparent;border:none;outline:none;padding:0;}
    .ni::placeholder{color:rgba(0,0,0,.25);font-style:italic;}
    .tags-row{display:flex;flex-wrap:wrap;gap:3px;align-items:center;padding-top:4px;min-height:20px;}
    .tag-chip{font-size:11px;background:rgba(0,0,0,.1);color:rgba(0,0,0,.6);border-radius:10px;padding:1px 7px;font-family:'Caveat',cursive;cursor:default;}
    .tag-input{font-family:'Caveat',cursive;font-size:13px;color:#1a1208;background:transparent;border:none;outline:none;width:60px;min-width:40px;}
    .tag-input::placeholder{color:rgba(0,0,0,.25);font-style:italic;}
    .note-foot{display:flex;align-items:center;justify-content:space-between;padding:2px 10px 4px;flex-shrink:0;}
    .timestamp{font-size:10px;color:rgba(0,0,0,.3);font-family:system-ui,sans-serif;}
    .locked-badge{font-size:10px;color:rgba(0,0,0,.35);}
    .pin-badge{font-size:10px;color:rgba(0,0,0,.35);}
    .resize-handle{width:18px;height:18px;cursor:nwse-resize;opacity:.25;transition:opacity .2s;flex-shrink:0;position:relative;}
    .resize-handle::before{content:'';position:absolute;bottom:3px;right:3px;width:8px;height:8px;border-right:2px solid rgba(0,0,0,.5);border-bottom:2px solid rgba(0,0,0,.5);}
    :host(:hover) .resize-handle{opacity:.55;}
    /* DARK THEME */
    .wrapper.dark{border-left:2px solid var(--accent);}
    .wrapper.dark .header{background:rgba(0,0,0,.35);border-bottom-color:rgba(255,255,255,.06);}
    .wrapper.dark .dot{background:rgba(255,255,255,.2);}
    .wrapper.dark .ab{background:rgba(255,255,255,.08);color:rgba(255,255,255,.5);}
    .wrapper.dark .ab:hover{background:rgba(255,255,255,.18);color:rgba(255,255,255,.9);}
    .wrapper.dark .ab.on{background:rgba(255,255,255,.22);color:#fff;}
    .wrapper.dark .del-btn:hover{background:rgba(200,40,40,.35)!important;color:#e05050!important;}
    .wrapper.dark textarea,.wrapper.dark .ci .it,.wrapper.dark .ni{color:#f0ead6;-webkit-text-fill-color:#f0ead6;}
    .wrapper.dark textarea::placeholder,.wrapper.dark .ni::placeholder{color:rgba(255,255,255,.3);-webkit-text-fill-color:rgba(255,255,255,.3);}
    .wrapper.dark .tag-chip{background:rgba(255,255,255,.12);color:rgba(255,255,255,.6);}
    .wrapper.dark .tag-input{color:#f0ead6;}
    .wrapper.dark .tag-input::placeholder{color:rgba(255,255,255,.25);}
    .wrapper.dark .timestamp,.wrapper.dark .locked-badge,.wrapper.dark .pin-badge{color:rgba(255,255,255,.3);}
    .wrapper.dark .resize-handle::before{border-color:rgba(255,255,255,.4);}
    .wrapper.dark .checklist::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);}
    .wrapper.dark .ci input[type=checkbox]{accent-color:rgba(255,255,255,.7);}
    .wrapper.dark .ci .ri{color:rgba(255,255,255,.35);}
    .wrapper.dark .ni-plus{color:rgba(255,255,255,.25);}
  `;

  const PINS = [null, 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const PIN_ICONS = {'top-left':'↖','top-right':'↗','bottom-left':'↙','bottom-right':'↘'};

  function applyPin(host, note) {
    if (!note.pinned) {
      host.style.left = note.x + 'px';
      host.style.top  = note.y + 'px';
      host.style.right = '';
      host.style.bottom = '';
    } else {
      const p = note.pinned;
      host.style.top    = p.includes('top')    ? '16px' : '';
      host.style.bottom = p.includes('bottom') ? '16px' : '';
      host.style.left   = p.includes('left')   ? '16px' : '';
      host.style.right  = p.includes('right')  ? '16px' : '';
    }
  }

  function buildChecklist(shadow, note, locked) {
    const cl = shadow.querySelector('.checklist');
    cl.innerHTML = '';
    (note.items || []).forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'ci' + (item.checked ? ' done' : '');
      row.innerHTML = `<input type="checkbox" ${item.checked?'checked':''} ${locked?'disabled':''}>
        <input class="it" value="${esc(item.text)}" ${locked?'disabled':''} placeholder="Item…">
        <button class="ri" ${locked?'disabled':''}>✕</button>`;
      row.querySelector('input[type=checkbox]').addEventListener('change', e => {
        item.checked = e.target.checked;
        row.classList.toggle('done', item.checked);
        note.updatedAt = new Date().toISOString();
        saveNotes();
      });
      row.querySelector('.it').addEventListener('input', e => {
        item.text = e.target.value;
        note.updatedAt = new Date().toISOString();
        saveNotes();
      });
      row.querySelector('.ri').addEventListener('click', () => {
        note.items.splice(i, 1);
        buildChecklist(shadow, note, locked);
        saveNotes();
      });
      cl.appendChild(row);
    });
    // new item row
    if (!locked) {
      const nr = document.createElement('div');
      nr.className = 'ni-row';
      nr.innerHTML = `<span class="ni-plus">+</span><input class="ni" placeholder="Add item…">`;
      nr.querySelector('.ni').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const v = e.target.value.trim();
        if (!v) return;
        note.items.push({ id: Date.now().toString(), text: v, checked: false });
        note.updatedAt = new Date().toISOString();
        buildChecklist(shadow, note, locked);
        saveNotes();
        setTimeout(() => {
          const inputs = shadow.querySelectorAll('.ni');
          if (inputs.length) inputs[inputs.length-1].focus();
        }, 20);
      });
      cl.appendChild(nr);
    }
  }

  function renderNote(note) {
    if (noteEls.has(note.id)) return;
    // Migrate old notes
    if (!note.createdAt) note.createdAt = new Date().toISOString();
    if (!note.updatedAt) note.updatedAt = new Date().toISOString();
    if (note.locked === undefined) note.locked = false;
    if (!note.theme) note.theme = 'light';
    if (!note.pinned) note.pinned = null;
    if (!note.mode) note.mode = 'text';
    if (!note.items) note.items = [];
    if (!note.tags) note.tags = [];

    const host = document.createElement('div');
    host.id = 'quiq-' + note.id;
    host.style.cssText = `position:fixed!important;left:${note.x}px;top:${note.y}px;width:${note.width||200}px;height:${note.height||180}px;z-index:${note.zIndex||2147483600};`;
    applyPin(host, note);

    const shadow = host.attachShadow({ mode: 'open' });
    const isDark = note.theme === 'dark';
    const bgStyle = isDark
      ? `background:#1e1e22;--accent:${note.color};`
      : `background:linear-gradient(145deg,${note.color},${darken(note.color,8)});`;

    const tagsHtml = (note.tags||[]).map(t => `<span class="tag-chip">${esc(t)}</span>`).join('');
    const pinIcon = note.pinned ? PIN_ICONS[note.pinned] : '📌';
    const isChecklist = note.mode === 'checklist';

    shadow.innerHTML = `<style>${CSS}</style>
      <div class="wrapper${isDark?' dark':''}" style="${bgStyle}">
        <div class="header">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <div class="actions">
            <button class="ab theme-btn${isDark?' on':''}" title="Toggle dark mode">🌙</button>
            <button class="ab mode-btn${isChecklist?' on':''}" title="Checklist mode">☑</button>
            <button class="ab lock-btn${note.locked?' on':''}" title="${note.locked?'Unlock':'Lock'} note">${note.locked?'🔒':'🔓'}</button>
            <button class="ab pin-btn${note.pinned?' on':''}" title="Pin to corner">${note.pinned?PIN_ICONS[note.pinned]:'📌'}</button>
            <button class="ab del-btn" title="Delete">✕</button>
          </div>
        </div>
        <div class="body">
          ${isChecklist
            ? `<div class="checklist"></div>`
            : `<textarea placeholder="Write something…" spellcheck="false"${note.locked?' disabled':''}>${esc(note.text||'')}</textarea>`
          }
          <div class="tags-row">
            ${tagsHtml}
            ${!note.locked?`<input class="tag-input" placeholder="#tag">`:'' }
          </div>
        </div>
        <div class="note-foot">
          <span class="timestamp">${timeAgo(note.createdAt)}</span>
          <div style="display:flex;align-items:center;gap:4px;">
            ${note.locked?`<span class="locked-badge">🔒 locked</span>`:''}
            ${note.pinned?`<span class="pin-badge">${PIN_ICONS[note.pinned]} pinned</span>`:''}
            <div class="resize-handle"></div>
          </div>
        </div>
      </div>`;

    const wrapper  = shadow.querySelector('.wrapper');
    const header   = shadow.querySelector('.header');
    const textarea = shadow.querySelector('textarea');
    const delBtn   = shadow.querySelector('.del-btn');
    const themeBtn = shadow.querySelector('.theme-btn');
    const modeBtn  = shadow.querySelector('.mode-btn');
    const lockBtn  = shadow.querySelector('.lock-btn');
    const pinBtn   = shadow.querySelector('.pin-btn');
    const resizeH  = shadow.querySelector('.resize-handle');
    const tagInput = shadow.querySelector('.tag-input');

    // Checklist
    if (isChecklist) buildChecklist(shadow, note, note.locked);

    // Textarea events
    if (textarea) {
      textarea.addEventListener('input', () => { note.text = textarea.value; note.updatedAt = new Date().toISOString(); saveNotes(); });
      textarea.addEventListener('mousedown', e => e.stopPropagation());
      textarea.addEventListener('pointerdown', e => e.stopPropagation());
      textarea.addEventListener('focus', () => { activeTextarea = textarea; });
      textarea.addEventListener('blur',  () => { activeTextarea = null; });
      textarea.addEventListener('paste', async e => {
        e.preventDefault(); e.stopPropagation();
        let t = '';
        try { t = await navigator.clipboard.readText(); } catch { t = e.clipboardData?.getData('text/plain')||''; }
        if (!t) return;
        const s = textarea.selectionStart, en = textarea.selectionEnd;
        textarea.value = textarea.value.slice(0,s) + t + textarea.value.slice(en);
        textarea.setSelectionRange(s+t.length, s+t.length);
        note.text = textarea.value; note.updatedAt = new Date().toISOString(); saveNotes();
      });
    }

    // Tag input
    if (tagInput) {
      tagInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();
        let v = tagInput.value.trim().replace(/^#+/, '');
        if (!v) return;
        v = '#' + v;
        if (!note.tags.includes(v)) { note.tags.push(v); saveNotes(); }
        // Re-render tags area
        shadow.querySelectorAll('.tag-chip').forEach(el => el.remove());
        const tagsRow = shadow.querySelector('.tags-row');
        note.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'tag-chip'; chip.textContent = tag;
          tagsRow.insertBefore(chip, tagInput);
        });
        tagInput.value = '';
      });
      tagInput.addEventListener('mousedown', e => e.stopPropagation());
      tagInput.addEventListener('pointerdown', e => e.stopPropagation());
    }

    // Theme toggle
    themeBtn.addEventListener('click', e => { e.stopPropagation();
      note.theme = note.theme === 'dark' ? 'light' : 'dark';
      saveNotes(); rebuildNote(note, host);
    });

    // Checklist mode toggle
    modeBtn.addEventListener('click', e => { e.stopPropagation();
      note.mode = note.mode === 'checklist' ? 'text' : 'checklist';
      if (note.mode === 'checklist' && !note.items.length && note.text) {
        note.items = note.text.split('\n').filter(l=>l.trim()).map((l,i)=>({id:Date.now()+'_'+i,text:l.trim(),checked:false}));
        note.text = '';
      }
      saveNotes(); rebuildNote(note, host);
    });

    // Lock toggle
    lockBtn.addEventListener('click', e => { e.stopPropagation();
      note.locked = !note.locked; saveNotes(); rebuildNote(note, host);
    });

    // Pin toggle (cycle through corners)
    pinBtn.addEventListener('click', e => { e.stopPropagation();
      const i = PINS.indexOf(note.pinned);
      note.pinned = PINS[(i+1) % PINS.length];
      applyPin(host, note); saveNotes(); rebuildNote(note, host);
    });

    delBtn.addEventListener('click', () => removeNote(note.id));
    makeDraggable(host, header, note);
    makeResizable(host, resizeH, note);

    document.body.appendChild(host);
    noteEls.set(note.id, host);
    if (!note.text && !note.items.length && textarea) setTimeout(() => textarea.focus(), 50);
  }

  function rebuildNote(note, host) {
    host.remove();
    noteEls.delete(note.id);
    renderNote(note);
  }

  function makeDraggable(el, handle, note) {
    let sx, sy, sl, st;
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('.ab')) return;
      if (note.pinned) return;
      e.preventDefault(); e.stopPropagation();
      sx=e.clientX; sy=e.clientY; sl=note.x; st=note.y;
      const maxZ = Math.max(...notes.map(n=>n.zIndex||0), 2147483600);
      note.zIndex = maxZ+1; el.style.zIndex = note.zIndex;
      el.classList.add('quiq-dragging');
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!el.classList.contains('quiq-dragging')) return;
      note.x = Math.max(0, Math.min(window.innerWidth-50,  sl+e.clientX-sx));
      note.y = Math.max(0, Math.min(window.innerHeight-50, st+e.clientY-sy));
      el.style.left = note.x+'px'; el.style.top = note.y+'px';
    });
    handle.addEventListener('pointerup', () => { el.classList.remove('quiq-dragging'); saveNotes(); });
  }

  function makeResizable(el, handle, note) {
    let sx, sy, sw, sh;
    handle.addEventListener('pointerdown', e => {
      if (note.locked) return;
      e.preventDefault(); e.stopPropagation();
      sx=e.clientX; sy=e.clientY; sw=note.width||200; sh=note.height||180;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      note.width  = Math.max(160, sw+e.clientX-sx);
      note.height = Math.max(120, sh+e.clientY-sy);
      el.style.width = note.width+'px'; el.style.height = note.height+'px';
    });
    handle.addEventListener('pointerup', () => saveNotes());
  }

  function removeNote(id) {
    const el = noteEls.get(id);
    if (el) { el.style.transform='scale(.5) rotate(8deg)'; el.style.opacity='0'; el.style.transition='transform .2s,opacity .2s'; setTimeout(()=>el.remove(),200); noteEls.delete(id); }
    notes = notes.filter(n=>n.id!==id); saveNotes();
  }

  let saveTimer;
  function saveNotes() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => browserAPI.storage.local.set({[KEY]:notes}), 300);
  }

  document.addEventListener('copy', e => {
    if (!activeTextarea) return;
    let t = e.clipboardData?.getData('text/plain') || window.getSelection()?.toString() || '';
    if (!t) return;
    setTimeout(() => {
      const s=activeTextarea.selectionStart, en=activeTextarea.selectionEnd;
      activeTextarea.value = activeTextarea.value.slice(0,s)+t+activeTextarea.value.slice(en);
      activeTextarea.setSelectionRange(s+t.length, s+t.length);
      const note = notes.find(n => { const el=noteEls.get(n.id); return el&&el.shadowRoot&&el.shadowRoot.querySelector('textarea')===activeTextarea; });
      if (note) { note.text=activeTextarea.value; note.updatedAt=new Date().toISOString(); saveNotes(); }
    }, 50);
  });

  browserAPI.runtime.onMessage.addListener((msg) => {
    if (msg.type==='ADD_NOTE') { notes.push(msg.note); renderNote(msg.note); }
    else if (msg.type==='DELETE_NOTE') { removeNote(msg.id); }
    else if (msg.type==='CLEAR_NOTES') { notes.forEach(n=>{ const el=noteEls.get(n.id); if(el) el.remove(); }); noteEls.clear(); notes=[]; browserAPI.storage.local.set({[KEY]:[]}); }
    else if (msg.type==='TOGGLE_NOTES') { hidden=msg.hidden; document.body.classList.toggle('quiq-notes-hidden',hidden); }
    else if (msg.type==='RELOAD_NOTES') {
      browserAPI.storage.local.get([KEY,HIDDEN_KEY], r => {
        const fresh = r[KEY]||[];
        fresh.forEach(n => { if (!noteEls.has(n.id)) { notes.push(n); renderNote(n); } });
        hidden = r[HIDDEN_KEY]||false;
        document.body.classList.toggle('quiq-notes-hidden', hidden);
      });
    }
  });
})();
