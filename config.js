/* Explorador — modelo STATIC-FIRST.
   La vista por defecto es el snapshot estático (frontend/demo-data.js), generado con el
   motor desde el release publicado vía `python -m scripts.manage export-demo`. Así la
   página carga al instante, no depende de que la API esté arriba, y solo expone datos
   sintéticos ilustrativos. "Cargar en vivo" es opt-in: el visitante pega su API key en
   ⚙️ (se guarda en su navegador). NUNCA hardcodees la API_KEY aquí en un repo público. */
window.GENZ_CONFIG = {
  // Dominio público de la API (sin slash final); la app llama a `${API_BASE}/api/v3/...`.
  // Ajusta si tu dominio difiere. Con API_KEY vacío, la vista por defecto sigue siendo estática.
  API_BASE: "https://api.databolico.com",
  // Key pública del explorer (plan Pro) embebida a propósito para que la demo cargue EN VIVO
  // sin pasos. Es de bajo riesgo y rotable: si se abusa, regenérala con `manage create-key`.
  API_KEY: "gzv3_dbe7ef07f905_JFkfatywJ7vIrO_bdYI3FLQL7NjMCD0PcfDel7gxuCQ",
  // Tamaño de muestra a pedir en vivo (limitado por el plan de la API key).
  LIVE_SAMPLE_SIZE: 500,
};
