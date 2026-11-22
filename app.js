// ===== CONFIG =====
// Firebase Realtime Database (project chummy-games). Set to '' to use only localStorage.
const FIREBASE_DB_URL = 'https://chummy-games-default-rtdb.firebaseio.com';
// Optional: server that sends SMS (e.g. Twilio Cloud Function). POST {to, body}. Empty = sms: links.
const SMS_ENDPOINT = 'https://secret-santa-9759-dev.twil.io/send';
// ==================
const $ = id => document.getElementById(id);
const DEF_TPL = 'Hi {giver}! 🎅 {organizer} set up Secret Santa. You are giving to {receiver} 🎁';
const blank = (acct = '') => ({ accountName: acct, organizer: '', people: [], ex: {}, template: DEF_TPL });
let S = blank();
const HASH_ID = location.hash.slice(1); let gid = '', saveT;
const uid = () => Math.random().toString(36).slice(2, 9);

let pending = null;
function status(t) { $('save').textContent = t; }
async function flush() {
  clearTimeout(saveT); const data = pending; pending = null;
  if (!data) return;
  if (!FIREBASE_DB_URL) return status('💾 Saved ✓ (this device)');
  try {
    const r = await fetch(`${FIREBASE_DB_URL}/secretSanta/${data.gid}.json`, { method: 'PUT', body: JSON.stringify(data.doc), keepalive: true });
    if (!pending) status(r.ok ? '💾 Saved ✓' : '⚠️ Not saved');
  } catch { if (!pending) status('⚠️ Not saved'); }
}
// delay: 400ms for typing, 0 for clicks
function save(delay = 400) {
  if (!gid && !S.accountName) return;
  if (!gid) { gid = uid() + uid(); history.replaceState(null, '', '#' + gid); }
  const doc = { ...S, updated: Date.now() };
  localStorage.setItem('ss_' + gid, JSON.stringify(doc));
  pending = { gid, doc }; status('⏳ Saving…');
  clearTimeout(saveT); saveT = setTimeout(flush, delay);
}
addEventListener('pagehide', flush);
async function load() {
  if (!gid) return render();
  let d = null;
  if (FIREBASE_DB_URL) try { d = await (await fetch(`${FIREBASE_DB_URL}/secretSanta/${gid}.json`)).json(); } catch {}
  if (!d) try { d = JSON.parse(localStorage.getItem('ss_' + gid)); } catch {}
  if (d) S = { accountName: d.accountName || d.organizer || '', organizer: d.organizer || '', people: d.people || [], ex: d.ex || {}, template: d.template || DEF_TPL };
  render(0); status(d ? '💾 Saved ✓' : '');
}

