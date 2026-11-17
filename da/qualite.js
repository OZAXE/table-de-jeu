// =====================================================================
// Qualité d'affichage commune à tous les jeux 3D.
//
// « Version légère » : un interrupteur sur l'accueil (shield.leger). Le décor
// garde sa direction artistique mais perd ce qui coûte cher : ombres
// portées, reflets calculés, particules, lumière qui vacille, petits objets
// en grand nombre, et la résolution est ramenée à 1 pixel par point.
//
// surveillerFluidite() : si la scène rame vraiment (moins de ~22 images/s
// pendant plusieurs secondes), un bandeau propose de passer en version
// légère, une seule fois par appareil.
// =====================================================================
const CLE = 'shield.leger';
const CLE_PROPOSE = 'shield.leger.propose';

export function modeLeger() {
  try { return JSON.parse(localStorage.getItem(CLE)) === true; } catch (e) { return false; }
}

export function definirModeLeger(oui) {
  try { localStorage.setItem(CLE, JSON.stringify(!!oui)); } catch (e) { /* tant pis */ }
}

// Réglages du moteur de rendu selon le mode (à appeler juste après sa création).
export function reglerRendu(renderer) {
  const leger = modeLeger();
  renderer.setPixelRatio(leger ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !leger;
  return leger;
}

// Options du constructeur WebGLRenderer (l'anticrénelage se décide à la création).
export function optionsRendu() {
  return { antialias: !modeLeger(), powerPreference: 'high-performance' };
}

export function surveillerFluidite({ seuil = 22, duree = 6 } = {}) {
  if (modeLeger()) return;
  try { if (localStorage.getItem(CLE_PROPOSE)) return; } catch (e) { return; }
  let images = 0, debut = 0, lentes = 0;
  const mesurer = (t) => {
    if (document.hidden) { debut = 0; requestAnimationFrame(mesurer); return; }
    if (!debut) { debut = t; images = 0; }
    images++;
    if (t - debut >= 1000) {
      const fps = images * 1000 / (t - debut);
      lentes = fps < seuil ? lentes + 1 : 0;
      debut = 0;
      if (lentes >= duree) { proposer(); return; }
    }
    requestAnimationFrame(mesurer);
  };
  // On laisse passer le chargement (compilation des matériaux) avant de compter.
  setTimeout(() => requestAnimationFrame(mesurer), 4000);
}

function proposer() {
  try { localStorage.setItem(CLE_PROPOSE, '1'); } catch (e) { /* tant pis */ }
  const b = document.createElement('div');
  b.setAttribute('role', 'status');
  b.style.cssText = [
    'position:fixed', 'left:12px', 'right:12px', 'top:calc(10px + env(safe-area-inset-top))', 'z-index:99998',
    'display:flex', 'flex-wrap:wrap', 'gap:8px 12px', 'align-items:center', 'justify-content:center',
    'padding:12px 14px', 'border-radius:14px', 'background:rgba(10,8,6,.94)', 'color:#f4f1ea',
    'border:1px solid rgba(255,255,255,.16)', 'font:600 14px/1.35 system-ui,sans-serif', 'max-width:520px', 'margin:0 auto',
  ].join(';');
  const t = document.createElement('span');
  t.textContent = 'Ça rame un peu ? La version légère garde le décor, en plus fluide.';
  const oui = document.createElement('button');
  oui.textContent = 'Passer en version légère';
  oui.style.cssText = 'font:700 14px system-ui,sans-serif;padding:8px 14px;border-radius:999px;border:0;background:#f4f1ea;color:#111;cursor:pointer';
  oui.onclick = () => { definirModeLeger(true); location.reload(); };
  const non = document.createElement('button');
  non.textContent = 'Non merci';
  non.style.cssText = 'font:600 14px system-ui,sans-serif;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#f4f1ea;cursor:pointer';
  non.onclick = () => b.remove();
  b.append(t, oui, non);
  document.body.appendChild(b);
  // Elle passe toute seule : elle ne doit pas cacher le jeu longtemps.
  setTimeout(() => b.remove(), 15000);
}
