const { chromium } = require('playwright');
const ok = [], bad = [];
const T = (name, cond, extra='') => (cond ? ok : bad).push(name + (extra ? ' :: ' + extra : ''));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await page.goto('http://127.0.0.1:8899/index.html');
  await page.click('#bStart'); await page.waitForTimeout(400);

  // ---------- 1. bond tiers ----------
  const tiers = await page.evaluate(() => {
    const mk = (sp, va, seed) => ({ sp, va, ra:'common', mu:null, seed });
    const t = (a, c) => { const r = PP.bondBetween(a, c); return r ? r.id : null; };
    return {
      kin:     t(mk('moon','dawn',1),  mk('moon','ink',2)),          // same species
      // find a same-tint pair whose hues are far enough apart to rule out echo
      // but not far enough to be counterpoint — that band is Tone's alone
      tone: (() => {
        for (const a of PP.SPECIES) for (const c of PP.SPECIES){
          if (a.id === c.id) continue;
          const ga = { sp:a.id, va:'frost', ra:'common', mu:null, seed:31 };
          const gc = { sp:c.id, va:'frost', ra:'common', mu:null, seed:32 };
          const gap = Math.abs(((PP.phenotype(ga).hue - PP.phenotype(gc).hue) % 360 + 540) % 360 - 180);
          if (gap > 60 && gap < 140) return t(ga, gc);
        }
        return 'no-such-pair';
      })(),
      echo:    t(mk('moon','dawn',5),  mk('night','dawn',6)),        // neighbouring hues, untinted
      dawnNotTone: t(mk('sun','dawn',20), mk('velvet','dawn',21)),   // must NOT be a tone bond
      counter: t(mk('sun','dawn',7),   mk('moon','dawn',8)),         // ochre vs blue
      none:    t(mk('sun','dawn',9),   mk('ribbon','moss',10)),
    };
  });
  T('kin bond', tiers.kin === 'kin', JSON.stringify(tiers.kin));
  T('tone bond', tiers.tone === 'tone', JSON.stringify(tiers.tone));
  T('echo bond', tiers.echo === 'echo', JSON.stringify(tiers.echo));
  T('counterpoint bond', tiers.counter === 'counter', JSON.stringify(tiers.counter));
  T('untinted pair is not a tone bond', tiers.dawnNotTone !== 'tone', JSON.stringify(tiers.dawnNotTone));

  // ---------- 2. tiers pay differently, shelf accord + full sill stack ----------
  const scoring = await page.evaluate(() => {
    const mk = (sp, va, seed) => ({ sp, va, ra:'common', mu:null, seed });
    const set = a => { PP.S.sill = a.map(x => x && PP.newFlower(x)); return PP.harmony(); };
    const blank = new Array(9).fill(null);
    const echo = set([mk('moon','dawn',1), mk('night','dawn',2), ...blank.slice(2)]);
    const kin  = set([mk('moon','dawn',1), mk('moon','ink',2),   ...blank.slice(2)]);
    const shelf= set([mk('moon','dawn',1), mk('moon','ink',2), mk('moon','moss',3), ...blank.slice(3)]);
    const full = set(Array.from({length:9}, (_,i) => mk('moon','dawn', i+1)));
    return { echo: echo.mult, kin: kin.mult, shelfN: shelf.shelves, shelf: shelf.mult,
             full: full.full, fullMult: full.mult, cap: PP.CFG.harmonyCap,
             fullBonds: full.bonds.length };
  });
  T('kin pays more than echo', scoring.kin > scoring.echo, `kin ${scoring.kin} vs echo ${scoring.echo}`);
  T('shelf accord detected', scoring.shelfN === 1, 'shelves=' + scoring.shelfN);
  T('full sill detected', scoring.full === true);
  T('full 3x3 has 12 bonds', scoring.fullBonds === 12, 'bonds=' + scoring.fullBonds);
  T('multiplier respects cap', scoring.fullMult <= scoring.cap + 1e-9, `${scoring.fullMult} <= ${scoring.cap}`);

  // ---------- 3. drag to rearrange ----------
  await page.evaluate(() => {
    const mk = (sp, va, seed) => ({ sp, va, ra:'common', mu:null, seed });
    PP.S.sill = new Array(9).fill(null);
    PP.S.sill[0] = PP.newFlower(mk('moon','dawn',11));     // slot 0
    PP.S.sill[4] = PP.newFlower(mk('moon','ink',12));      // slot 4, not adjacent to 0
    PP.V.placing = false;
  });
  await page.click('#tabs button[data-s="shelf"]'); await page.waitForTimeout(350);
  const before = await page.evaluate(() => ({ b: PP.harmony().bonds.length,
                                              s: PP.S.sill.map(x => x ? x.g.seed : null) }));
  const pts = await page.evaluate(() => {
    const g = PP.shelfGeom();
    return { from: g.slot(4), to: g.slot(1) };     // drag centre up to slot 1, beside slot 0
  });
  await page.mouse.move(pts.from.x, pts.from.y - 2);
  await page.mouse.down();
  for (let i=1;i<=14;i++)
    await page.mouse.move(pts.from.x + (pts.to.x-pts.from.x)*i/14,
                          (pts.from.y-2) + (pts.to.y-(pts.from.y-2))*i/14);
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({ b: PP.harmony().bonds.length,
                                             s: PP.S.sill.map(x => x ? x.g.seed : null),
                                             m: PP.harmony().mult }));
  T('drag moved the flower', after.s[1] === 12 && after.s[4] === null,
    JSON.stringify(before.s) + ' -> ' + JSON.stringify(after.s));
  T('drag created a bond', before.b === 0 && after.b === 1, `${before.b} -> ${after.b}`);
  T('drag raised the multiplier', after.m > 1, 'mult=' + after.m);

  // a tap must inspect, not drag
  await page.mouse.click(pts.to.x, pts.to.y - 2);
  await page.waitForTimeout(200);
  const tapped = await page.evaluate(() => ({ s: PP.S.sill.map(x => x ? x.g.seed : null),
                                              toast: document.getElementById('toast').textContent }));
  T('tap inspects rather than moves', tapped.s[1] === 12, JSON.stringify(tapped.s));
  T('tap names the bond', /Kin/.test(tapped.toast), JSON.stringify(tapped.toast));

  // ---------- 4. ledge ----------
  const ledge = await page.evaluate(async () => {
    PP.V.decor = PP.DECOR[0]; PP.V.placing = 'decor';
    const g = PP.ledgeGeom(), s = g.slot(1);
    return { hit: PP.ledgeAt({x:s.x, y:s.y - 6}), x:s.x, y:s.y - 6 };
  });
  T('ledge hit-testing works', ledge.hit === 1, 'got ' + ledge.hit);
  await page.mouse.click(ledge.x, ledge.y);
  await page.waitForTimeout(250);
  const placed = await page.evaluate(() => ({ decor: PP.S.decor, mult: PP.harmony().mult,
                                              on: PP.harmony().decorOn }));
  T('ornament placed on ledge', placed.decor[1] === 'bell', JSON.stringify(placed.decor));
  T('ledge feeds the multiplier', placed.on === 1);

  // ---------- 4b. the ornament sheet routes to the ledge, not the sill ----------
  await page.evaluate(() => { PP.S.decor = [null,null,null]; PP.V.mode = 'bloom';
                              PP.V.genome = null; PP.V.story = null;
                              PP.V.decor = PP.DECOR[3]; PP.V.decorNew = true; PP.showSheet(); });
  await page.waitForTimeout(450);
  const sheet = await page.evaluate(() => ({
    rar: document.getElementById('shRar').textContent,
    name: document.getElementById('shName').textContent,
    sill: document.getElementById('bSill').textContent,
    shown: getComputedStyle(document.getElementById('bSill')).display !== 'none',
  }));
  T('ornament sheet labelled', sheet.rar === 'ORNAMENT' && /spiral shell/i.test(sheet.name), JSON.stringify(sheet));
  T('ornament sheet offers the ledge', sheet.shown && sheet.sill === 'Set on the ledge', JSON.stringify(sheet.sill));
  await page.click('#bSill'); await page.waitForTimeout(450);
  const mode = await page.evaluate(() => PP.V.placing);
  T('ornament enters ledge-placing mode', mode === 'decor', String(mode));
  const lp2 = await page.evaluate(() => { const s = PP.ledgeGeom().slot(2); return {x:s.x, y:s.y-6}; });
  await page.mouse.click(lp2.x, lp2.y); await page.waitForTimeout(300);
  const done = await page.evaluate(() => ({ d: PP.S.decor, p: PP.V.placing }));
  T('ornament lands on the ledge from the sheet', done.d[2] === 'shell' && !done.p, JSON.stringify(done));

  // a story sheet must offer no placement at all
  await page.evaluate(() => { PP.V.mode='bloom'; PP.V.decor=null; PP.V.genome=null;
                              PP.V.story = PP.STORY[0]; PP.showSheet(); });
  await page.waitForTimeout(400);
  const ss = await page.evaluate(() => ({
    rar: document.getElementById('shRar').textContent,
    shown: getComputedStyle(document.getElementById('bSill')).display !== 'none',
    keep: document.getElementById('bBook').textContent,
    poem: document.getElementById('shPoem').textContent }));
  T('letter sheet labelled', ss.rar === 'FROM THE SENDER', ss.rar);
  T('letter offers no placement', ss.shown === false);
  T('letter shows its line', /No note\. No door\./.test(ss.poem), JSON.stringify(ss.poem));
  await page.click('#bBook'); await page.waitForTimeout(300);

  // ---------- 4c. a gesture driven EXACTLY to its end must complete ----------
  // Accumulated progress lands on 0.9999999999; a player who drags the tape to
  // its end and no further would otherwise be stuck forever.
  {
    const pg = await b.newPage({ viewport: { width: 420, height: 860 } });
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('http://127.0.0.1:8899/index.html');
    await pg.click('#bStart'); await pg.waitForTimeout(400);
    let peeled = null;
    for (let n = 0; n < 40 && !peeled; n++){
      const st = await pg.evaluate(() => {
        PP.S.mail = 5;
        if (PP.V.mode !== 'unwrap') PP.openParcel();
        const L = PP.V.layers.find(l => l.kind === 'peel');
        return L ? { a: L.a, b: L.b, first: PP.V.layers[0].kind } : null;
      });
      if (st && st.first === 'peel') peeled = st;
      else await pg.evaluate(() => { PP.V.layers.forEach(l => l.p = 1); PP.V.mode = 'idle'; });
      await pg.waitForTimeout(60);
    }
    if (!peeled) { T('found a peel parcel to test', false); }
    else {
      await pg.mouse.move(peeled.a.x, peeled.a.y);
      await pg.mouse.down();
      for (let i = 1; i <= 30; i++)                    // lands exactly on b, never past it
        await pg.mouse.move(peeled.a.x + (peeled.b.x - peeled.a.x)*i/30,
                            peeled.a.y + (peeled.b.y - peeled.a.y)*i/30);
      await pg.mouse.up();
      await pg.waitForTimeout(150);
      const r = await pg.evaluate(() => {
        const L = PP.V.layers.find(l => l.kind === 'peel');
        return { p: L.p, done: L.p >= 1, active: PP.V.layers.findIndex(l => l.p < 0.999) };
      });
      T('an exact drag to the end completes the layer', r.done, 'p = ' + r.p);
      T('and the next layer becomes active', r.active !== 0, 'active index ' + r.active);
    }
    await pg.close();
  }

  // ---------- 4d. the life of a flower ----------
  {
    const pg = await b.newPage({ viewport: { width: 420, height: 860 } });
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('http://127.0.0.1:8899/index.html');
    await pg.click('#bStart'); await pg.waitForTimeout(400);

    // life is spent by opening parcels, never by the clock
    const life = await pg.evaluate(() => {
      const r = PP.mulberry32(5);
      PP.S.sill = new Array(9).fill(null);
      PP.S.sill[0] = PP.newFlower({sp:'moon', va:'dawn', ra:'common', mu:null, seed:1});
      const start = PP.S.sill[0].life;
      const never = () => 1;                     // an rng that never rolls under illChance
      for (let i = 0; i < 5; i++) PP.ageSill(never);
      const after = PP.S.sill[0].life;
      PP.resolveSill();                          // wall clock alone must do nothing
      return { start, after, stillThere: !!PP.S.sill[0], st: PP.S.sill[0] && PP.S.sill[0].st };
    });
    T('life is spent in parcels', life.after === life.start - 5, `${life.start} -> ${life.after}`);
    T('the clock alone does not age a healthy flower', life.stillThere && life.st === 'ok');

    // at the end of its life it wilts, and after the window is pressed into the book
    const spent = await pg.evaluate(() => {
      PP.S.book = {}; PP.S.sill = new Array(9).fill(null);
      const f = PP.newFlower({sp:'sun', va:'dawn', ra:'common', mu:null, seed:2});
      f.life = 1; PP.S.sill[0] = f;
      PP.ageSill(() => 1);
      const wilted = f.st;
      f.t0 = Date.now() - (PP.CFG.wiltHours*3600e3 + 1000);
      const out = PP.resolveSill();
      return { wilted, out, slot: PP.S.sill[0], inBook: !!PP.S.book['sun'] };
    });
    T('a flower at the end of its life wilts', spent.wilted === 'wilt', spent.wilted);
    T('a spent flower is pressed into the book', spent.inBook && spent.out.pressed === 1,
      JSON.stringify(spent.out));
    T('and frees its pot', spent.slot === null);

    // illness ends differently: the flower is lost and does NOT reach the book
    const died = await pg.evaluate(() => {
      PP.S.book = {}; PP.S.sill = new Array(9).fill(null);
      const f = PP.newFlower({sp:'velvet', va:'dawn', ra:'common', mu:null, seed:3});
      f.st = 'ill'; f.t0 = Date.now() - (PP.CFG.illHours*3600e3 + 1000);
      PP.S.sill[0] = f;
      const out = PP.resolveSill();
      return { out, slot: PP.S.sill[0], inBook: !!PP.S.book['velvet'] };
    });
    T('an untreated illness is lost', died.out.lost === 1 && died.slot === null, JSON.stringify(died.out));
    T('and does NOT reach the book', died.inBook === false);

    // a tonic cures illness, costs one, and cannot be spent from an empty shelf
    const cure = await pg.evaluate(() => {
      PP.S.sill = new Array(9).fill(null);
      const f = PP.newFlower({sp:'fog', va:'dawn', ra:'common', mu:null, seed:4});
      f.st = 'ill'; f.t0 = Date.now(); f.life = 2; PP.S.sill[0] = f;
      PP.S.tonics = 1;
      const ok = PP.useTonic(0);
      const afterSt = f.st, afterLife = f.life, left = PP.S.tonics;
      f.st = 'ill'; f.t0 = Date.now();
      const second = PP.useTonic(0);            // none left
      return { ok, afterSt, afterLife, left, second };
    });
    T('a tonic cures illness', cure.ok && cure.afterSt === 'ok', JSON.stringify(cure));
    T('a tonic restores life',  cure.afterLife >= Math.round(25*0.8), 'life ' + cure.afterLife);
    T('a tonic is consumed', cure.left === 0);
    T('a tonic cannot be spent when you have none', cure.second === false);

    // a fading flower is worth less to the arrangement than a healthy one
    const weight = await pg.evaluate(() => {
      const mk = s => PP.newFlower({sp:'moon', va:'dawn', ra:'common', mu:null, seed:s});
      PP.S.sill = new Array(9).fill(null); PP.S.decor = [null,null,null];
      PP.S.sill[0] = mk(7); PP.S.sill[1] = mk(8);
      const healthy = PP.harmony().mult;
      PP.S.sill[1].st = 'wilt';
      PP.S.sill[1].t0 = Date.now() - PP.CFG.wiltHours*3600e3*0.9;   // nearly gone
      const faded = PP.harmony().mult;
      return { healthy, faded, vig: PP.vigour(PP.S.sill[1]) };
    });
    T('a fading flower weakens its bond', weight.faded < weight.healthy,
      `${weight.healthy.toFixed(3)} -> ${weight.faded.toFixed(3)} (vigour ${weight.vig.toFixed(2)})`);
    T('but never to nothing', weight.faded > 1, weight.faded.toFixed(3));
    await pg.close();
  }

  // ---------- 5. story pacing ----------
  const story = await page.evaluate(() => {
    PP.S.story = []; PP.S.opened = 0;
    const a = PP.storyDue();
    PP.S.opened = PP.CFG.storyAt[0];
    const b = PP.storyDue();
    PP.S.story = [PP.STORY[0].id];
    const c = PP.storyDue();                     // not yet due for the second
    PP.S.opened = PP.CFG.storyAt[1];
    const d = PP.storyDue();
    PP.S.story = PP.STORY.map(x => x.id);
    PP.S.opened = 999;
    const e = PP.storyDue();                     // all told
    return { a: a&&a.id, b: b&&b.id, c: c&&c.id, d: d&&d.id, e: e&&e.id };
  });
  T('no letter before its threshold', story.a === null || story.a === undefined, JSON.stringify(story.a));
  T('letter arrives on threshold', story.b === 'key', JSON.stringify(story.b));
  T('letters are sequential', story.c === null || story.c === undefined, JSON.stringify(story.c));
  T('second letter at second threshold', story.d === 'ticket', JSON.stringify(story.d));
  T('thread ends cleanly', story.e === null || story.e === undefined, JSON.stringify(story.e));

  // ---------- 6. v1 save migration ----------
  const mig = await page.evaluate(async () => {
    window.requestAnimationFrame = () => 0;      // freeze the loop
    await new Promise(r => setTimeout(r, 120));
    localStorage.setItem('parcel-petal-v1', JSON.stringify({
      v:1, mail:2, lastAccrual:Date.now(), pity:0, opened:9,
      sill:new Array(9).fill(null), book:{}, odd:{ key:1, frog:2 },
      streak:3, lastDay:new Date().toISOString().slice(0,10), special:'', seen:true }));
    // The game saves on visibilitychange, which reload() fires — correct behaviour,
    // but it would clobber the fixture before the reload reads it.
    Storage.prototype.setItem = () => {};
    return true;
  });
  await page.reload(); await page.waitForTimeout(500);
  const migrated = await page.evaluate(() => ({ v: PP.S.v, story: PP.S.story,
                                                decor: PP.S.decor, streak: PP.S.streak,
                                                odd: PP.S.odd }));
  T('v1 save migrates to the current version', migrated.v === 4, 'v=' + migrated.v);
  T('old oddments become letters, in order', JSON.stringify(migrated.story) === '["key","frog"]',
    JSON.stringify(migrated.story));
  T('ledge initialised on migration', Array.isArray(migrated.decor) && migrated.decor.length === 3);
  T('unrelated save fields survive', migrated.streak === 3, 'streak=' + migrated.streak);

  // ---------- 7. the page actually ends on screen, at every size ----------
  for (const vp of [[360,640],[390,844],[430,932],[520,1180]]){
    const pg = await b.newPage({ viewport: { width: vp[0], height: vp[1] } });
    pg.on('pageerror', e => errs.push('[' + vp.join('x') + '] ' + e.message));
    await pg.goto('http://127.0.0.1:8899/index.html');
    await pg.click('#bStart'); await pg.waitForTimeout(300);
    await pg.evaluate(() => {
      const r = PP.mulberry32(5);
      PP.SPECIES.forEach(sp => { const g = PP.makeGenome(r,{sp:sp.id});
        PP.S.book[sp.id] = {g, v:{[g.va]:1}, mu:{}, n:2}; });
      PP.DECOR.forEach(d => PP.S.decorFound[d.id] = 1);
      PP.S.story = PP.STORY.map(x => x.id);
    });
    await pg.click('#tabs button[data-s="book"]'); await pg.waitForTimeout(350);

    // wheel must scroll — drag alone left the foot of the page unreachable
    const w0 = await pg.evaluate(() => PP.V.bookScroll);
    await pg.mouse.move(vp[0]/2, vp[1]/2);
    await pg.mouse.wheel(0, 500);
    await pg.waitForTimeout(200);
    const w1 = await pg.evaluate(() => PP.V.bookScroll);
    T(`wheel scrolls the book @${vp.join('x')}`, w1 > w0, `${w0} -> ${w1}`);

    const fit = await pg.evaluate(() => {
      PP.V.bookScroll = 1e6;
      const L = PP.bookLayout();
      const sc = Math.min(1e6, L.maxScroll);
      const bottom = L.top + L.total - sc;          // screen y of the last pixel of content
      return { bottom, H: window.innerHeight, maxScroll: L.maxScroll };
    });
    // the hint sits ~76px up and the tab bar below it; content must clear both
    T(`page bottom is reachable @${vp.join('x')}`, fit.bottom <= fit.H - 86,
      `content ends at ${fit.bottom.toFixed(0)}, needs <= ${(fit.H-86).toFixed(0)}`);

    // and the top of the page is never scrolled past
    await pg.evaluate(() => { PP.V.bookScroll = -500; });
    await pg.waitForTimeout(120);
    const clamped = await pg.evaluate(() => { PP.bookLayout(); return PP.V.bookScroll; });
    T(`scroll clamps at the top @${vp.join('x')}`, clamped >= -1e-6, String(clamped));
    await pg.close();
  }

  // ---------- 8. the pills explain themselves ----------
  {
    const pg = await b.newPage({ viewport: { width: 420, height: 860 } });
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('http://127.0.0.1:8899/index.html');
    await pg.click('#bStart'); await pg.waitForTimeout(300);
    for (const [sel, re, label] of [['#pMail', /parcel|table/i, 'mail'],
                                    ['#pHarm', /arrive/i, 'harmony'],
                                    ['#pStreak', /row/i, 'streak']]){
      await pg.evaluate(() => { document.getElementById('toast').textContent = ''; });
      await pg.click(sel); await pg.waitForTimeout(250);
      const t = await pg.evaluate(() => document.getElementById('toast').textContent);
      T(`${label} pill explains itself`, re.test(t), JSON.stringify(t.slice(0,60)));
    }
    // and no flower name repeats a word
    const bad2 = await pg.evaluate(() => {
      const out = [];
      for (const sp of PP.SPECIES) for (const v of PP.VARIANTS){
        const n = PP.flowerName({sp:sp.id, va:v.id, ra:'common', mu:null, seed:1});
        const w = n.split(' ');
        if (new Set(w.map(x => x.toLowerCase())).size !== w.length) out.push(n);
      }
      return out;
    });
    T('no flower name repeats a word', bad2.length === 0, JSON.stringify(bad2));
    await pg.close();
  }


  // ---------- 12. petals: duplicates pay, losses do not ----------
  const petals = await page.evaluate(() => {
    const g = { sp:'moon', va:'dawn', ra:'common', mu:null, seed:7 };
    PP.S.book = {}; PP.S.petals = 0;
    const first = PP.recordFlower(g);                 // new species
    const again = PP.recordFlower(g);                 // duplicate
    const hue   = PP.recordFlower({ ...g, va:'ink' });// new colourway of a known species
    const rates = PP.CFG.petal.dup;
    // and what the sill pays at each of the two endings
    PP.S.sill = new Array(9).fill(null);
    PP.S.sill[0] = PP.newFlower(g); PP.S.sill[0].st = 'wilt'; PP.S.sill[0].t0 = 1;
    PP.S.sill[1] = PP.newFlower({ ...g, sp:'sun' });
    PP.S.sill[1].st = 'ill';  PP.S.sill[1].t0 = 1;
    PP.S.petals = 0;
    const done = PP.resolveSill();
    return { first, again, hue, rates, done, afterResolve: PP.S.petals,
             press: PP.CFG.petal.press, firstPay: PP.CFG.petal.first };
  });
  T('a new species is a discovery, not a duplicate', petals.first.newSpecies === true);
  T('the same flower twice is a duplicate', petals.again.newSpecies === false && petals.again.newVariant === false);
  T('a new colourway still counts as a discovery', petals.hue.newVariant === true);
  T('rarer duplicates pay more',
    petals.rates.legendary > petals.rates.rare && petals.rates.rare > petals.rates.common,
    JSON.stringify(petals.rates));
  T('a flower that finished its season pays petals',
    petals.done.pressed === 1 && petals.afterResolve === petals.press,
    `pressed=${petals.done.pressed} petals=${petals.afterResolve}`);
  T('a flower lost to illness pays nothing',
    petals.done.lost === 1 && petals.afterResolve === petals.press,
    `lost=${petals.done.lost}`);

  // ---------- 13. illness is derived from the sill, not from a constant ----------
  const ill = await page.evaluate(() => {
    const mk = () => PP.newFlower({ sp:'moon', va:'dawn', ra:'common', mu:null, seed:3 });
    PP.S.sill = new Array(9).fill(null);
    PP.S.sill[4] = mk(); PP.S.sill[4].life = 99;       // young, alone, healthy
    const alone = PP.illRisk(4);
    PP.S.sill[5] = mk(); PP.S.sill[5].st = 'wilt';     // one that merely finished
    const oneSpent = PP.illRisk(4);
    PP.S.sill[1] = mk(); PP.S.sill[1].st = 'ill';      // one that is actually ill
    const oneSick = PP.illRisk(4);
    PP.S.sill[3] = mk(); PP.S.sill[3].st = 'ill';      // two
    const twoSick = PP.illRisk(4);
    PP.S.sill[4].life = 1;                             // and now it is old as well
    const oldToo = PP.illRisk(4);
    return { alone, oneSpent, oneSick, twoSick, oldToo,
             hasConstant: 'illChance' in PP.CFG,
             empty: PP.illRisk(8),
             nb4: PP.neighbours(4).length, nb0: PP.neighbours(0).length,
             base: PP.CFG.ill.base };
  });
  T('there is no illChance constant to turn up', ill.hasConstant === false);
  T('a young flower alone carries only the floor risk',
    Math.abs(ill.alone - ill.base) < 1e-9, String(ill.alone));
  T('a flower that merely finished its season is harmless to its neighbours',
    ill.oneSpent === ill.alone, `${ill.alone} -> ${ill.oneSpent}`);
  T('rot spreads from an ill neighbour', ill.oneSick > ill.alone, `${ill.alone} -> ${ill.oneSick}`);
  T('two ill neighbours are worse than one', ill.twoSick > ill.oneSick,
    `${ill.oneSick} -> ${ill.twoSick}`);
  T('age adds on top of that', ill.oldToo > ill.twoSick, `${ill.twoSick} -> ${ill.oldToo}`);
  T('an empty pot cannot fall ill', ill.empty === 0);
  T('the middle pot has four neighbours, a corner two', ill.nb4 === 4 && ill.nb0 === 2,
    `${ill.nb4}/${ill.nb0}`);

  // ---------- 14. the catalogue ----------
  const shop = await page.evaluate(() => {
    PP.S.petals = 0; PP.S.owned = {}; PP.S.glaze = 'kiln'; PP.S.paper = 'stripe';
    PP.S.ledge = false; PP.S.decor = [null,null,null]; PP.S.seed = null;
    const poorGlaze = PP.buyCosmetic('glaze', 'harbour');     // cannot afford
    PP.S.petals = 5000;
    const rich = PP.buyCosmetic('glaze', 'harbour');
    const potsNow = PP.POTS()[0].name;
    const paperBuy = PP.buyCosmetic('paper', 'sprig');
    const ledgeBuy = PP.buyLedge();
    const ledgeAgain = PP.buyLedge();                          // already owned
    const sow = PP.sowSeed(PP.undiscovered()[0] ? PP.undiscovered()[0].id : 'moon');
    const sowTwice = PP.sowSeed('sun');                        // one packet at a time
    return { poorGlaze, rich, potsNow, paperBuy, ledgeBuy, ledgeAgain, sow, sowTwice,
             owned: PP.S.owned, glaze: PP.S.glaze, paper: PP.S.paper,
             slots: PP.ledgeSlots(), decorLen: PP.S.decor.length,
             petals: PP.S.petals, spent: PP.S.spent, seed: PP.S.seed,
             free: PP.owns('glaze','kiln') && PP.owns('paper','stripe') };
  });
  // the legibility guarantee: colour is decoration, relief is the grouping
  const relief = await page.evaluate(() => {
    const order = PP.GLAZE_SETS.map(g => g.pots.map(x => x.mark).join(','));
    const sizes = PP.GLAZE_SETS.map(g => g.pots.length);
    const uniq  = PP.GLAZE_SETS.map(g => new Set(g.pots.map(x => x.mark)).size);
    return { order, sizes, uniq, first: PP.GLAZE_SETS.map(g => g.pots[0].name) };
  });
  T('every glaze set carries the same reliefs in the same order',
    new Set(relief.order).size === 1, JSON.stringify(relief.order));
  T('every glaze set has four distinct reliefs',
    relief.sizes.every(n => n === 4) && relief.uniq.every(n => n === 4),
    JSON.stringify(relief.sizes) + JSON.stringify(relief.uniq));
  T('a purchase you cannot afford is refused', shop.poorGlaze === false);
  T('a purchase you can afford goes through', shop.rich === true && shop.glaze === 'harbour');
  T('buying a glaze set changes the pots on the sill', shop.potsNow === 'driftwood', shop.potsNow);
  T('buying a paper changes the room', shop.paperBuy === true && shop.paper === 'sprig');
  T('the default glaze and paper are free', shop.free === true);
  T('the long ledge is bought once', shop.ledgeBuy === true && shop.ledgeAgain === false);
  T('the ledge grows to five places', shop.slots === 5 && shop.decorLen === 5,
    `${shop.slots}/${shop.decorLen}`);
  T('a seed packet can be sown', shop.sow === true && !!shop.seed);
  T('only one packet is sown at a time', shop.sowTwice === false);
  T('petals are actually deducted', shop.spent > 0 && shop.petals === 5000 - shop.spent,
    `spent=${shop.spent} left=${shop.petals}`);

  // a sown packet arrives in the next parcel
  const sown = await page.evaluate(() => {
    PP.S.seed = 'thistle'; PP.S.mail = 5; PP.S.opened = 99;   // past every letter
    PP.S.story = PP.STORY.map(x => x.id);
    PP.openParcel();
    return { sp: PP.V.genome && PP.V.genome.sp, seed: PP.S.seed, sown: PP.V.sown };
  });
  T('a sown packet is what the next parcel holds', sown.sp === 'thistle', JSON.stringify(sown));
  T('and the packet is used up', sown.seed === null);

  // nothing for sale moves the multiplier
  const neutral = await page.evaluate(() => {
    const mk = (sp, va, seed) => PP.newFlower({ sp, va, ra:'common', mu:null, seed });
    // deliberately short of the cap, or the ceiling would hide any difference
    PP.S.sill = new Array(9).fill(null);
    PP.S.sill[0] = mk('moon','dawn',1); PP.S.sill[1] = mk('moon','ink',2);
    PP.S.ledge = true; PP.S.decor = ['bell','moth','stone',null,null];
    const three = PP.harmony().mult;
    PP.S.decor = ['bell','moth','stone','bell','moth'];
    const five = PP.harmony();
    PP.S.glaze = 'orchard'; PP.S.paper = 'gingham';
    const painted = PP.harmony().mult;
    return { three, five: five.mult, decorOn: five.decorOn, decorFilled: five.decorFilled, painted };
  });
  T('a longer ledge does not buy speed', neutral.five === neutral.three,
    `${neutral.three} -> ${neutral.five}`);
  T('the ledge pays for three however long it is',
    neutral.decorOn === 3 && neutral.decorFilled === 5);
  T('paint does not buy speed', neutral.painted === neutral.three);

  // nothing in the catalogue sells relief
  const forSale = await page.evaluate(() => {
    PP.S.petals = 9999; PP.S.seed = null; PP.S.ledge = false;
    PP.S.decor = [null,null,null];
    const kinds = [...new Set(PP.shopLayout().rows.map(r => r.kind))];
    const txt = PP.shopLayout().noteLines.join(' ');
    return { kinds, txt };
  });
  T('the catalogue sells no tonics and no parcels',
    !forSale.kinds.includes('tonic') && !forSale.kinds.includes('mail') &&
    forSale.kinds.every(k => ['glaze','paper','ledge','seed','pack'].includes(k)),
    JSON.stringify(forSale.kinds));
  T('and says so on the page', /tonics/i.test(forSale.txt) && /faster parcels/i.test(forSale.txt));

  // the catalogue scrolls to its own end, on every screen we care about
  for (const vp of [{width:360,height:640},{width:390,height:844},{width:520,height:1180}]){
    const pg = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
    pg.on('pageerror', e => errs.push('shop ' + vp.width + ': ' + e.message));
    await pg.goto('http://127.0.0.1:8899/index.html');
    await pg.click('#bStart'); await pg.waitForTimeout(300);
    await pg.evaluate(() => { PP.S.petals = 900; PP.setScreen('shop'); });
    await pg.waitForTimeout(200);
    await pg.mouse.move(vp.width/2, vp.height*0.6);
    await pg.mouse.wheel(0, 400);
    await pg.waitForTimeout(160);
    const scrolled = await pg.evaluate(() => PP.V.shopScroll);
    T(`wheel scrolls the catalogue @${vp.width}x${vp.height}`, scrolled > 0, '0 -> ' + Math.round(scrolled));
    const reach = await pg.evaluate(() => {
      PP.V.shopScroll = 1e6; PP.paint();
      const L = PP.shopLayout();
      const last = L.rows[L.rows.length - 1];
      return { bottom: Math.round(L.top + last.y + last.h - PP.V.shopScroll), h: PP.H,
               noteBottom: Math.round(L.top + L.noteY - PP.V.shopScroll) };
    });
    T(`the last row of the catalogue is reachable @${vp.width}x${vp.height}`,
      reach.bottom <= reach.h - 80, `ends at ${reach.bottom}, needs <= ${reach.h - 80}`);
    await pg.close();
  }

  // a tap buys nothing on its own: the first tap only quotes the price
  const armed = await page.evaluate(() => {
    PP.S.petals = 5000; PP.S.owned = {}; PP.S.glaze = 'kiln'; PP.V.armedBuy = null;
    PP.setScreen('shop'); PP.V.shopScroll = 0;
    const L = PP.shopLayout();
    const row = L.rows.find(r => r.kind === 'glaze' && r.id === 'harbour');
    const p = { x: row.x + 20, y: L.top + row.y + row.h/2 - PP.V.shopScroll };
    PP.shopTap(p);
    const after1 = { glaze: PP.S.glaze, petals: PP.S.petals, armed: !!PP.V.armedBuy };
    PP.shopTap(p);
    return { after1, after2: { glaze: PP.S.glaze, petals: PP.S.petals } };
  });
  T('the first tap on a price only quotes it',
    armed.after1.glaze === 'kiln' && armed.after1.petals === 5000 && armed.after1.armed,
    JSON.stringify(armed.after1));
  T('the second tap is the purchase',
    armed.after2.glaze === 'harbour' && armed.after2.petals === 5000 - 260,
    JSON.stringify(armed.after2));

  // ---------- 15. the petal pill explains itself ----------
  // the pill steps aside on the catalogue itself, so ask from somewhere else
  await page.evaluate(() => { document.getElementById('toast').textContent = ''; PP.setScreen('shelf'); });
  await page.waitForTimeout(150);
  const pillShown = await page.evaluate(() => {
    PP.setScreen('shop');  const onShop = getComputedStyle(document.getElementById('pPetal')).display;
    PP.setScreen('shelf'); const onSill = getComputedStyle(document.getElementById('pPetal')).display;
    return { onShop, onSill };
  });
  T('the petal pill steps aside on the catalogue, which prints the count itself',
    pillShown.onShop === 'none' && pillShown.onSill !== 'none', JSON.stringify(pillShown));
  await page.click('#pPetal'); await page.waitForTimeout(250);
  const ptxt = await page.evaluate(() => document.getElementById('toast').textContent);
  T('petal pill explains itself', /petal/i.test(ptxt) && /Order/.test(ptxt),
    JSON.stringify(ptxt.slice(0,70)));

  console.log('PASS ' + ok.length + '\n  ' + ok.join('\n  '));
  if (bad.length) console.log('\nFAIL ' + bad.length + '\n  ' + bad.join('\n  '));
  if (errs.length) console.log('\nPAGE ERRORS:\n  ' + errs.join('\n  '));
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
