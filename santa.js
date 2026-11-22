// Pure Secret Santa logic (browser + node). No pairings are ever logged.
(function (root) {
  // people: [{id,name}], ex: {giverId: [receiverIds it CANNOT give to]}
  function allowed(people, ex) {
    return people.map(g => people.map((r, j) => j).filter(j => {
      const r = people[j];
      return r.id !== g.id && !((ex[g.id] || []).includes(r.id));
    }));
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }
  // Kuhn's bipartite matching. Returns matchR[receiver]=giver (or -1).
  function maxMatch(adj, n, rand) {
    const matchR = new Array(n).fill(-1);
    const A = rand ? adj.map(shuffle) : adj;
    const order = rand ? shuffle([...Array(n).keys()]) : [...Array(n).keys()];
    function tryG(g, seen) {
      for (const r of A[g]) {
        if (seen[r]) continue; seen[r] = 1;
        if (matchR[r] < 0 || tryG(matchR[r], seen)) { matchR[r] = g; return true; }
      }
      return false;
    }
    let size = 0;
    for (const g of order) if (tryG(g, new Array(n).fill(0))) size++;
    return { matchR, size };
  }
  // Returns {ok:true} or {ok:false, why:"plain words"}
  function check(people, ex) {
    const n = people.length, nm = i => people[i].name || ('#' + (i + 1));
    if (n < 2) return { ok: false, why: 'Add at least 2 people.' };
    const adj = allowed(people, ex);
    for (let g = 0; g < n; g++) if (!adj[g].length) return { ok: false, why: `${nm(g)} has nobody left to give to.` };
    for (let r = 0; r < n; r++) if (!adj.some(l => l.includes(r))) return { ok: false, why: `Nobody can give to ${nm(r)}.` };
    const { matchR, size } = maxMatch(adj, n, false);
    if (size === n) return { ok: true };
    // Hall violator: alternating BFS from an unmatched giver
    const matchG = new Array(n).fill(-1); matchR.forEach((g, r) => { if (g >= 0) matchG[g] = r; });
    const start = matchG.findIndex(x => x < 0);
    const S = new Set([start]), T = new Set(), q = [start];
    while (q.length) { const g = q.shift(); for (const r of adj[g]) if (!T.has(r)) { T.add(r); const g2 = matchR[r]; if (g2 >= 0 && !S.has(g2)) { S.add(g2); q.push(g2); } } }
    const s = [...S].map(nm), t = [...T].map(nm);
    return { ok: false, why: `These ${s.length} people (${s.join(', ')}) can only give to ${t.length === 1 ? 'this 1 person' : 'these ' + t.length + ' people'} (${t.join(', ')}). Not enough to go around.` };
  }
  // Random valid assignment: returns array giverIndex -> receiverIndex, or null.
  function draw(people, ex) {
    const n = people.length, adj = allowed(people, ex);
    const { matchR, size } = maxMatch(adj, n, true);
    if (size !== n) return null;
    const out = new Array(n); matchR.forEach((g, r) => { out[g] = r; });
    return out;
  }
  function fill(tpl, v) { return tpl.replace(/\{(organizer|giver|receiver)\}/g, (_, k) => v[k] || ''); }
  const api = { allowed, check, draw, fill };
  if (typeof module !== 'undefined') module.exports = api; else root.Santa = api;
})(this);
