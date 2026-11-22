// ===== CONFIG =====
// Firebase Realtime Database (project chummy-games). Set to '' to use only localStorage.
const FIREBASE_DB_URL = 'https://chummy-games-default-rtdb.firebaseio.com';
// Google Apps Script web app that sends email-to-text. Empty = not set up yet.
const GMAIL_SENDER_URL = 'https://script.google.com/macros/s/AKfycbwstNSj2eafr2esvsNbLlG-hmGuQOicwcTZuEU-wAravwV5mhXm23KYPT5GNvgXdADb/exec';
// ==================
const $ = id => document.getElementById(id);
const DEF_TPL = 'Hi {giver}! 🎅 {organizer} set up Secret Santa. You are giving to {receiver} 🎁';
const blank = (acct = '') => ({ accountName: acct, organizer: '', people: [], ex: {}, template: DEF_TPL, subject: '' });
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
  if (d) S = { accountName: d.accountName || d.organizer || '', organizer: d.organizer || '', people: d.people || [], ex: d.ex || {}, template: d.template || DEF_TPL, subject: d.subject || '' };
  render(0); status(d ? '💾 Saved ✓' : '');
}

function render(delay = 0) {
  $('org').value = S.organizer; $('tpl').value = S.template; $('subj').value = S.subject || ''; $('acct').value = S.accountName;
  $('people').innerHTML = '';
  S.people.forEach(p => {
    const row = document.createElement('div'); row.className = 'row';
    const opts = Sms.CARRIERS.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
    row.innerHTML = `<input placeholder="Name" value="${esc(p.name)}"><input type="tel" placeholder="📱 Phone" value="${esc(p.phone)}"><select aria-label="Carrier"><option value="">📡 Carrier</option>${opts}</select><button class="s">🗑️</button>`;
    const [n, ph, car, del] = row.children;
    car.value = p.carrier || '';
    n.oninput = () => { p.name = n.value; update(); };
    ph.oninput = () => { p.phone = ph.value; update(); };
    car.onchange = () => { p.carrier = car.value; update(false, 0); };
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
  const sample = { organizer: S.organizer || 'You', giver: 'Ana', receiver: 'Bob' };
  const subjPrev = Santa.fill(S.subject || '', sample);
  $('prev').textContent = (subjPrev ? '📨 ' + subjPrev + '\n' : '') + Santa.fill(S.template, sample);
  const noPhone = S.people.filter(p => !(p.phone || '').trim());
  $('go').disabled = !c.ok || !!noPhone.length;
  $('goWhy').textContent = !c.ok ? '❌ Fix the ❌ above first.' : noPhone.length ? `📱 Missing phone: ${noPhone.map(p => p.name || '?').join(', ')}` : '';
  save(delay);
}
const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

$('org').oninput = e => { S.organizer = e.target.value; update(false); };
$('tpl').oninput = e => { S.template = e.target.value; update(false); };
$('subj').oninput = e => { S.subject = e.target.value; update(false); };
let textTarget = 'tpl';
$('tpl').onfocus = () => { textTarget = 'tpl'; };
$('subj').onfocus = () => { textTarget = 'subj'; };
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = $(textTarget), i = t.selectionStart ?? t.value.length; t.value = t.value.slice(0, i) + b.dataset.t + t.value.slice(i); if (textTarget === 'tpl') S.template = t.value; else S.subject = t.value; update(false, 0); t.focus(); });
$('add').onclick = () => { S.people.push({ id: uid(), name: '', phone: '', carrier: '' }); render(); const ins = $('people').querySelectorAll('.row'); ins[ins.length - 1].children[0].focus(); };
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
  DRAW = P.map((g, i) => { const v = { organizer: S.organizer, giver: g.name, receiver: P[d[i]].name }; return { name: g.name, to: g.phone.trim(), carrier: g.carrier || '', rname: P[d[i]].name, subject: Santa.fill(S.subject || '', v), body: Santa.fill(S.template, v) }; });
  seen = false; $('results').innerHTML = ''; $('send').innerHTML = ''; $('drawBox').hidden = false;
  return true;
}
function discardDraw() { DRAW = null; seen = false; if ($('drawBox')) { $('drawBox').hidden = true; $('results').innerHTML = ''; } }
$('go').onclick = () => makeDraw();
$('again').onclick = () => makeDraw();
$('see').onclick = () => {
  if (!DRAW) return;
  seen = true;
  $('results').innerHTML = DRAW.map(m => `<div class="prev"><b>📱 ${esc(m.name)}</b> → 🎁 ${esc(m.rname)}${m.subject ? `<br>📨 ${esc(m.subject)}` : ''}<br>${esc(m.body)}</div>`).join('');
};
function confirmSend() { if (DRAW && confirm('Are you sure you want to text everyone?')) sendMsgs(DRAW); }
$('sendBtn').onclick = () => { if (!DRAW) return; if (seen) $('seenDlg').hidden = false; else confirmSend(); };
$('dlgNew').onclick = () => { $('seenDlg').hidden = true; if (makeDraw()) confirmSend(); };
$('dlgThis').onclick = () => { $('seenDlg').hidden = true; confirmSend(); };
$('dlgCancel').onclick = () => { $('seenDlg').hidden = true; };
async function sendMsgs(msgs) {
  const box = $('send'); box.innerHTML = '';
  const line = (cls, t) => { const d = document.createElement('div'); d.className = 'st ' + cls; d.style.margin = '6px 0'; d.textContent = t; box.appendChild(d); };
  if (!GMAIL_SENDER_URL) { line('bad', '📧 Email sender not set up yet'); return; }
  const ready = [], skipped = [];
  msgs.forEach(m => {
    const t = Sms.emailTarget(m);
    if (t.ok) ready.push({ m, to: t.to, subject: Sms.stripEmoji(m.subject).slice(0, 100), body: Sms.stripEmoji(m.body) });
    else skipped.push({ m, why: t.why });
  });
  skipped.forEach(x => line('bad', `⚠️ ${x.m.name}: ${x.why}`));
  if (!ready.length) return;
  // One text at a time with a gap, so carrier spam filters don't drop a burst.
  for (let i = 0; i < ready.length; i++) {
    const x = ready[i];
    const row = document.createElement('div'); row.className = 'st'; row.style.margin = '6px 0'; row.textContent = `⏳ ${x.m.name}…`; box.appendChild(row);
    if (i > 0) await new Promise(r => setTimeout(r, 6000));
    let res = null;
    try {
      const r = await fetch(GMAIL_SENDER_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ groupId: gid, messages: [{ to: x.to, subject: x.subject, body: x.body }] }) });
      res = await r.json();
    } catch {}
    const ok = Array.isArray(res) && res[0] && res[0].ok;
    row.className = 'st ' + (ok ? 'ok' : 'bad');
    row.textContent = ok ? `✅ sent to ${x.m.name}` : `⚠️ ${x.m.name}: ${String((Array.isArray(res) && res[0] && res[0].error) || (res && res.error) || 'could not reach sender').slice(0, 80)}`;
  }
}

// Always start on the organizer screen, even with a #group link.
showStart();
