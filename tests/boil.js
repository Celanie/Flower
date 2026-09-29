const { chromium } = require('playwright');
const ok=[], bad=[];
const T=(n,c,x='')=>(c?ok:bad).push(n+(x?' :: '+x:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2 });
  const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.goto('http://127.0.0.1:8899/index.html');
  await page.click('#bStart'); await page.waitForTimeout(400);
  await page.evaluate(() => {
    const r = PP.mulberry32(20260927);
    PP.S.sill = Array.from({length:9}, (_,i) => PP.newFlower(PP.makeGenome(r, { sp: PP.SPECIES[(i*3+1)%14].id })));
    PP.S.decorFound = {bell:1, moth:1, stone:1}; PP.S.decor = ['bell', 'moth', 'stone'];
    PP.V.mode = 'idle';
  });
  await page.click('#tabs button[data-s="shelf"]'); await page.waitForTimeout(500);

  // the clock: stepped at CFG.boil.fps, cycling CFG.boil.frames drawings
  const clock = await page.evaluate(() => {
    const out = [];
    for (let ms = 0; ms < 1000; ms += 25){ PP.boilTick(ms/1000); out.push(PP.BOIL.k); }
    return out;
  });
  const uniq = [...new Set(clock)].sort();
  T('boil cycles exactly 3 drawings', uniq.length === 3 && uniq.join() === '0,1,2', JSON.stringify(uniq));
  let holds = [], run = 1;
  for (let i=1;i<clock.length;i++){ if (clock[i]===clock[i-1]) run++; else { holds.push(run); run=1; } }
  const avgHold = holds.reduce((a,c)=>a+c,0)/holds.length;
  T('each drawing is held ~125ms, not one frame', Math.abs(avgHold*25 - 125) < 12,
    `avg hold ${(avgHold*25).toFixed(0)}ms`);

  // rendering: different drawings differ; the same drawing is identical
  // Freeze first and let the already-scheduled frame drain, then pin the clock
  // inside every capture — otherwise a stray frame advances V.t between shots
  // and the sway, not the boil, is what differs.
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(250);
  const shot = async k => page.evaluate(kk => {
    PP.V.t = 0;                          // sway held still; only the boil varies
    PP.boilTick(kk / PP.CFG.boil.fps);
    PP.paint();
    return PP.ctx.canvas.toDataURL('image/png');
  }, k);
  const a0 = await shot(0), a1 = await shot(1), a2 = await shot(2), a0b = await shot(0);
  T('drawing 0 and 1 differ', a0 !== a1);
  T('drawing 1 and 2 differ', a1 !== a2);
  T('the same drawing repeats exactly', a0 === a0b);

  // reduced motion: no boil at all
  const still = await page.evaluate(() => {
    PP.BOIL.on = false;
    const out = [];
    for (const k of [0,1,2]){ PP.V.t = 0; PP.boilTick(k / PP.CFG.boil.fps); PP.paint();
      out.push(PP.ctx.canvas.toDataURL('image/png')); }
    PP.BOIL.on = true;
    return out;
  });
  T('reduced motion holds the lines still', still[0] === still[1] && still[1] === still[2]);

  // ---------- frame rate ----------
  // This container has no GPU, so these are software-rasterised floors, not
  // targets. They exist because a full-canvas repaint of static pixels went
  // unnoticed for three rounds of art changes; anything that reintroduces one
  // will trip these long before it reaches a phone.
  const fps = async (screen) => {
    await page.click(`#tabs button[data-s="${screen}"]`);
    await page.evaluate(() => { PP.BOIL.on = true; });
    await page.waitForTimeout(400);
    return page.evaluate(() => new Promise(res => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 1200) requestAnimationFrame(tick);
                           else res(n / ((performance.now() - t0)/1000)); };
      requestAnimationFrame(tick);
    }));
  };
  await page.evaluate(() => {
    window.requestAnimationFrame = window.__rAF || requestAnimationFrame;
  });
  await page.reload(); await page.waitForTimeout(400);
  await page.evaluate(() => {
    if (document.getElementById('bStart')) document.getElementById('bStart').click();
    const r = PP.mulberry32(20260927);
    PP.S.sill = Array.from({length:9}, (_,i) => PP.newFlower(PP.makeGenome(r, { sp: PP.SPECIES[(i*3+1)%14].id })));
    PP.SPECIES.forEach(sp => { const g = PP.makeGenome(r,{sp:sp.id});
      PP.S.book[sp.id] = {g, v:{[g.va]:1}, mu:{}, n:1}; });
  });
  await page.waitForTimeout(300);
  const fTable = await fps('table'), fSill = await fps('shelf'), fBook = await fps('book');
  T('table holds a usable frame rate', fTable >= 40, fTable.toFixed(0) + ' fps (floor 40)');
  T('sill holds a usable frame rate',  fSill  >= 25, fSill.toFixed(0)  + ' fps (floor 25)');
  T('herbarium holds a usable frame rate', fBook >= 25, fBook.toFixed(0) + ' fps (floor 25)');

  console.log('PASS ' + ok.length + '\n  ' + ok.join('\n  '));
  if (bad.length) console.log('\nFAIL ' + bad.length + '\n  ' + bad.join('\n  '));
  if (errs.length) console.log('\nERRORS:\n  ' + errs.join('\n  '));
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
