// ===== CONFIG =====
// Firebase Realtime Database (project chummy-games). Set to '' to use only localStorage.
const FIREBASE_DB_URL = 'https://chummy-games-default-rtdb.firebaseio.com';
// Optional: server that sends SMS (e.g. Twilio Cloud Function). POST {to, body}. Empty = sms: links.
const SMS_ENDPOINT = '';
// ==================
const $ = id => document.getElementById(id);
const DEF_TPL = 'Hi {giver}! 🎅 {organizer} set up Secret Santa. You are giving to {receiver} 🎁';
let S = { organizer: '', people: [], ex: {}, template: DEF_TPL };
let demo = false, gid = location.hash.slice(1) || '', saveT;
const uid = () => Math.random().toString(36).slice(2, 9);

function save() {
  if (demo) { $('save').textContent = '▶️ Demo (not saved)'; return; }
  if (!gid && !S.organizer && !S.people.length) return;
  if (!gid) { gid = uid() + uid(); history.replaceState(null, '', '#' + gid); }
  const data = { ...S, updated: Date.now() };
  localStorage.setItem('ss_' + gid, JSON.stringify(data));
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    if (!FIREBASE_DB_URL) { $('save').textContent = '💾 Saved on this device'; return; }
    try {
      const r = await fetch(`${FIREBASE_DB_URL}/secretSanta/${gid}.json`, { method: 'PUT', body: JSON.stringify(data) });
      $('save').textContent = r.ok ? '☁️ Saved to Firebase' : '💾 Saved on this device (Firebase blocked)';
    } catch { $('save').textContent = '💾 Saved on this device (offline)'; }
  }, 600);
}
async function load() {
  if (!gid) return render();
  let d = null;
  if (FIREBASE_DB_URL) try { d = await (await fetch(`${FIREBASE_DB_URL}/secretSanta/${gid}.json`)).json(); } catch {}
  if (!d) try { d = JSON.parse(localStorage.getItem('ss_' + gid)); } catch {}
  if (d) S = { organizer: d.organizer || '', people: d.people || [], ex: d.ex || {}, template: d.template || DEF_TPL };
  $('save').textContent = d ? '☁️ Loaded' : '';
  render();
}

function render() {
  $('org').value = S.organizer; $('tpl').value = S.template;
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
  update();
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
    update(false);
  });
}
function update(redraw = true) {
  if (redraw) matrix();
  const c = Santa.check(S.people, S.ex);
  $('status').className = 'st ' + (c.ok ? 'ok' : 'bad');
  $('status').textContent = c.ok ? '✅ Works! Everyone can get a match.' : '❌ ' + c.why;
  const first = S.people[0], second = S.people[1];
  $('prev').textContent = '👀 ' + Santa.fill(S.template, { organizer: S.organizer || 'You', giver: (first && first.name) || 'Ana', receiver: (second && second.name) || '🤫 (secret)' });
  const noPhone = S.people.filter(p => !(p.phone || '').trim());
  $('go').disabled = !c.ok || !!noPhone.length;
  $('goWhy').textContent = !c.ok ? '❌ Fix the ❌ above first.' : noPhone.length ? `📱 Missing phone: ${noPhone.map(p => p.name || '?').join(', ')}` : '';
  save();
}
const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

$('org').oninput = e => { S.organizer = e.target.value; update(false); };
$('tpl').oninput = e => { S.template = e.target.value; update(false); };
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = $('tpl'), i = t.selectionStart ?? t.value.length; t.value = t.value.slice(0, i) + b.dataset.t + t.value.slice(i); S.template = t.value; update(false); t.focus(); });
$('add').onclick = () => { S.people.push({ id: uid(), name: '', phone: '' }); render(); const ins = $('people').querySelectorAll('.row'); ins[ins.length - 1].children[0].focus(); };
// ===== START SCREEN =====
function showApp(on) { $('start').hidden = on; $('app').hidden = !on; }
async function showStart() {
  endDemo(); clearTimeout(saveT);
  gid = ''; history.replaceState(null, '', location.pathname);
  S = { organizer: '', people: [], ex: {}, template: DEF_TPL }; $('send').innerHTML = ''; $('save').textContent = '';
  showApp(false); $('newOrg').value = '';
  const list = $('orgList'); list.innerHTML = '<div class="note">⏳</div>';
  let all = {};
  if (FIREBASE_DB_URL) try { all = (await (await fetch(`${FIREBASE_DB_URL}/secretSanta.json`)).json()) || {}; } catch {}
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('ss_') && !all[k.slice(3)]) try { all[k.slice(3)] = JSON.parse(localStorage.getItem(k)); } catch {} }
  const groups = Object.entries(all).filter(([id, d]) => id !== '_probe' && d && (d.organizer || '').trim()).sort((x, y) => (y[1].updated || 0) - (x[1].updated || 0));
  list.innerHTML = '';
  groups.forEach(([id, d]) => {
    const b = document.createElement('button'); b.className = 's';
    b.textContent = `🎅 ${d.organizer} · 👥 ${(d.people || []).length}`;
    b.onclick = () => { gid = id; history.replaceState(null, '', '#' + id); showApp(true); load(); };
    list.appendChild(b);
  });
}
function startNew() {
  const n = $('newOrg').value.trim(); if (!n) return $('newOrg').focus();
  gid = ''; S = { organizer: n, people: [], ex: {}, template: DEF_TPL };
  showApp(true); render();
}
$('newOrgGo').onclick = startNew;
$('newOrg').onkeydown = e => { if (e.key === 'Enter') startNew(); };
$('newBtn').onclick = showStart;

