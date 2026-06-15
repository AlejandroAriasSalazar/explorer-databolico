/* Configuración por defecto. En producción, edita API_BASE con la URL de tu VPS.
   También se puede configurar en tiempo de ejecución desde el panel de ajustes (⚙️),
   que persiste en localStorage. */
window.GENZ_CONFIG = {
  // Ej.: "https://api.tudominio.com"  (sin slash final). La app llama a `${API_BASE}/api/v3/...`
  API_BASE: "",
  API_KEY: "",
  // Tamaño de muestra a pedir en vivo (limitado por el plan de la API key).
  LIVE_SAMPLE_SIZE: 500,
};
