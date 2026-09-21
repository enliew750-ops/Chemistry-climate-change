/* ================= NAV ================= */
const nav = document.getElementById('mainNav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', ()=> navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>navLinks.classList.remove('open')));

const sections = Array.from(document.querySelectorAll('section[id]'));
const linkMap = {};
navLinks.querySelectorAll('a').forEach(a=> linkMap[a.getAttribute('href').slice(1)] = a);
let sectionOffsets = [];
function computeSectionOffsets(){ sectionOffsets = sections.map(s=>({id:s.id, top:s.offsetTop})); }
function onScroll(){
  const y = window.scrollY + 140;
  let current = sectionOffsets.length ? sectionOffsets[0].id : null;
  for(let i=0;i<sectionOffsets.length;i++){ if(y >= sectionOffsets[i].top) current = sectionOffsets[i].id; }
  for(const k in linkMap) linkMap[k].classList.remove('active');
  if(current && linkMap[current]) linkMap[current].classList.add('active');
}
let ticking=false;
window.addEventListener('scroll', ()=>{ if(!ticking){ requestAnimationFrame(()=>{onScroll(); if(window.heroScrollUpdate) window.heroScrollUpdate(); ticking=false;}); ticking=true; } }, {passive:true});
window.addEventListener('resize', computeSectionOffsets);
window.addEventListener('load', ()=>{ computeSectionOffsets(); onScroll(); });
computeSectionOffsets();

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= HERO: realistic Earth image + animated greenhouse-effect science =================
   Layering: stars -> Earth image (masked/cropped) -> atmosphere glow -> radiation/molecules (SVG) -> text.
   Absorption/re-emission mechanic and molecule count are driven by a shared "greenhouse level" (0-100)
   that is initialised from, and stays in sync with, the #ghSlider control further down the page. */
