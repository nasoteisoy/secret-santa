const S = require('./santa.js'); const a = require('assert');
const P = ['A','B','C','D'].map(x => ({ id: x, name: x }));
a.ok(S.check(P, {}).ok);
a.match(S.check(P, { A: ['B','C','D'] }).why, /A has nobody/);
a.match(S.check(P, { A: ['D'], B: ['D'], C: ['D'] }).why, /Nobody can give to D/);
const h = S.check(P, { A: ['B','D'], B: ['A','D'] }); 
a.ok(!h.ok && /These/.test(h.why), h.why);
a.ok(!S.check(P.slice(0,1), {}).ok);
for (let i = 0; i < 300; i++) { const ex = { A: ['B'] }; const d = S.draw(P, ex);
  a.deepStrictEqual([...d].sort(), [0,1,2,3]); d.forEach((r, g) => { a.notStrictEqual(r, g); }); a.notStrictEqual(d[0], 1); }
a.strictEqual(S.draw(P, { A: ['B','C','D'] }), null);
a.strictEqual(S.fill('Hi {giver}! {organizer}: {receiver}', { giver: 'x', organizer: 'y', receiver: 'z' }), 'Hi x! y: z');
console.log('tests ok');
