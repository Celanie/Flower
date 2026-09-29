/* A model of the loop, for tuning the numbers rather than guessing at them.
 *
 * It is a model, not the game: arrangement quality is a parameter rather than a
 * simulated puzzle, calibrated against real measurements (a well-tended full
 * 3x3 sill was measured at x1.75-2.00, which this reproduces). Everything else
 * — accrual, the cap, parcel contents, life in parcels, the wall-clock wilt and
 * illness windows, tonic supply and use — follows the game's own rules.
 *
 *   node tests/economy.js            current settings
 *   node tests/economy.js --sweep    a grid over interval x cap
 */
const CFG = {
  parcelIntervalMs: 300e3, parcelCap: 5, startParcels: 3,
  flowerLife: 25, lifeSpread: 0.22, wiltHours: 20, illHours: 8,
  illChance: 0.005, tonicChance: 0.018, tonicStart: 1,
  decorChance: 0.05, curioChance: 0.055, harmonyCap: 2.0,
  bondEff: 0.65,          // fraction of the 12 neighbour pairs a player bonds
  avgBondValue: 0.085,    // mean of the four tiers, weighted to how often each lands
};

const PLAYER = {
  sessionsPerDay: 3,
  sessionMinutes: 9,
  hoursBetween: [8, 6, 10],   // sums to 24
  days: 60,
  tonicPolicy: 'ill-first',   // spend on illness; let spent flowers go to the book
};