(function(){
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('heroRadSvg');
  const VB_W = 1000, VB_H = 700;
  const earthCenter = {x:500, y:352};
  const earthR = 175; // approx radius of the visible sphere, in viewBox units

  let level = 35;
  const sliderEl = document.getElementById('ghSlider');
  if(sliderEl) level = +sliderEl.value;

  /* ---- incoming sunlight: a few slow, continuous shimmering rays, upper-left toward Earth ---- */
  const sunGroup = document.createElementNS(SVGNS,'g');
  svg.appendChild(sunGroup);
  const sunRayDefs = [
    {x1:60,y1:30, x2:earthCenter.x-150,y2:earthCenter.y-95},
    {x1:150,y1:10, x2:earthCenter.x-95,y2:earthCenter.y-140},
    {x1:10,y1:110, x2:earthCenter.x-195,y2:earthCenter.y-35},
    {x1:230,y1:0, x2:earthCenter.x-45,y2:earthCenter.y-175},
  ];
  sunRayDefs.forEach((r,i)=>{
    const line = document.createElementNS(SVGNS,'line');
    line.setAttribute('x1',r.x1); line.setAttribute('y1',r.y1);
    line.setAttribute('x2',r.x2); line.setAttribute('y2',r.y2);
    line.setAttribute('stroke','#E8C27A');
    line.setAttribute('stroke-width','1.4');
    line.setAttribute('stroke-linecap','round');
    line.setAttribute('opacity','0.5');
    line.setAttribute('stroke-dasharray','5 11');
    line.setAttribute('class','hero-sun-ray');
    line.style.animationDelay = (i*0.45)+'s';
    sunGroup.appendChild(line);
  });

  /* ---- greenhouse-gas molecule markers, gently drifting around the atmosphere ring ---- */
  const MOL_LABELS = ['CO₂','CH₄','N₂O','H₂O'];
  const MAX_MOL = 9;
  const molecules = [];
  const molGroup = document.createElementNS(SVGNS,'g');
  svg.appendChild(molGroup);
  for(let i=0;i<MAX_MOL;i++){
    const angle = -Math.PI*0.92 + (i/(MAX_MOL-1))*Math.PI*1.84; // arc across the top/sides, clear of dead-bottom
    const radius = earthR + 55 + (i%3)*26;
    const g = document.createElementNS(SVGNS,'g');
    g.setAttribute('class','hero-mol-g');
    const core = document.createElementNS(SVGNS,'circle');
    core.setAttribute('r','4.5'); core.setAttribute('class','hm-core');
    const ring = document.createElementNS(SVGNS,'circle');
    ring.setAttribute('r','10'); ring.setAttribute('class','hm-ring');
    ring.setAttribute('fill','none'); ring.setAttribute('stroke','#8B9A6E'); ring.setAttribute('stroke-width','0.6'); ring.setAttribute('opacity','0.4');
    const label = document.createElementNS(SVGNS,'text');
    label.setAttribute('class','hm-label'); label.setAttribute('y','-14'); label.setAttribute('text-anchor','middle');
    label.textContent = MOL_LABELS[i%4];
    g.appendChild(ring); g.appendChild(core); g.appendChild(label);
    molGroup.appendChild(g);
    molecules.push({g, core, angle, radius, driftSeed: i*137.5, baseX:0, baseY:0});
  }

  function moleculeVisibleCount(lvl){ return Math.round(3 + (lvl/100)*(MAX_MOL-3)); }

  function layoutMolecules(t){
    const visibleCount = moleculeVisibleCount(level);
    molecules.forEach((m,i)=>{
      const drift = Math.sin((t*0.00022)+m.driftSeed)*8;
      const r = m.radius + drift;
      const x = earthCenter.x + Math.cos(m.angle)*r;
      const y = earthCenter.y - 40 + Math.sin(m.angle)*r*0.72;
      m.baseX = x; m.baseY = y;
      m.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      m.g.style.opacity = i < visibleCount ? 1 : 0;
    });
  }

  /* ---- CSS classes for core styling (kept here so they travel with the JS-built nodes) ---- */
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .hero-sun-ray{animation:sunFlow 3.4s linear infinite;}
    @keyframes sunFlow{to{stroke-dashoffset:-32;}}
    .hm-core{fill:#8B9A6E; transition:fill .5s, r .5s;}
    .hm-label{font-family:${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}; font-size:13px; fill:#B9C2B0; opacity:0.8;}
    .hero-mol-g{transition:opacity .6s;}
    .hero-mol-g.excited .hm-core{fill:#C99A55; r:6.5;}
    .hero-mol-g.excited .hm-ring{stroke:#C99A55; opacity:0.8;}
    .ir-ray{fill:none; stroke-linecap:round;}
  `;
  document.head.appendChild(styleTag);

  /* ---- absorption / re-emission ray system ---- */
  const rayGroup = document.createElementNS(SVGNS,'g');
  svg.appendChild(rayGroup);
  let activeRays = 0;
  const MAX_ACTIVE_RAYS = 6;

  function nearestVisibleMolecule(fromAngle){
    const visibleCount = moleculeVisibleCount(level);
    let best=null, bestDiff=Infinity;
    molecules.slice(0,visibleCount).forEach(m=>{
      let diff = Math.abs(m.angle - fromAngle);
      if(diff>Math.PI) diff = Math.PI*2-diff;
      if(diff<bestDiff){ bestDiff=diff; best=m; }
    });
    return best;
  }

  function drawRay(x1,y1,x2,y2,opacity,duration,onDone){
    if(activeRays >= MAX_ACTIVE_RAYS){ if(onDone) onDone(); return null; }
    activeRays++;
    const path = document.createElementNS(SVGNS,'line');
    path.setAttribute('class','ir-ray');
    path.setAttribute('x1',x1.toFixed(1)); path.setAttribute('y1',y1.toFixed(1));
    path.setAttribute('x2',x2.toFixed(1)); path.setAttribute('y2',y2.toFixed(1));
    path.setAttribute('stroke', '#D9784A');
    path.setAttribute('stroke-width','1.5');
    path.setAttribute('opacity', opacity);
    const len = Math.hypot(x2-x1,y2-y1);
    path.setAttribute('stroke-dasharray', len);
    path.setAttribute('stroke-dashoffset', len);
    path.style.transition = `stroke-dashoffset ${duration}s ease-out`;
    rayGroup.appendChild(path);
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ path.style.strokeDashoffset = '0'; }); });
    setTimeout(()=>{
      path.style.transition = 'opacity 0.6s ease-in';
      path.style.opacity = '0';
      setTimeout(()=>{ path.remove(); activeRays--; }, 650);
      if(onDone) onDone();
    }, duration*1000);
    return path;
  }

  function edgePoint(fromX,fromY,angle,dist){
    return { x: fromX + Math.cos(angle)*dist, y: fromY + Math.sin(angle)*dist };
  }

  function spawnOutgoingRay(){
    if(reduceMotion) return;
    // pick an emission point on Earth's visible rim, upper hemisphere-ish (facing the "camera")
    const emitAngle = -Math.PI*0.85 + Math.random()*Math.PI*1.7;
    const origin = { x: earthCenter.x + Math.cos(emitAngle)*earthR*0.94, y: (earthCenter.y-40) + Math.sin(emitAngle)*earthR*0.68 };
    const interceptProb = level/100;
    const intercepted = Math.random() < interceptProb;

    if(intercepted){
      const mol = nearestVisibleMolecule(emitAngle);
      if(!mol){ return; }
      drawRay(origin.x, origin.y, mol.baseX, mol.baseY, 0.85, 1.1, ()=>{
        mol.g.classList.add('excited');
        setTimeout(()=>{
          mol.g.classList.remove('excited');
          // re-emit: chance of heading back toward Earth increases with concentration level
          const backToEarthProb = 0.25 + 0.55*(level/100);
          let target;
          if(Math.random() < backToEarthProb){
            target = { x: earthCenter.x + Math.cos(emitAngle)*earthR*0.5, y: (earthCenter.y-40) + Math.sin(emitAngle)*earthR*0.4 };
          } else {
            const outAngle = emitAngle + (Math.random()-0.5)*0.9;
            target = edgePoint(mol.baseX, mol.baseY, outAngle, 130+Math.random()*90);
          }
          drawRay(mol.baseX, mol.baseY, target.x, target.y, 0.7, 1.0, null);
        }, 480);
      });
    } else {
      const escape = edgePoint(origin.x, origin.y, emitAngle, 260+Math.random()*140);
      drawRay(origin.x, origin.y, escape.x, escape.y, 0.6, 1.3, null);
    }
  }

  let spawnTimer = null;
  function scheduleSpawn(){
    spawnOutgoingRay();
    spawnTimer = setTimeout(scheduleSpawn, 1100 + Math.random()*500);
  }

  /* ---- expose a hook so the greenhouse-gas slider elsewhere on the page can drive this scene ---- */
  window.setHeroGreenhouseLevel = function(val){ level = clamp(+val,0,100); };

  /* ---- drift loop ---- */
  function loop(t){ layoutMolecules(t); if(!reduceMotion) requestAnimationFrame(loop); }
  layoutMolecules(0);
  if(!reduceMotion){
    requestAnimationFrame(loop);
    scheduleSpawn();
  } else {
    // static snapshot for reduced-motion: one escaping ray, one absorbed+redirected pair, no loops
    const mol = molecules[2];
    if(mol){
      drawRay(earthCenter.x-40, earthCenter.y+30, mol.baseX, mol.baseY, 0.7, 0.001, null);
      drawRay(mol.baseX, mol.baseY, earthCenter.x-90, earthCenter.y-10, 0.55, 0.001, null);
    }
    const escapePt = edgePoint(earthCenter.x+60, earthCenter.y-10, -0.6, 240);
    drawRay(earthCenter.x+60, earthCenter.y-10, escapePt.x, escapePt.y, 0.5, 0.001, null);
  }
})();

/* ================= HERO: scroll-driven zoom into Earth, transitioning into the first section =================
   Cheap by construction: reads window.scrollY against a cached scroll range (no getBoundingClientRect
   in the scroll path), and only writes transform/opacity, so it stays smooth. The wrapper is taller than
   the viewport and the hero is sticky, so the whole zoom-and-dissolve plays out slowly over real scroll
   distance instead of being crammed into a single screen height. */
(function(){
  const wrapperEl = document.getElementById('heroWrapper');
  const earthLayer = document.getElementById('heroEarthLayer');
  const radSvg = document.getElementById('heroRadSvg');
  const heroTextEl = document.querySelector('.hero-text');
  const fadeOverlay = document.getElementById('heroFadeOverlay');
  if(!wrapperEl || !earthLayer) return;

  let scrollRange = Math.max(1, wrapperEl.offsetHeight - window.innerHeight);
  function recompute(){ scrollRange = Math.max(1, wrapperEl.offsetHeight - window.innerHeight); }
  window.addEventListener('resize', recompute);
  window.addEventListener('load', recompute);

  // smoothstep easing so the zoom/fade accelerates in and settles out, rather than moving at a linear rate
  function ease(t){ return t*t*(3 - 2*t); }

  function update(){
    const raw = clamp(window.scrollY / scrollRange, 0, 1);
    const p = ease(raw);
    const scale = 1 + p * 3.2;
    earthLayer.style.transform = `scale(${scale})`;
    if(radSvg) radSvg.style.opacity = clamp(1 - p*1.3, 0, 1);
    if(heroTextEl) heroTextEl.style.opacity = clamp(1 - p/0.28, 0, 1);
    if(fadeOverlay) fadeOverlay.style.opacity = clamp((p-0.4)/0.55, 0, 1);
  }
  window.heroScrollUpdate = update;
  update();
})();

/* ================= GREENHOUSE MODEL (slider-driven SVG) ================= */
(function(){
  const svg = document.getElementById('ghSvg');
  const slider = document.getElementById('ghSlider');
  const readout = document.getElementById('ghReadout');
  const W=720,H=340;
  const sunXs = [110,230,350,470,590];
  const irXs = [140,220,300,380,460,540,600,660];

  function render(val){
    const molCount = 4 + Math.round((val/100)*22);
    const interceptFraction = val/100;
    let html = '';

    // sun rays (top-left diagonal down to earth band)
    sunXs.forEach((x,i)=>{
      html += `<line x1="${x-60}" y1="10" x2="${x}" y2="${H-40}" stroke="#C99A55" stroke-width="1.5" opacity="0.75"/>`;
    });

    // greenhouse molecule dots in the atmosphere band (between y=90 and y=230)
    const molPositions = [];
    for(let i=0;i<molCount;i++){
      const seedX = (i*53.7)%100/100;
      const seedY = (i*29.3)%100/100;
      const x = 60 + seedX*(W-120);
      const y = 95 + seedY*120;
      molPositions.push({x,y});
      html += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#8B9A6E" opacity="0.85"/>`;
      html += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="#8B9A6E" stroke-width="0.6" opacity="0.35"/>`;
    }

    // outgoing infrared lines from earth upward; some intercepted based on slider value
    irXs.forEach((x,i)=>{
      const intercepted = (i / irXs.length) < interceptFraction;
      if(intercepted && molPositions.length){
        const mol = molPositions[i % molPositions.length];
        html += `<line x1="${x}" y1="${H-40}" x2="${mol.x.toFixed(1)}" y2="${mol.y.toFixed(1)}" stroke="#78909C" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.85"/>`;
        const returnX = mol.x + (i%2===0? 40:-40);
        html += `<line x1="${mol.x.toFixed(1)}" y1="${mol.y.toFixed(1)}" x2="${returnX.toFixed(1)}" y2="${H-40}" stroke="#78909C" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.55"/>`;
        html += `<circle cx="${mol.x.toFixed(1)}" cy="${mol.y.toFixed(1)}" r="12" fill="#78909C" opacity="0.12"/>`;
      } else {
        html += `<line x1="${x}" y1="${H-40}" x2="${x-10}" y2="20" stroke="#78909C" stroke-width="1.3" opacity="0.5"/>`;
      }
    });

    // earth band + space band hint lines
    html += `<line x1="0" y1="${H-40}" x2="${W}" y2="${H-40}" stroke="rgba(242,239,230,0.15)"/>`;
    html += `<line x1="0" y1="20" x2="${W}" y2="20" stroke="rgba(242,239,230,0.1)"/>`;

    svg.innerHTML = html;

    let desc;
    if(val < 25) desc = 'Low concentration: most outgoing infrared radiation escapes to space with little interference.';
    else if(val < 60) desc = 'Moderate concentration: a growing share of infrared radiation is intercepted and redirected back toward the surface.';
    else desc = 'High concentration: most outgoing infrared paths now interact with greenhouse-gas molecules, so heat escapes far less efficiently.';
    readout.textContent = desc;
  }
  render(+slider.value);
  slider.addEventListener('input', ()=>{
    render(+slider.value);
    if(window.setHeroGreenhouseLevel) window.setHeroGreenhouseLevel(+slider.value);
  });
})();

