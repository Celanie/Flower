const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,4).join('\n')));

  await page.goto('http://127.0.0.1:8899/index.html');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shot-intro.png' });

  await page.click('#bStart');
  await page.waitForTimeout(700);

  const M = page.mouse;
  const pt = (o) => ({ x: o.x, y: o.y });

  async function swipeThrough(a, b, steps = 22) {
    await M.move(a.x, a.y); await M.down();
    for (let i = 1; i <= steps; i++) await M.move(a.x + (b.x-a.x)*i/steps, a.y + (b.y-a.y)*i/steps);
    await M.up();
  }

  async function doLayer(L, box) {
    if (L.kind === 'peel') {
      // grab the loose end, drag all the way along the strip
      await M.move(L.a.x, L.a.y); await M.down();
      for (let i = 1; i <= 30; i++) await M.move(L.a.x + (L.b.x-L.a.x)*i/30, L.a.y + (L.b.y-L.a.y)*i/30);
      await M.up();
    } else if (L.kind === 'snip') {
      for (const c of L.cords) {
        const mid = { x: (c.a.x+c.b.x)/2, y: (c.a.y+c.b.y)/2 };
        const dx = c.b.x-c.a.x, dy = c.b.y-c.a.y, len = Math.hypot(dx,dy);
        const nx = -dy/len, ny = dx/len;   // perpendicular
        await swipeThrough({x: mid.x-nx*60, y: mid.y-ny*60}, {x: mid.x+nx*60, y: mid.y+ny*60}, 14);
      }
    } else if (L.kind === 'pop') {
      for (const b of L.bs) { await M.move(b.x, b.y); await M.down(); await M.up(); }
    } else if (L.kind === 'unwind') {
      const R = box.w*0.42;
      await M.move(box.cx + R, box.cy); await M.down();
      for (let i = 1; i <= 140; i++) {
        const a = i/140 * Math.PI*2 * 3.2;
        await M.move(box.cx + Math.cos(a)*R, box.cy + Math.sin(a)*R);
      }
      await M.up();
    } else if (L.kind === 'squeeze') {
      await M.move(box.cx, box.cy); await M.down();
      await page.waitForTimeout(1600);
      await M.up();
    } else if (L.kind === 'lift') {
      await M.move(box.cx, box.cy - box.h*0.4); await M.down();
      for (let i = 1; i <= 24; i++) await M.move(box.cx, box.cy - box.h*0.4 - i*8);
      await M.up();
    }
    await page.waitForTimeout(120);
  }

  const log = [];
  for (let n = 0; n < 16; n++) {
    await page.evaluate(() => { PP.S.mail = Math.max(PP.S.mail, 3); });
    let st = await page.evaluate(() => ({ mode: PP.V.mode, mail: PP.S.mail }));
    if (st.mode === 'idle') {
      if (st.mail === 0) { log.push('out of parcels after ' + n + ' opens'); break; }
      await page.mouse.click(210, 500);            // tap the stack
      await page.waitForTimeout(250);
    }
    const info = await page.evaluate(() => ({
      mode: PP.V.mode, parcel: PP.V.P && PP.V.P.id, box: PP.V.box,
      kinds: PP.V.layers.map(l => l.kind),
    }));
    if (info.mode !== 'unwrap') { log.push('#' + n + ' did not enter unwrap (mode=' + info.mode + ')'); break; }
    log.push('#' + n + ' ' + info.parcel + ' [' + info.kinds.join(' > ') + ']');

    for (let k = 0; k < info.kinds.length; k++) {
      const L = await page.evaluate(() => {
        const l = PP.V.layers.find(x => x.p < 1);
        return l ? JSON.parse(JSON.stringify(l)) : null;
      });
      if (!L) break;
      if (n === 0 && k === 0) await page.screenshot({ path: 'shot-unwrap.png' });
      await doLayer(L, info.box);
      const p = await page.evaluate(i => { const l = PP.V.layers[i]; return l ? l.p : null; },
                                    await page.evaluate(() => PP.V.layers.findIndex(x => x.p < 1)) );
    }
    await page.waitForTimeout(1300);
    const res = await page.evaluate(() => ({
      mode: PP.V.mode,
      sheet: document.getElementById('sheet').classList.contains('up'),
      name: document.getElementById('shName').textContent,
      rar: document.getElementById('shRar').textContent,
      left: PP.V.layers.filter(l => l.p < 1).map(l => l.kind + ':' + l.p.toFixed(2)),
    }));
    log.push('    -> mode=' + res.mode + ' sheet=' + res.sheet + ' | ' + res.rar + ' ' + res.name +
             (res.left.length ? '  STUCK ON ' + res.left.join(',') : ''));
    if (n === 0 && res.sheet) await page.screenshot({ path: 'shot-bloom.png' });

    // alternate: place on the sill, or send to the book
    if (res.sheet) {
      const kind = await page.evaluate(() => PP.V.story ? 'story' : PP.V.decor ? 'decor' : 'flower');
      if (kind === 'story') { log.push('    (letter from the sender)'); await page.click('#bBook'); await page.waitForTimeout(400); await page.waitForTimeout(150); continue; }
      if (kind === 'decor') {
        log.push('    (ornament)');
        await page.click('#bSill'); await page.waitForTimeout(500);
        const lp = await page.evaluate(k => { const s = PP.ledgeGeom().slot(k); return {x:s.x, y:s.y-6}; }, n % 3);
        await page.mouse.click(lp.x, lp.y); await page.waitForTimeout(400);
        await page.click('#tabs button[data-s="table"]'); await page.waitForTimeout(150); continue;
      }
      const canSill = await page.evaluate(() => getComputedStyle(document.getElementById('bSill')).display !== 'none');
      if (canSill && n % 2 === 0) {
        await page.click('#bSill'); await page.waitForTimeout(600);
        const slot = await page.evaluate(() => { const g = PP.V; return null; });
        // tap first pot
        const pos = await page.evaluate(() => {
          const x0 = Math.min(window.innerWidth,480)*0.22, y0 = window.innerHeight*0.34;
          return { x: x0 + (Math.min(window.innerWidth,480)-0)*0, y: y0 };
        });
        const sillPt = await page.evaluate(n => {
          const W = Math.min(window.innerWidth, 480), H = window.innerHeight;
          const g = PP.shelfGeom();
          const s = g.slot(n);
          return { x: s.x, y: s.y - 4 };
        }, Math.floor(n/2));
        await page.mouse.click(sillPt.x, sillPt.y);
        await page.waitForTimeout(500);
        if (n === 0) await page.screenshot({ path: 'shot-sill.png' });
        await page.click('#tabs button[data-s="table"]');
      } else {
        await page.click('#bBook'); await page.waitForTimeout(400);
      }
    }
    await page.waitForTimeout(200);
  }

  // final state
  await page.click('#tabs button[data-s="shelf"]'); await page.waitForTimeout(700);
  await page.screenshot({ path: 'shot-sill.png' });
  await page.click('#tabs button[data-s="book"]'); await page.waitForTimeout(700);
  await page.screenshot({ path: 'shot-book.png' });

  const final = await page.evaluate(() => ({
    book: PP.bookStats(), harmony: PP.harmony(), mail: PP.S.mail,
    sill: PP.S.sill.filter(Boolean).length, opened: PP.S.opened, story: PP.S.story, decor: PP.S.decor,
  }));

  console.log(log.join('\n'));
  console.log('\nFINAL', JSON.stringify(final));
  console.log('\nERRORS: ' + (errs.length ? '\n' + errs.join('\n') : 'none'));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
