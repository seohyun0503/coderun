// ─── AssetLoader ──────────────────────────────────────────────────────────────
//
// Static singleton image cache.
// Call AssetLoader.preload(manifest) once before game.start(), then use
// AssetLoader.get(key) from anywhere in the codebase.

const _cache = {};

export const AssetLoader = {
  /**
   * Load every image in the manifest concurrently.
   * Soft-fails (warns, does not throw) so one bad file cannot block startup.
   *
   * @param {Record<string, string>} manifest  { key: relativeUrl }
   * @returns {Promise<void>}
   */
  async preload(manifest) {
    await Promise.all(
      Object.entries(manifest).map(
        ([key, url]) =>
          new Promise(resolve => {
            const img   = new Image();
            img.onload  = () => { _cache[key] = img; resolve(); };
            img.onerror = () => {
              console.warn(`[AssetLoader] failed to load "${url}" (key: "${key}")`);
              resolve();   // don't reject — let the game start without this image
            };
            img.src = url;
          }),
      ),
    );
  },

  /**
   * @param {string} key
   * @returns {HTMLImageElement|null}
   */
  get(key) {
    return _cache[key] ?? null;
  },

  /** Returns true only when every key in the manifest loaded successfully. */
  loaded(manifest) {
    return Object.keys(manifest).every(k => k in _cache);
  },
};
