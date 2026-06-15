# GenZ Colombia · Insights (frontend)

Dashboard **mobile-first** de inteligencia de mercado sobre la población sintética
enriquecida de la **GenZ Colombia API V3**. Muchos gráficos e insights: gustos
musicales, programas de TV, poder adquisitivo, consumo cultural, tecnología y
psicografía — con cross-filtering por territorio, edad y sexo.

Sitio **estático** (sin build): se despliega en Vercel y consume la API V3 que corre
en tu VPS. Trae un **dataset de respaldo** generado con el motor V3 (IPF + cópula) para
que el tablero se vea completo desde el primer momento, incluso antes de conectar la API.

## Estructura

```
frontend/
  index.html      # shell de la app (topbar, filtros, nav inferior)
  styles.css      # sistema de diseño mobile-first (dark, neón)
  app.js          # estado, cross-filter, insights, ~14 gráficos, cliente API
  config.js       # API_BASE / API_KEY por defecto (editable)
  demo-data.js    # dataset de respaldo (1.200 personas, motor V3)
  vercel.json     # estático + headers de seguridad
```

## Vistas

- **Resumen** — KPIs, distribución por edad, música top, segmentos psicográficos, top ciudades, insight de correlación ingreso↔streaming.
- **Cultura** — gustos musicales, TV y cine favoritos, huella cultural (radar), cruce música×región.
- **Economía** — deciles de ingreso, poder adquisitivo, inclusión financiera, streaming según ingreso (gradiente de la cópula).
- **Tech** — smartphone/internet/streaming, red social principal, competencias digitales, curva de adopción, horas en redes por edad.
- **Personas** — tarjetas de personas sintéticas; tocar para ver las 52 variables con su **banda de confianza** y tier.
- **Variables** — diccionario buscable de las 52 variables (tier, fuente, granularidad, método, categorías).

## Desplegar en Vercel

1. Sube esta carpeta `frontend/` a un repo (o `vercel` CLI desde aquí).
2. En Vercel: **New Project** → framework **Other** → *Root Directory* = `frontend`.
   No hay build: Vercel sirve los archivos tal cual.
3. (Opcional) Edita `config.js` con la URL del VPS antes de desplegar, o configúralo
   en tiempo de ejecución desde el botón ⚙️ (se guarda en el navegador).

### Conectar la API en vivo

En el panel ⚙️ (o en `config.js`):

- **API base URL**: `https://api.tudominio.com` (la del VPS, sin slash final).
- **API key**: una clave con scope `enrich:read` (plan Pro/Enterprise).

El front llama a `POST {API_BASE}/api/v3/population/sample` con `enrich: true` y mapea
la respuesta (incluye las bandas de confianza por variable).

### CORS (importante)

La API debe permitir el origen de Vercel. En el VPS, agrega tu dominio a
`CORS_ORIGINS` (variable de entorno de la API V3), por ejemplo:

```
CORS_ORIGINS=["https://tu-proyecto.vercel.app","https://tudominio.com"]
```

## Notas

- Población **sintética**: ninguna persona es real.
- **Tier 2** anclado a marginal local (Censo/MinTIC); **Tier 3** modelado con banda de
  confianza (ECC/GEIH/ENTIC) — verdad regional. El dataset de respaldo es ilustrativo;
  en vivo la API entrega los valores con su intervalo y `truth_granularity`.
- Gráficos con Chart.js (CDN). No usa almacenamiento más allá de `localStorage` para
  recordar tu configuración de API.
