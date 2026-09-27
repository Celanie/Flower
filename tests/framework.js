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
    const set = a => { PP.S.sill = a; return PP.harmony(); };
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
    PP.S.sill[0] = mk('moon','dawn',11);     // slot 0
    PP.S.sill[4] = mk('moon','ink',12);      // slot 4, not adjacent to 0
    PP.V.placing = false;
  });
  await page.click('#tabs button[data-s="shelf"]'); await page.waitForTimeout(350);
  const before = await page.evaluate(() => ({ b: PP.harmony().bonds.length,
                                              s: PP.S.sill.map(x => x ? x.seed : null) }));
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
                                             s: PP.S.sill.map(x => x ? x.seed : null),
                                             m: PP.harmony().mult }));
  T('drag moved the flower', after.s[1] === 12 && after.s[4] === null,
    JSON.stringify(before.s) + ' -> ' + JSON.stringify(after.s));
  T('drag created a bond', before.b === 0 && after.b === 1, `${before.b} -> ${after.b}`);
  T('drag raised the multiplier', after.m > 1, 'mult=' + after.m);

  // a tap must inspect, not drag
  await page.mouse.click(pts.to.x, pts.to.y - 2);
  await page.waitForTimeout(200);
  const tapped = await page.evaluate(() => ({ s: PP.S.sill.map(x => x ? x.seed : null),
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
  T('v1 save migrates to v2', migrated.v === 2, 'v=' + migrated.v);
  T('old oddments become letters, in order', JSON.stringify(migrated.story) === '["key","frog"]',
    JSON.stringify(migrated.story));
  T('ledge initialised on migration', Array.isArray(migrated.decor) && migrated.decor.length === 3);
  T('unrelated save fields survive', migrated.streak === 3, 'streak=' + migrated.streak);

  console.log('PASS ' + ok.length + '\n  ' + ok.join('\n  '));
  if (bad.length) console.log('\nFAIL ' + bad.length + '\n  ' + bad.join('\n  '));
  if (errs.length) console.log('\nPAGE ERRORS:\n  ' + errs.join('\n  '));
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
