/* Explorador — modelo STATIC-FIRST.
   La vista por defecto es el snapshot estático (frontend/demo-data.js), generado con el
   motor desde el release publicado vía `python -m scripts.manage export-demo`. Así la
   página carga al instante, no depende de que la API esté arriba, y solo expone datos
   sintéticos ilustrativos. "Cargar en vivo" es opt-in: el visitante pega su API key en
   ⚙️ (se guarda en su navegador). NUNCA hardcodees la API_KEY aquí en un repo público. */
window.GENZ_CONFIG = {
  // Dominio público de la API (sin slash final); la app llama a `${API_BASE}/api/v3/...`.
  // Ajusta si tu dominio difiere. Con API_KEY vacío, la vista por defecto sigue siendo estática.
  API_BASE: "https://api.databolico.com.co",
  // Déjalo vacío en producción: cada usuario carga su key desde ⚙️ (persiste en localStorage).
  API_KEY: "",
  // Tamaño de muestra a pedir en vivo (limitado por el plan de la API key).
  LIVE_SAMPLE_SIZE: 500,
};
