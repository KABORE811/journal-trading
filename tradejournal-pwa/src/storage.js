// Persistence for the standalone deployed app.
// (The Claude-artifact preview uses window.storage; once deployed for real,
// we use the browser's own localStorage so everything still works offline.)
export const storage = {
  async get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : { key, value: raw };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch {
      return null;
    }
  },
};