/* ================= MOLECULE BUILDER (shared by Lab + Reaction) ================= */
const ATOM_COLORS = {
  C: {main:'#2A2E26', hi:'#565E4C', size:32},
  O: {main:'#C99A55', hi:'#E6BC85', size:27},
  N: {main:'#5E7A88', hi:'#93B4C2', size:27},
  H: {main:'#EDE7DA', hi:'#FFFFFF', size:15},
};
const MOL_STORE = {};

function buildMolecule(containerId, atoms, bonds){
  const root = document.getElementById(containerId);
  if(!root) return;
  root.innerHTML = '';
  bonds.forEach(([ai,bi])=>{
    const a = atoms[ai], b = atoms[bi];
    const dx=b.pos[0]-a.pos[0], dy=b.pos[1]-a.pos[1], dz=b.pos[2]-a.pos[2];
    const length = Math.sqrt(dx*dx+dy*dy+dz*dz);
    const mx=(a.pos[0]+b.pos[0])/2, my=(a.pos[1]+b.pos[1])/2, mz=(a.pos[2]+b.pos[2])/2;
    const thetaZ = Math.atan2(dy,dx) * 180/Math.PI;
    const thetaY = -Math.atan2(dz, Math.sqrt(dx*dx+dy*dy)) * 180/Math.PI;
    const bond = document.createElement('div');
    bond.className='bond';
    bond.style.width = length+'px';
    bond.style.background = 'linear-gradient(90deg, rgba(201,154,85,0.55), rgba(237,231,218,0.3))';
    bond.style.transform = `translate3d(${mx}px, ${my}px, ${mz}px) rotateZ(${thetaZ}deg) rotateY(${thetaY}deg)`;
    root.appendChild(bond);
  });
  atoms.forEach((atom,i)=>{
    const c = ATOM_COLORS[atom.el];
    const el = document.createElement('div');
    el.className='atom';
    el.dataset.idx = i;
    el.style.width = c.size+'px'; el.style.height = c.size+'px';
    el.style.background = `radial-gradient(circle at 32% 28%, ${c.hi}, ${c.main} 70%)`;
    el.style.boxShadow = `0 3px 8px rgba(0,0,0,0.5)`;
    el.style.transform = `translate3d(${atom.pos[0]}px, ${atom.pos[1]}px, ${atom.pos[2]}px) translate(-50%,-50%)`;
    root.appendChild(el);
  });
  if(reduceMotion){ root.style.animation='none'; root.style.transform='rotateY(-28deg) rotateX(-10deg)'; }
  MOL_STORE[containerId] = atoms;
}