$('go').onclick = async () => {
  if (!confirm('🎅 Do you really want to text everyone?')) return;
  const P = S.people, d = Santa.draw(P, S.ex);
  if (!d) return alert('❌ No match possible.');
  // Pairings live only in these message bodies. Never shown, logged, or saved.
  const msgs = P.map((g, i) => ({ name: g.name, to: g.phone.trim(), body: Santa.fill(S.template, { organizer: S.organizer, giver: g.name, receiver: P[d[i]].name }) }));
  const box = $('send'); box.innerHTML = '';
  if (demo) { box.innerHTML = '<div class="st ok">▶️ Demo: texts would go out now. 🤫 You never see who got who.</div>'; return; }
  if (SMS_ENDPOINT) {
    let ok = 0;
    for (const m of msgs) try { if ((await fetch(SMS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: m.to, body: m.body }) })).ok) ok++; } catch {}
    box.innerHTML = `<div class="st ${ok === msgs.length ? 'ok' : 'bad'}">📨 Sent ${ok}/${msgs.length}</div>`;
    return;
  }
  box.innerHTML = '<div class="note">Tap each one, then hit send in Messages. 🤫 Don\'t read the text! (It is visible in your Messages app.)</div>';
  msgs.forEach(m => {
    const a = document.createElement('a');
    a.href = `sms:${m.to.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(m.body)}`;
    a.textContent = `📱 Send to ${m.name} (${m.to})`;
    a.onclick = () => setTimeout(() => { a.classList.add('done'); a.textContent = '✅ ' + a.textContent.slice(2); }, 300);
    box.appendChild(a);
  });
};

// ===== DEMO =====
let step = 0, saved;
const D = [
  ['👋 Demo! This is a family of 4.', () => {
    const ids = ['a', 'b', 'c', 'd'];
    S = { organizer: 'Chumi', template: DEF_TPL, ex: {}, people: ['Ana', 'Ben', 'Cal', 'Dee'].map((n, i) => ({ id: ids[i], name: n, phone: '555-010' + i })) };
  }],
  ['🚫 Ana and Ben are a couple, so they can\'t give to each other.', () => { S.ex = { a: ['b'], b: ['a'] }; }],
  ['❌ Oops: Ana also can\'t give to Cal or Dee. Now Ana has nobody! See the red box.', () => { S.ex = { a: ['b', 'c', 'd'], b: ['a'] }; }],
  ['❌ Harder one: Ana and Ben can only give to Cal. 2 people, 1 gift spot.', () => { S.ex = { a: ['b', 'd'], b: ['a', 'd'] }; }],
  ['✅ Fixed: Ben can give to Dee again. Green = it works!', () => { S.ex = { a: ['b', 'd'], b: ['a'] }; }],
  ['🎁 Edit the text, then tap Generate. You never see who got who. Try it!', () => {}],
];
function showStep() { D[step][1](); $('demoTxt').textContent = `${step + 1}/${D.length} ${D[step][0]}`; $('demoNext').style.display = step < D.length - 1 ? '' : 'none'; render(); }
let wasStart = false;
$('demoBtn2').onclick = () => { wasStart = true; showApp(true); startDemo(); };
$('demoBtn').onclick = () => { wasStart = false; startDemo(); };
function startDemo() { if (!demo) saved = JSON.stringify(S); demo = true; step = 0; $('demo').style.display = 'block'; $('send').innerHTML = ''; showStep(); }
$('demoNext').onclick = () => { step++; showStep(); };
function endDemo() { if (!demo) return; demo = false; $('demo').style.display = 'none'; S = JSON.parse(saved); $('send').innerHTML = ''; $('save').textContent = ''; if (wasStart) { wasStart = false; showApp(false); } else render(); }
$('demoEnd').onclick = endDemo;

if (gid) { showApp(true); load(); } else showStart();