function render(delay = 0) {
  $('org').value = S.organizer; $('tpl').value = S.template; $('acct').value = S.accountName;
  $('people').innerHTML = '';
  S.people.forEach(p => {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<input placeholder="Name" value="${esc(p.name)}"><input type="tel" placeholder="📱 Phone" value="${esc(p.phone)}"><button class="s">🗑️</button>`;
    const [n, ph, del] = row.children;
    n.oninput = () => { p.name = n.value; update(); };
    ph.oninput = () => { p.phone = ph.value; update(); };
    del.onclick = () => { S.people = S.people.filter(x => x !== p); delete S.ex[p.id]; for (const k in S.ex) S.ex[k] = S.ex[k].filter(x => x !== p.id); render(); };
    $('people').appendChild(row);
  });
  update(true, delay);
}
function matrix() {
  const P = S.people, t = $('mx');
  if (P.length < 2) { t.innerHTML = ''; return; }
  t.innerHTML = '<tr><th></th>' + P.map(p => `<th class="v">🎁 ${esc(p.name || '?')}</th>`).join('') + '</tr>' +
    P.map(g => `<tr><th style="text-align:right">${esc(g.name || '?')}</th>` + P.map(r => g.id === r.id ? '<td class="self">—</td>' :
      `<td><input type="checkbox" data-g="${g.id}" data-r="${r.id}" ${(S.ex[g.id] || []).includes(r.id) ? 'checked' : ''}></td>`).join('') + '</tr>').join('');
  t.querySelectorAll('input').forEach(c => c.onchange = () => {
    const l = S.ex[c.dataset.g] = (S.ex[c.dataset.g] || []).filter(x => x !== c.dataset.r);
    if (c.checked) l.push(c.dataset.r);
    update(false, 0);
  });
}
function update(redraw = true, delay = 400) {
  if (redraw) matrix();
  const hasOrg = !!S.organizer.trim();
  $('gated').hidden = !hasOrg; $('orgNeed').hidden = hasOrg;
  discardDraw();
  const c = Santa.check(S.people, S.ex);
  $('status').className = 'st ' + (c.ok ? 'ok' : 'bad');
  $('status').textContent = c.ok ? '✅ Works! Everyone can get a match.' : '❌ ' + c.why;
  const first = S.people[0], second = S.people[1];
  $('prev').textContent = '👀 ' + Santa.fill(S.template, { organizer: S.organizer || 'You', giver: (first && first.name) || 'Ana', receiver: (second && second.name) || '🤫 (secret)' });
  const noPhone = S.people.filter(p => !(p.phone || '').trim());
  $('go').disabled = !c.ok || !!noPhone.length;
  $('goWhy').textContent = !c.ok ? '❌ Fix the ❌ above first.' : noPhone.length ? `📱 Missing phone: ${noPhone.map(p => p.name || '?').join(', ')}` : '';
  save(delay);
}
const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

$('org').oninput = e => { S.organizer = e.target.value; update(false); };
$('tpl').oninput = e => { S.template = e.target.value; update(false); };
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = $('tpl'), i = t.selectionStart ?? t.value.length; t.value = t.value.slice(0, i) + b.dataset.t + t.value.slice(i); S.template = t.value; update(false, 0); t.focus(); });
$('add').onclick = () => { S.people.push({ id: uid(), name: '', phone: '' }); render(); const ins = $('people').querySelectorAll('.row'); ins[ins.length - 1].children[0].focus(); };
// ===== START SCREEN =====
function showApp(on) { $('start').hidden = on; $('app').hidden = !on; }
// All accounts: {id: record}. Firebase is the source of truth; localStorage only if no Firebase.
async function allAccounts() {
  let all = null;
  if (FIREBASE_DB_URL) try { const r = await fetch(`${FIREBASE_DB_URL}/secretSanta.json`); if (r.ok) all = (await r.json()) || {}; } catch {}
  if (!all) { all = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('ss_')) try { all[k.slice(3)] = JSON.parse(localStorage.getItem(k)); } catch {} } }
  delete all._probe;
  return Object.entries(all).filter(([, d]) => d && (d.accountName || d.organizer || '').trim()).map(([id, d]) => ({ id, d, name: (d.accountName || d.organizer).trim() }));
}
const key = s => String(s || '').trim().toLowerCase();
async function nameTaken(name, selfId) { return (await allAccounts()).some(a => a.id !== selfId && key(a.name) === key(name)); }

async function showStart() {
  discardDraw(); await flush(); cancelEdit();
  gid = ''; history.replaceState(null, '', location.pathname);
  S = blank(); $('send').innerHTML = ''; status(''); $('startMsg').hidden = true;
  showApp(false); $('newOrg').value = ''; $('newOrgGo').disabled = true;
  const list = $('orgList'); list.innerHTML = '<div class="note">⏳</div>';
  const accts = (await allAccounts()).sort((x, y) => (y.d.updated || 0) - (x.d.updated || 0));
  list.innerHTML = '';
  accts.forEach(({ id, d, name }) => {
    const b = document.createElement('button'); b.className = 's';
    b.textContent = `👤 ${name} · 👥 ${(d.people || []).length}`;
    if (id === HASH_ID) { b.className = 'g'; b.textContent = '⭐ ' + b.textContent; }
    b.onclick = () => { gid = id; history.replaceState(null, '', '#' + id); showApp(true); load(); };
    if (id === HASH_ID) list.prepend(b); else list.appendChild(b);
  });
}
async function startNew() {
  const n = $('newOrg').value.trim(); if (!n) return $('newOrg').focus();
  $('newOrgGo').disabled = true;
  const taken = await nameTaken(n, null);
  $('newOrgGo').disabled = false;
  if (taken) { $('startMsg').textContent = '❌ That name is taken'; $('startMsg').hidden = false; return; }
  gid = ''; S = blank(n);
  showApp(true); render(0); $('org').focus();
}
$('newOrgGo').onclick = startNew;
$('newOrg').oninput = () => { $('newOrgGo').disabled = !$('newOrg').value.trim(); $('startMsg').hidden = true; };
$('newOrg').onkeydown = e => { if (e.key === 'Enter') startNew(); };

// ===== ACCOUNT RENAME =====
let editing = false;
function cancelEdit() { editing = false; $('acct').readOnly = true; $('acct').style.borderColor = 'transparent'; $('acctEdit').textContent = '✏️'; $('acct').value = S.accountName; }
$('acctEdit').onclick = async () => {
  const inp = $('acct');
  if (!editing) { editing = true; inp.readOnly = false; inp.style.borderColor = ''; $('acctEdit').textContent = '✅'; $('acctMsg').hidden = true; inp.focus(); inp.select(); return; }
  const n = inp.value.trim();
  if (!n || key(n) === key(S.accountName)) { if (n) S.accountName = n; cancelEdit(); if (n) save(0); return; }
  $('acctEdit').disabled = true;
  const taken = await nameTaken(n, gid);
  $('acctEdit').disabled = false;
  if (taken) { $('acctMsg').textContent = '❌ Taken'; $('acctMsg').hidden = false; cancelEdit(); return; }
  S.accountName = n; cancelEdit(); save(0);
};
$('acct').onkeydown = e => { if (e.key === 'Enter' && editing) $('acctEdit').onclick(); if (e.key === 'Escape') cancelEdit(); };
$('newBtn').onclick = showStart;

// ===== DRAW (page memory only: never saved, never logged) =====
let DRAW = null, seen = false;
function makeDraw() {
  const P = S.people, d = Santa.draw(P, S.ex);
  if (!d) { alert('❌ No match possible.'); return false; }
  DRAW = P.map((g, i) => ({ name: g.name, to: g.phone.trim(), rname: P[d[i]].name, body: Santa.fill(S.template, { organizer: S.organizer, giver: g.name, receiver: P[d[i]].name }) }));
  seen = false; $('results').innerHTML = ''; $('send').innerHTML = ''; $('drawBox').hidden = false;
  return true;
}
function discardDraw() { DRAW = null; seen = false; if ($('drawBox')) { $('drawBox').hidden = true; $('results').innerHTML = ''; } }
$('go').onclick = () => makeDraw();
$('again').onclick = () => makeDraw();
$('see').onclick = () => {
  if (!DRAW) return;
  seen = true;
  $('results').innerHTML = DRAW.map(m => `<div class="prev"><b>📱 ${esc(m.name)}</b> → 🎁 ${esc(m.rname)}<br>${esc(m.body)}</div>`).join('');
};
function confirmSend() { if (DRAW && confirm('Are you sure you want to text everyone?')) sendMsgs(DRAW); }
$('sendBtn').onclick = () => { if (!DRAW) return; if (seen) $('seenDlg').hidden = false; else confirmSend(); };
$('dlgNew').onclick = () => { $('seenDlg').hidden = true; if (makeDraw()) confirmSend(); };
$('dlgThis').onclick = () => { $('seenDlg').hidden = true; confirmSend(); };
$('dlgCancel').onclick = () => { $('seenDlg').hidden = true; };
async function sendMsgs(msgs) {
  const box = $('send'); box.innerHTML = '';
  const smsBtn = m => {
    const a = document.createElement('a');
    a.href = `sms:${m.to.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(m.body)}`;
    a.textContent = `📱 Send to ${m.name} (${m.to})`;
    a.onclick = () => setTimeout(() => { a.classList.add('done'); a.textContent = '✅ ' + a.textContent.slice(2); }, 300);
    return a;
  };
  const line = (cls, t) => { const d = document.createElement('div'); d.className = 'st ' + cls; d.style.margin = '6px 0'; d.textContent = t; box.appendChild(d); };
  let failed = msgs;
  if (SMS_ENDPOINT) {
    line('', '⏳ Sending…');
    let res = null;
    try {
      const r = await fetch(SMS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs.map(m => ({ to: m.to, body: m.body })) }) });
      res = await r.json();
    } catch {}
    box.innerHTML = '';
    if (Array.isArray(res) && res.length === msgs.length) {
      failed = [];
      msgs.forEach((m, i) => {
        if (res[i].ok) line('ok', `✅ sent to ${m.name}`);
        else { line('bad', `⚠️ ${m.name}: ${String(res[i].error || 'failed').replace(/^\d+: /, '').slice(0, 80)}`); failed.push(m); }
      });
    } else line('bad', '⚠️ Could not reach the texting service.');
  }
  if (failed.length) {
    const n = document.createElement('div'); n.className = 'note';
    n.textContent = '📱 Backup: tap to send from your phone. 🤫 Don\'t read the text! (It is visible in your Messages app.)';
    box.appendChild(n);
    failed.forEach(m => box.appendChild(smsBtn(m)));
  }
}

// Always start on the organizer screen, even with a #group link.
showStart();
