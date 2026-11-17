// Service worker de l'appli installée (PWA), sur le modèle de portfolio-app.
// Pas de mode hors ligne : les parties passent par le serveur Render, donc sans réseau on ne peut
// pas jouer de toute façon. Le réseau est donc toujours utilisé en priorité (une mise à jour du site
// arrive tout de suite dans l'appli). La dernière copie de chaque page sert seulement de secours
// quand le réseau du bar est trop lent : l'écran s'affiche quand même au lieu de rester blanc.

const CACHE = "table-v45";
const PAGE_TIMEOUT_MS = 5000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord ; s'il ne répond pas avant `timeout` ms (ou pas du tout), la copie gardée est servie.
// Le "?salon=XXXX" des QR codes est ignoré pour le cache : une seule copie par jeu.
function networkFirst(request, timeout) {
  const network = fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  });
  const cached = () => caches.match(request, { ignoreSearch: true });
  const fallback = network.catch(() => cached().then((hit) => hit || Promise.reject(new Error("hors ligne"))));
  if (!timeout) return fallback;
  const slow = new Promise((resolve) => setTimeout(resolve, timeout)).then(cached).then((hit) => hit || fallback);
  return Promise.race([fallback, slow]);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Seules les pages du site passent ici. Le reste (serveur Render, Three.js, polices) va
  // directement au réseau, sans intermédiaire.
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(request, request.mode === "navigate" ? PAGE_TIMEOUT_MS : 0));
});