const MOLECULES = {
  co2: {atoms:[{el:'C',pos:[0,0,0]},{el:'O',pos:[-72,0,0]},{el:'O',pos:[72,0,0]}], bonds:[[0,1],[0,2]],
    name:'Carbon Dioxide', formula:'CO₂', structure:'Linear (O=C=O)', atomsText:'1 carbon, 2 oxygen',
    role:'Absorbs and re-emits thermal infrared radiation; the main gas driving the enhanced greenhouse effect.',
    sources:'Fossil fuel combustion, deforestation, cement production, respiration.',
    labels:[{i:0,t:'C — Carbon'},{i:1,t:'O — Oxygen'},{i:2,t:'O — Oxygen'}]},
  ch4: {atoms:[{el:'C',pos:[0,0,0]},{el:'H',pos:[42,42,42]},{el:'H',pos:[42,-42,-42]},{el:'H',pos:[-42,42,-42]},{el:'H',pos:[-42,-42,42]}], bonds:[[0,1],[0,2],[0,3],[0,4]],
    name:'Methane', formula:'CH₄', structure:'Tetrahedral', atomsText:'1 carbon, 4 hydrogen',
    role:'A powerful greenhouse gas per molecule, though far less abundant in the atmosphere than CO₂.',
    sources:'Livestock, agriculture, landfills, oil and gas production, wetlands.',
    labels:[{i:0,t:'C — Carbon'},{i:1,t:'H — Hydrogen'}]},
  n2o: {atoms:[{el:'N',pos:[-72,0,0]},{el:'N',pos:[0,0,0]},{el:'O',pos:[72,0,0]}], bonds:[[0,1],[1,2]],
    name:'Nitrous Oxide', formula:'N₂O', structure:'Linear', atomsText:'2 nitrogen, 1 oxygen',
    role:'Roughly 265x the 100-year warming effect of CO₂, mass for mass.',
    sources:'Nitrogen fertilisers, agricultural soils, fuel combustion, industry.',
    labels:[{i:0,t:'N — Nitrogen'},{i:2,t:'O — Oxygen'}]},
  h2o: {atoms:[{el:'O',pos:[0,0,0]},{el:'H',pos:[50,-40,0]},{el:'H',pos:[-50,-40,0]}], bonds:[[0,1],[0,2]],
    name:'Water Vapour', formula:'H₂O', structure:'Bent, ~104.5°', atomsText:'1 oxygen, 2 hydrogen',
    role:'The most abundant greenhouse gas; acts mainly as a climate feedback rather than a direct human emission.',
    sources:'Evaporation from oceans and lakes, plant transpiration.',
    labels:[{i:0,t:'O — Oxygen'},{i:1,t:'H — Hydrogen'}]},
};