function mulberry32(a){ return () => { a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function multiplier(sill){
  const filled = sill.filter(Boolean).length;
  if (!filled) return 1;
  const vig = sill.filter(Boolean).reduce((a,f) => a + f.vig, 0) / filled;
  const pairs = 12 * (filled/9);
  const sum = pairs * CFG.bondEff * CFG.avgBondValue * vig;
  const extras = (filled === 9 ? 0.10 : 0) + (filled >= 6 ? 0.10 : 0) + 0.06;
  return Math.min(CFG.harmonyCap, 1 + sum + extras);
}

function run(cfg, verbose){
  Object.assign(CFG, cfg);
  const r = mulberry32(12345);
  const sill = new Array(9).fill(null);
  let mail = CFG.startParcels, tonics = CFG.tonicStart, t = 0;   // t in ms
  let lastAccrual = 0;
  const stat = { opened:0, flowers:0, placed:0, pressed:0, lost:0,
                 tonicsGot:0, tonicsUsed:0, illEvents:0, multSum:0, multN:0, occSum:0 };

  const resolve = () => {
    for (let i=0;i<9;i++){
      const f = sill[i]; if (!f || f.st === 'ok') continue;
      const span = (f.st === 'ill' ? CFG.illHours : CFG.wiltHours) * 3600e3;
      if (t - f.t0 < span) continue;
      if (f.st === 'wilt') stat.pressed++; else stat.lost++;
      sill[i] = null;
    }
  };
  const vigOf = f => {
    if (f.st === 'ok') return 1;
    const span = (f.st === 'ill' ? CFG.illHours : CFG.wiltHours) * 3600e3;
    const u = Math.min(1, Math.max(0, (t - f.t0)/span));
    return f.st === 'ill' ? (1-u)*0.55 : 1 + (0.35-1)*u;
  };
  const refreshVig = () => sill.forEach(f => { if (f) f.vig = vigOf(f); });

  const accrue = () => {
    refreshVig();
    const iv = CFG.parcelIntervalMs / multiplier(sill);
    if (mail >= CFG.parcelCap){ lastAccrual = t; return; }
    while (mail < CFG.parcelCap && t - lastAccrual >= iv){ mail++; lastAccrual += iv; }
  };

  const openOne = () => {
    mail--; stat.opened++;
    for (let i=0;i<9;i++){                       // age the sill
      const f = sill[i]; if (!f || f.st !== 'ok') continue;
      f.life--;
      if (f.life <= 0){ f.st = 'wilt'; f.t0 = t; }
      else if (r() < CFG.illChance){ f.st = 'ill'; f.t0 = t; stat.illEvents++; }
    }
    const roll = r();
    if (roll < CFG.tonicChance){ tonics++; stat.tonicsGot++; return; }
    if (roll < CFG.tonicChance + CFG.decorChance) return;         // ornament
    stat.flowers++;
    const slot = sill.indexOf(null);
    if (slot >= 0){
      sill[slot] = { life: Math.round(CFG.flowerLife*(1 - CFG.lifeSpread + 2*CFG.lifeSpread*r())),
                     st:'ok', t0:0, vig:1 };
      stat.placed++;
    }
  };

  for (let d = 0; d < PLAYER.days; d++){
    for (let sIdx = 0; sIdx < PLAYER.sessionsPerDay; sIdx++){
      t += PLAYER.hoursBetween[sIdx % PLAYER.hoursBetween.length] * 3600e3;
      resolve(); accrue();
      // a session: spend tonics, then open everything available
      refreshVig();
      if (PLAYER.tonicPolicy === 'ill-first')
        for (let i=0;i<9 && tonics>0;i++)
          if (sill[i] && sill[i].st === 'ill'){ sill[i].st='ok'; sill[i].t0=0;
            sill[i].life = Math.max(sill[i].life, Math.round(CFG.flowerLife*0.8));
            tonics--; stat.tonicsUsed++; }
      const endOfSession = t + PLAYER.sessionMinutes*60e3;
      while (t < endOfSession){
        accrue();
        if (mail > 0) openOne(); else t += 30e3;
        t += 20e3;                               // ~20s to unwrap one
      }
      refreshVig();
      stat.multSum += multiplier(sill); stat.multN++;
      stat.occSum += sill.filter(Boolean).length;
    }
  }
  const days = PLAYER.days, sess = stat.multN;
  return {
    parcelsPerDay: stat.opened/days,
    flowersPerDay: stat.flowers/days,
    placedPerDay:  stat.placed/days,
    pressedPerDay: stat.pressed/days,
    lostPerDay:    stat.lost/days,
    illPerDay:     stat.illEvents/days,
    tonicsGotPerDay:  stat.tonicsGot/days,
    tonicsUsedPerDay: stat.tonicsUsed/days,
    tonicCoverage: stat.illEvents ? stat.tonicsUsed/stat.illEvents : 1,
    avgMult: stat.multSum/sess,
    avgOccupancy: stat.occSum/sess,
    surplus: stat.flowers/Math.max(1, stat.placed),
  };
}

const f = (n,d=2) => n.toFixed(d).padStart(7);
function report(label, o){
  console.log(`${label}
  parcels/day      ${f(o.parcelsPerDay,1)}     flowers/day ${f(o.flowersPerDay,1)}
  placed/day       ${f(o.placedPerDay,1)}     surplus     ${f(o.surplus,1)}x  (flowers received per slot needed)
  pressed/day      ${f(o.pressedPerDay,2)}     lost/day    ${f(o.lostPerDay,2)}
  illnesses/day    ${f(o.illPerDay,2)}     tonics/day  ${f(o.tonicsGotPerDay,2)}  (cover ${(o.tonicCoverage*100).toFixed(0)}% of illness)
  avg multiplier   ${f(o.avgMult,2)}     occupancy   ${f(o.avgOccupancy,1)}/9`);
}

if (process.argv.includes('--sweep')){
  console.log('interval x cap  ->  parcels/day, avg multiplier, occupancy\n');
  for (const iv of [90, 150, 240, 360, 480]){
    let row = String(iv).padStart(4) + 's  ';
    for (const cap of [4, 5, 6, 8]){
      const o = run({ parcelIntervalMs: iv*1e3, parcelCap: cap });
      row += `cap${cap}: ${o.parcelsPerDay.toFixed(0).padStart(3)}/d ×${o.avgMult.toFixed(2)} ${o.avgOccupancy.toFixed(1)}   `;
    }
    console.log(row);
  }
} else {
  report('TUNED (300s, cap 5)', run({}));
  report('\nOLD (90s, cap 8) — what it felt like before', run({ parcelIntervalMs: 90e3, parcelCap: 8 }));
}
