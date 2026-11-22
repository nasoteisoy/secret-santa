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

const Sms = require('./sms.js');
a.strictEqual(Sms.digits10('555-123-4567'), '5551234567');
a.strictEqual(Sms.digits10('+15551234567'), '5551234567');
a.strictEqual(Sms.digits10('15551234567'), '5551234567');
a.strictEqual(Sms.digits10('555123456'), null);
a.strictEqual(Sms.gatewayAddress('555-123-4567', 'tmobile'), '5551234567@tmomail.net');
a.strictEqual(Sms.gatewayAddress('+1 (555) 123-4567', 'verizon'), '5551234567@vtext.com');
a.strictEqual(Sms.gatewayAddress('15551234567', 'mint'), '5551234567@tmomail.net');
a.strictEqual(Sms.gatewayAddress('5551234567', 'metro'), '5551234567@mymetropcs.com');
a.strictEqual(Sms.gatewayAddress('5551234567', 'fi'), '5551234567@msg.fi.google.com');
a.strictEqual(Sms.gatewayAddress('5551234567', 'cricket'), '5551234567@sms.cricketwireless.net');
a.strictEqual(Sms.gatewayAddress('5551234567', 'uscc'), '5551234567@email.uscc.net');
a.strictEqual(Sms.gatewayAddress('5551234567', 'att'), null);
a.strictEqual(Sms.gatewayAddress('5551234567', ''), null);
a.deepStrictEqual(Sms.emailTarget({ phone: '5551234567', carrier: '' }), { ok: false, why: 'pick a carrier' });
a.deepStrictEqual(Sms.emailTarget({ phone: '5551234567' }), { ok: false, why: 'pick a carrier' });
a.deepStrictEqual(Sms.emailTarget({ phone: '5551234567', carrier: 'att' }), { ok: false, why: 'pick a carrier' });
a.deepStrictEqual(Sms.emailTarget({ phone: '5551234567', carrier: 'tmobile' }), { ok: true, to: '5551234567@tmomail.net' });
a.deepStrictEqual(Sms.emailTarget({ phone: '123', carrier: 'verizon' }), { ok: false, why: 'bad phone number' });
a.ok(!Sms.stripEmoji('Hi Ana! 🎅 You set up Secret Santa. You are giving to Bob 🎁').includes('🎅'));
a.strictEqual(Sms.stripEmoji('Hi Ana! 🎅 You set up Secret Santa. You are giving to Bob 🎁'), 'Hi Ana! You set up Secret Santa. You are giving to Bob');
a.strictEqual(S.fill('From {organizer} to {giver}', { organizer: 'You', giver: 'Ana', receiver: 'Bob' }), 'From You to Ana');
a.strictEqual(Sms.stripEmoji(S.fill('🎅 Secret Santa for {receiver}', { giver: 'Ana', organizer: 'You', receiver: 'Bob' })).slice(0, 100), 'Secret Santa for Bob');

a.ok(Sms.isEmail('alex@example.com'));
a.ok(Sms.isEmail('fr.alex@example.com'));
a.ok(!Sms.isEmail('not-an-email'));
a.ok(!Sms.isEmail('bad@'));
a.ok(!Sms.isEmail('a@b'));
a.deepStrictEqual(Sms.emailTarget({ phone: 'alex@example.com' }), { ok: true, to: 'alex@example.com' });
a.deepStrictEqual(Sms.emailTarget({ phone: '  Alex.Rivera@example.com  ', carrier: 'tmobile' }), { ok: true, to: 'Alex.Rivera@example.com' });
a.deepStrictEqual(Sms.emailTarget({ to: 'sam@example.com' }), { ok: true, to: 'sam@example.com' });
a.deepStrictEqual(Sms.emailTarget({ phone: 'bad@', carrier: 'tmobile' }), { ok: false, why: 'bad email' });

a.strictEqual(S.fill("{organizer}'s Secret Santa for {giver}", { organizer: 'Alex', giver: 'Ana', receiver: 'Bob' }), "Alex's Secret Santa for Ana");
a.strictEqual(S.fill('Hi {giver}, {organizer} set up our Secret Santa this year. You are giving a gift to {receiver}. Please keep it a secret. Merry Christmas, {organizer}', { organizer: 'Alex', giver: 'Ana', receiver: 'Bob' }), 'Hi Ana, Alex set up our Secret Santa this year. You are giving a gift to Bob. Please keep it a secret. Merry Christmas, Alex');

// Brand-new group path: defaults, mix of email + phone, exclusions, draw, fill, targets
const newbie = [
  { id: '1', name: 'Alex', phone: 'alex@example.com', carrier: '' },
  { id: '2', name: 'Sam', phone: 'sam@example.com' },
  { id: '3', name: 'Riley', phone: '5551234567', carrier: 'tmobile' }
];
a.ok(S.check(newbie, {}).ok);
const nd = S.draw(newbie, { '1': ['2'] });
a.ok(nd && nd[0] !== 1);
const nv = { organizer: 'Alex', giver: newbie[0].name, receiver: newbie[nd[0]].name };
a.strictEqual(S.fill("{organizer}'s Secret Santa for {giver}", nv), "Alex's Secret Santa for Alex");
a.match(S.fill('Hi {giver}, {organizer} set up our Secret Santa this year. You are giving a gift to {receiver}. Please keep it a secret. Merry Christmas, {organizer}', nv), /set up our Secret Santa this year/);
a.deepStrictEqual(Sms.emailTarget(newbie[0]), { ok: true, to: 'alex@example.com' });
a.deepStrictEqual(Sms.emailTarget(newbie[2]), { ok: true, to: '5551234567@tmomail.net' });
console.log('tests ok');