/* ---- Molecule Lab ---- */
(function(){
  const tabs = document.querySelectorAll('.mlab-tab');
  const scene = document.getElementById('mlabScene');
  const rotator = document.getElementById('mlabRotator');
  const info = document.getElementById('mlabInfo');
  const exploreBtn = document.getElementById('exploreBtn');
  const resetBtn = document.getElementById('resetBtn');
  let current = 'co2';
  let exploring = false;

  function load(key){
    current = key;
    exploring = false;
    resetBtn.style.display = 'none';
    exploreBtn.style.display = '';
    rotator.id = 'mlabRotator';
    const m = MOLECULES[key];
    buildMolecule('mlabRotator', m.atoms, m.bonds);
    info.innerHTML = `
      <div><span class="k">FORMULA</span><p>${m.formula}</p></div>
      <div><span class="k">ATOMS</span><p>${m.atomsText}</p></div>
      <div><span class="k">MOLECULAR STRUCTURE</span><p>${m.structure}</p></div>
      <div><span class="k">ROLE IN THE GREENHOUSE EFFECT</span><p>${m.role}</p></div>
      <div style="grid-column:1/-1;"><span class="k">SOURCES</span><p>${m.sources}</p></div>
    `;
    scene.querySelectorAll('.atom-label').forEach(l=>l.remove());
  }
  tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      load(tab.dataset.mol);
    });
  });

  exploreBtn.addEventListener('click', ()=>{
    exploring = true;
    const m = MOLECULES[current];
    rotator.style.animation = 'none';
    rotator.style.transform = 'rotateY(-24deg) rotateX(-8deg) scale(1.35)';
    scene.querySelectorAll('.atom-label').forEach(l=>l.remove());
    m.labels.forEach(lab=>{
      const atom = m.atoms[lab.i];
      const el = document.createElement('div');
      el.className = 'atom-label';
      el.textContent = lab.t;
      el.style.transform = `translate(${atom.pos[0]*1.35 - 30}px, ${atom.pos[1]*1.35 - 38}px)`;
      scene.appendChild(el);
      requestAnimationFrame(()=> requestAnimationFrame(()=> el.classList.add('show')));
    });
    exploreBtn.style.display = 'none';
    resetBtn.style.display = '';
  });
  resetBtn.addEventListener('click', ()=> load(current));

  load('co2');

  // drag to rotate
  let dragging=false,lastX=0,lastY=0,rotX=-8,rotY=0,resumeTimer=null;
  scene.addEventListener('pointerdown', e=>{
    scene.setPointerCapture(e.pointerId); dragging=true; lastX=e.clientX; lastY=e.clientY;
    if(resumeTimer) clearTimeout(resumeTimer);
    rotator.style.animation='none';
  });
  scene.addEventListener('pointermove', e=>{
    if(!dragging) return;
    rotY += (e.clientX-lastX)*0.5; rotX -= (e.clientY-lastY)*0.5; rotX = clamp(rotX,-85,85);
    lastX=e.clientX; lastY=e.clientY;
    rotator.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)${exploring?' scale(1.35)':''}`;
  });
  function endDrag(){
    if(!dragging) return; dragging=false;
    if(!exploring) resumeTimer=setTimeout(()=>{ rotator.style.animation=''; rotator.style.transform=''; }, 3500);
  }
  scene.addEventListener('pointerup', endDrag);
  scene.addEventListener('pointerleave', endDrag);
})();

/* ---- Reaction simulator ---- */
(function(){
  buildMolecule('rx-ch4', MOLECULES.ch4.atoms.map(a=>({el:a.el,pos:a.pos.map(v=>v*0.55)})), MOLECULES.ch4.bonds);
  buildMolecule('rx-o2-1', [{el:'O',pos:[-28,0,0]},{el:'O',pos:[28,0,0]}], [[0,1]]);
  buildMolecule('rx-o2-2', [{el:'O',pos:[-28,0,0]},{el:'O',pos:[28,0,0]}], [[0,1]]);
  buildMolecule('rx-co2', MOLECULES.co2.atoms.map(a=>({el:a.el,pos:a.pos.map(v=>v*0.5)})), MOLECULES.co2.bonds);
  buildMolecule('rx-h2o-1', MOLECULES.h2o.atoms.map(a=>({el:a.el,pos:a.pos.map(v=>v*0.6)})), MOLECULES.h2o.bonds);

  const btn = document.getElementById('runReactionBtn');
  const reactants = document.getElementById('rxReactants');
  const products = [document.getElementById('rxProducts'), document.getElementById('rxProducts2')];
  const plusEl = document.querySelector('.rx-products-plus');
  const eq = document.getElementById('rxEq');
  const caption = document.getElementById('rxCaption');
  let running = false;

  btn.addEventListener('click', ()=>{
    if(running) return;
    running = true;
    caption.textContent = 'Reactant molecules move together...';
    reactants.classList.add('merging');
    setTimeout(()=>{
      caption.textContent = 'Bonds break and atoms rearrange...';
      eq.classList.add('highlight');
    }, 900);
    setTimeout(()=>{
      products.forEach(p=>p.classList.add('formed'));
      plusEl.style.opacity = 1;
      caption.textContent = 'New products form: carbon dioxide and water.';
    }, 1500);
    setTimeout(()=>{
      caption.textContent = 'Atoms are rearranged during a chemical reaction. No atoms are created or destroyed, only regrouped.';
    }, 2400);
    setTimeout(()=>{
      reactants.classList.remove('merging');
      products.forEach(p=>p.classList.remove('formed'));
      plusEl.style.opacity = 0;
      eq.classList.remove('highlight');
      caption.textContent = '';
      running = false;
    }, 5200);
  });
})();

/* ================= ACTIVITY CARDS ================= */
document.querySelectorAll('.activity-card .activity-head').forEach(head=>{
  head.addEventListener('click', ()=>{
    const card = head.closest('.activity-card');
    const wasOpen = card.classList.contains('open');
    document.querySelectorAll('.activity-card.open').forEach(c=>c.classList.remove('open'));
    if(!wasOpen) card.classList.add('open');
  });
});

/* ---- abstract activity icons (inline SVG, CSS-animated particles) ---- */
function svgEl(html){ const d=document.createElement('div'); d.innerHTML=html; return d.firstElementChild; }
document.getElementById('icon-fossil').appendChild(svgEl(`
  <svg viewBox="0 0 52 52" width="52" height="52">
    <rect x="10" y="26" width="10" height="18" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>
    <rect x="22" y="18" width="10" height="26" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>
    <rect x="34" y="30" width="8" height="14" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>
    <circle cx="27" cy="10" r="2" fill="#C99A55" class="rise-dot" style="position:static; animation-delay:0s;"/>
  </svg>`));
document.getElementById('icon-transport').appendChild(svgEl(`
  <svg viewBox="0 0 52 52" width="52" height="52">
    <line x1="6" y1="40" x2="46" y2="40" stroke="#8B9A6E" stroke-width="1.4" stroke-dasharray="4 3"/>
    <rect x="16" y="26" width="20" height="10" rx="2" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>
    <circle cx="21" cy="38" r="2.5" fill="#20231F"/><circle cx="31" cy="38" r="2.5" fill="#20231F"/>
  </svg>`));
document.getElementById('icon-deforest').appendChild(svgEl(`
  <svg viewBox="0 0 52 52" width="52" height="52">
    <path d="M14 38 L20 22 L26 38 Z" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>
    <path d="M26 38 L32 20 L38 38 Z" fill="none" stroke="#8B9A6E" stroke-width="1" opacity="0.4" stroke-dasharray="2 2"/>
    <circle cx="34" cy="16" r="1.6" fill="#C99A55"/><circle cx="30" cy="22" r="1.2" fill="#C99A55"/>
  </svg>`));
document.getElementById('icon-agri').appendChild(svgEl(`
  <svg viewBox="0 0 52 52" width="52" height="52">
    <rect x="8" y="36" width="36" height="4" fill="#EAE2D6" stroke="#8B9A6E" stroke-width="1"/>
    <rect x="8" y="41" width="36" height="4" fill="#EAE2D6" stroke="#8B9A6E" stroke-width="1"/>
    <circle cx="18" cy="26" r="2" fill="#8B9A6E" class="rise-dot"/>
    <circle cx="28" cy="20" r="2" fill="#8B9A6E" class="rise-dot" style="animation-delay:0.6s;"/>
    <circle cx="36" cy="28" r="2" fill="#8B9A6E" class="rise-dot" style="animation-delay:1.2s;"/>
  </svg>`));
document.getElementById('icon-industry').appendChild(svgEl(`
  <svg viewBox="0 0 52 52" width="52" height="52">
    <rect x="12" y="20" width="28" height="20" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>
    <line x1="12" y1="28" x2="40" y2="28" stroke="#8B9A6E" stroke-width="1"/>
    <circle cx="20" cy="14" r="1.6" fill="#C99A55" class="rise-dot"/>
    <circle cx="30" cy="12" r="1.6" fill="#C99A55" class="rise-dot" style="animation-delay:0.8s;"/>
  </svg>`));

/* ================= impacts system diagram ================= */
(function(){
  const svg = document.getElementById('systemSvg');
  const nodes = [
    {id:'atm', label:'Atmosphere', x:450, y:40},
    {id:'ocean', label:'Oceans', x:200, y:120},
    {id:'ice', label:'Ice & Glaciers', x:700, y:120},
    {id:'sea', label:'Sea Level', x:120, y:220},
    {id:'eco', label:'Ecosystems', x:450, y:220},
    {id:'agri', label:'Agriculture', x:650, y:220},
    {id:'comm', label:'Human Communities', x:780, y:220},
  ];
  const links = [['atm','ocean'],['atm','ice'],['ocean','sea'],['ice','sea'],['atm','eco'],['eco','agri'],['agri','comm'],['sea','comm'],['ocean','eco']];
  let html='';
  links.forEach(([a,b])=>{
    const na=nodes.find(n=>n.id===a), nb=nodes.find(n=>n.id===b);
    html += `<line class="sys-line" x1="${na.x}" y1="${na.y}" x2="${nb.x}" y2="${nb.y}"/>`;
  });
  nodes.forEach(n=>{
    const w = n.label.length*6.6+24;
    html += `<rect class="sys-node" x="${n.x-w/2}" y="${n.y-14}" width="${w}" height="28" rx="14"/>`;
    html += `<text class="sys-label" x="${n.x}" y="${n.y+4}" text-anchor="middle">${n.label}</text>`;
  });
  svg.innerHTML = html;
})();

/* ================= strategy icons ================= */
function strategyIcon(id, paths){
  const el = document.getElementById(id);
  if(!el) return;
  el.appendChild(svgEl(`<svg viewBox="0 0 36 36" width="36" height="36">${paths}</svg>`));
}
strategyIcon('si-energy', `<circle cx="18" cy="18" r="7" fill="none" stroke="#C99A55" stroke-width="1.4"/>
  <line x1="18" y1="2" x2="18" y2="7" stroke="#C99A55" stroke-width="1.4"/>
  <line x1="18" y1="29" x2="18" y2="34" stroke="#C99A55" stroke-width="1.4"/>
  <line x1="2" y1="18" x2="7" y2="18" stroke="#C99A55" stroke-width="1.4"/>
  <line x1="29" y1="18" x2="34" y2="18" stroke="#C99A55" stroke-width="1.4"/>`);
strategyIcon('si-transport', `<line x1="3" y1="27" x2="33" y2="27" stroke="#8B9A6E" stroke-width="1.4" stroke-dasharray="3 3"/>
  <rect x="9" y="15" width="18" height="9" rx="2" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>`);
strategyIcon('si-forests', `<path d="M18 4 L27 20 L9 20 Z" fill="none" stroke="#596548" stroke-width="1.4"/>
  <path d="M18 12 L25 26 L11 26 Z" fill="none" stroke="#596548" stroke-width="1.4"/>
  <line x1="18" y1="26" x2="18" y2="33" stroke="#596548" stroke-width="1.4"/>`);
strategyIcon('si-agri', `<path d="M18 30 C10 24 10 12 18 5 C26 12 26 24 18 30 Z" fill="none" stroke="#8B9A6E" stroke-width="1.4"/>
  <line x1="18" y1="30" x2="18" y2="12" stroke="#8B9A6E" stroke-width="1"/>`);
strategyIcon('si-industry', `<rect x="7" y="14" width="22" height="16" fill="none" stroke="#78909C" stroke-width="1.4"/>
  <line x1="7" y1="20" x2="29" y2="20" stroke="#78909C" stroke-width="1"/>`);

/* ================= INTERACTIVE CO2 CHART ================= */
const co2Data = [
  {year:1960, ppm:316.5},{year:1970, ppm:325.5},{year:1980, ppm:339.1},{year:1990, ppm:354.6},
  {year:2000, ppm:370.2},{year:2010, ppm:390.6},{year:2020, ppm:414.8},{year:2024, ppm:425.7},
];
(function(){
  const svg = document.getElementById('co2Chart');
  const tooltip = document.getElementById('chartTooltip');
  const chartWrap = svg.closest('.chart-wrap');
  const W=680,H=300, padL=52, padR=20, padT=20, padB=40;
  const minY=300, maxY=440;
  const x=i=>padL+(i/(co2Data.length-1))*(W-padL-padR);
  const y=v=>H-padB-((v-minY)/(maxY-minY))*(H-padT-padB);
  let html='';
  for(let v=300;v<=440;v+=20){
    html+=`<line class="chart-grid-line" x1="${padL}" y1="${y(v)}" x2="${W-padR}" y2="${y(v)}"/>`;
    html+=`<text class="chart-axis-label" x="${padL-10}" y="${y(v)+4}" text-anchor="end">${v}</text>`;
  }
  co2Data.forEach((d,i)=>{ html+=`<text class="chart-axis-label" x="${x(i)}" y="${H-padB+22}" text-anchor="middle">${d.year}</text>`; });
  html+=`<path class="chart-line" d="${co2Data.map((d,i)=>(i===0?'M':'L')+x(i).toFixed(1)+','+y(d.ppm).toFixed(1)).join(' ')}"/>`;
  co2Data.forEach((d,i)=>{ html+=`<circle class="chart-point" data-i="${i}" cx="${x(i).toFixed(1)}" cy="${y(d.ppm).toFixed(1)}" r="5.5"/>`; });
  html+=`<text class="chart-axis-label" x="${padL}" y="14">CO\u2082 concentration, parts per million (ppm)</text>`;
  svg.innerHTML = html;
  svg.querySelectorAll('.chart-point').forEach(pt=>{
    const i=+pt.getAttribute('data-i'), d=co2Data[i];
    function show(evt){
      svg.querySelectorAll('.chart-point').forEach(p=>p.classList.remove('active'));
      pt.classList.add('active');
      tooltip.textContent = `${d.year}: ${d.ppm.toFixed(1)} ppm`;
      tooltip.style.opacity=1;
      const rect = chartWrap.getBoundingClientRect();
      const px=(evt.clientX!==undefined)?evt.clientX:rect.left+(x(i)/W)*rect.width;
      const py=(evt.clientY!==undefined)?evt.clientY:rect.top+(y(d.ppm)/H)*rect.height;
      tooltip.style.left=(px-rect.left+14)+'px'; tooltip.style.top=(py-rect.top-34)+'px';
    }
    pt.addEventListener('pointerenter', show);
    pt.addEventListener('pointermove', show);
    pt.addEventListener('pointerleave', ()=>{ tooltip.style.opacity=0; pt.classList.remove('active'); });
    pt.addEventListener('click', show);
  });
})();

/* ================= EXPERIMENT RESULTS CHART (real data from the completed trial) ================= */
(function(){
  const svg = document.getElementById('resultsChart');
  if(!svg) return;
  const labels = ['Initial','5 min','10 min','15 min'];
  const normalAir = [27,28,28,29];
  const co2Air = [27,29,30,32];
  const W=560,H=320, padL=44, padR=16, padT=36, padB=44;
  const minY=20, maxY=34;
  const groupW = (W-padL-padR)/labels.length;
  const barW = groupW*0.3;
  const y = v => H-padB-((v-minY)/(maxY-minY))*(H-padT-padB);
  let html='';
  for(let v=minY; v<=maxY; v+=2){
    html+=`<line class="chart-grid-line" x1="${padL}" y1="${y(v)}" x2="${W-padR}" y2="${y(v)}"/>`;
    html+=`<text class="chart-axis-label" x="${padL-10}" y="${y(v)+4}" text-anchor="end">${v}</text>`;
  }
  labels.forEach((lab,i)=>{
    const cx = padL + groupW*i + groupW/2;
    const x1 = cx - barW - 3, x2 = cx + 3;
    const h1 = y(minY) - y(normalAir[i]), h2 = y(minY) - y(co2Air[i]);
    html += `<rect x="${x1.toFixed(1)}" y="${y(normalAir[i]).toFixed(1)}" width="${barW.toFixed(1)}" height="${h1.toFixed(1)}" fill="#78909C" rx="2"/>`;
    html += `<text class="chart-axis-label" x="${(x1+barW/2).toFixed(1)}" y="${(y(normalAir[i])-6).toFixed(1)}" text-anchor="middle">${normalAir[i]}</text>`;
    html += `<rect x="${x2.toFixed(1)}" y="${y(co2Air[i]).toFixed(1)}" width="${barW.toFixed(1)}" height="${h2.toFixed(1)}" fill="#C99A55" rx="2"/>`;
    html += `<text class="chart-axis-label" x="${(x2+barW/2).toFixed(1)}" y="${(y(co2Air[i])-6).toFixed(1)}" text-anchor="middle">${co2Air[i]}</text>`;
    html += `<text class="chart-axis-label" x="${cx.toFixed(1)}" y="${H-padB+20}" text-anchor="middle">${lab}</text>`;
  });
  html += `<text class="chart-axis-label" x="${padL}" y="16">Temperature (\u00b0C)</text>`;
  html += `<rect x="${W-190}" y="8" width="12" height="12" fill="#78909C" rx="2"/><text class="chart-axis-label" x="${W-174}" y="18">Normal air</text>`;
  html += `<rect x="${W-90}" y="8" width="12" height="12" fill="#C99A55" rx="2"/><text class="chart-axis-label" x="${W-74}" y="18">CO\u2082-enriched air</text>`;
  svg.innerHTML = html;
})();

/* ================= EDIT MODE ================= */
(function(){
  const editables = Array.from(document.querySelectorAll('[data-editable]'));
  const STORE_KEY = 'ghSiteEdits';
  try{
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    editables.forEach(el=>{ const id=el.getAttribute('data-edit-id'); if(saved[id]) el.innerHTML=saved[id]; });
  }catch(e){}

  const panel = document.getElementById('editPanel');
  function enterEditMode(){
    document.body.classList.add('edit-mode');
    editables.forEach(el=> el.setAttribute('contenteditable','true'));
    panel.classList.add('show');
  }
  function exitEditMode(){
    document.body.classList.remove('edit-mode');
    editables.forEach(el=> el.removeAttribute('contenteditable'));
    panel.classList.remove('show');
    if(location.hash === '#edit') history.replaceState(null,'',location.pathname+location.search);
  }
  if(location.hash === '#edit') enterEditMode();

  document.getElementById('saveEditsBtn').addEventListener('click', ()=>{
    const data={}; editables.forEach(el=>{ data[el.getAttribute('data-edit-id')]=el.innerHTML; });
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
    const btn=document.getElementById('saveEditsBtn'); const orig=btn.textContent;
    btn.textContent='Saved.'; setTimeout(()=>{btn.textContent=orig;},1400);
  });
  document.getElementById('downloadEditsBtn').addEventListener('click', ()=>{
    editables.forEach(el=> el.removeAttribute('contenteditable'));
    document.body.classList.remove('edit-mode'); panel.classList.remove('show');
    const htmlOut = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([htmlOut], {type:'text/html'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='index.html'; a.click();
    document.body.classList.add('edit-mode');
    editables.forEach(el=> el.setAttribute('contenteditable','true'));
    panel.classList.add('show');
  });
  document.getElementById('exitEditsBtn').addEventListener('click', exitEditMode);
})();
