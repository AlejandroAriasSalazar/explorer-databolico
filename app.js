/* GenZ Colombia — Insights frontend (vanilla JS + Chart.js).
   Mobile-first dashboard sobre la población sintética enriquecida de la API V3.
   Fuente de datos: API en vivo (VPS) con respaldo en dataset embebido (motor V3). */
(function () {
"use strict";

// ---------------------------------------------------------------- state
const DEMO = window.GENZ_DEMO;
const CFG = Object.assign({ API_BASE: "", API_KEY: "", LIVE_SAMPLE_SIZE: 500 },
  window.GENZ_CONFIG || {}, loadLS("genz_cfg") || {});
const VARMETA = {}; DEMO.dictionary.forEach(v => VARMETA[v.name] = v);

const PALETTE = ["#ff4d8d","#9b5cff","#22d3ee","#34d399","#fbbf24","#f97316",
                 "#60a5fa","#f472b6","#a78bfa","#2dd4bf","#e879f9","#38bdf8"];
const REGION_NAMES = { bogota:"Bogotá", andina:"Andina", caribe:"Caribe",
  pacifico:"Pacífico", orinoquia:"Orinoquía", amazonia:"Amazonía" };
const DEPT_REGION = {
  "11":"bogota","05":"andina","15":"andina","17":"andina","25":"andina","63":"andina",
  "66":"andina","68":"andina","73":"andina","76":"andina","54":"andina","41":"andina",
  "08":"caribe","13":"caribe","20":"caribe","23":"caribe","44":"caribe","47":"caribe","70":"caribe","88":"caribe",
  "19":"pacifico","27":"pacifico","52":"pacifico",
  "18":"amazonia","86":"amazonia","91":"amazonia","94":"amazonia","95":"amazonia","97":"amazonia",
  "50":"orinoquia","81":"orinoquia","85":"orinoquia","99":"orinoquia" };

const state = {
  source: "demo",
  persons: DEMO.persons.slice(),
  detailed: DEMO.detailed.slice(),
  view: "overview",
  filter: { scope: "all", value: null, label: "Todo el país", ageMin: 0, ageMax: 100, sex: "all" },
};
const charts = {};

// ---------------------------------------------------------------- utils
function $(s, r) { return (r || document).querySelector(s); }
function loadLS(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }
function saveLS(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function pretty(s){ if(s==null) return ""; return String(s).replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
function pct(n,d){ return d? Math.round(n*1000/d)/10 : 0; }
function fmt(n){ return n>=1000? (n/1000).toFixed(n>=10000?0:1)+"k" : String(n); }

function filtered(){
  const f = state.filter;
  return state.persons.filter(p => {
    if (p.age < f.ageMin || p.age > f.ageMax) return false;
    if (f.sex !== "all" && p.sex !== f.sex) return false;
    if (f.scope === "region" && p.region !== f.value) return false;
    if (f.scope === "city" && p.city !== f.value) return false;
    return true;
  });
}
function countBy(rows, key){
  const m = new Map();
  rows.forEach(r => { const v = r[key]; if (v==null) return; m.set(v,(m.get(v)||0)+1); });
  return m;
}
function distribution(rows, varName, {order=true, top=null}={}){
  const meta = VARMETA[varName]; const m = countBy(rows, varName);
  let items;
  if (order && meta && meta.categories){
    items = meta.categories.filter(c=>m.has(c)).map(c=>({label:c,count:m.get(c)}));
    // include zero categories only if few
    if (meta.categories.length<=8) items = meta.categories.map(c=>({label:c,count:m.get(c)||0}));
  } else {
    items = [...m.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count);
  }
  if (top) items = items.slice(0, top);
  const total = rows.length || 1;
  items.forEach(i=>{ i.pct = pct(i.count,total); });
  return items;
}
function ordIndex(varName, val){ const c = VARMETA[varName].categories; const i=c.indexOf(val); return i<0?0:i; }
function meanNum(rows, varName){ if(!rows.length) return 0; let s=0,n=0; rows.forEach(r=>{const v=r[varName]; if(typeof v==="number"){s+=v;n++;}}); return n? s/n:0; }
function rateYes(rows, varName){ if(!rows.length) return 0; let y=0; rows.forEach(r=>{ if(r[varName]==="si") y++; }); return pct(y,rows.length); }
function pearson(a,b){ const n=a.length; if(n<3) return 0; const ma=a.reduce((x,y)=>x+y,0)/n, mb=b.reduce((x,y)=>x+y,0)/n;
  let num=0,da=0,db=0; for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y;} return (da&&db)? num/Math.sqrt(da*db):0; }

// ---------------------------------------------------------------- charts
Chart.defaults.color = "#9a9ab5";
Chart.defaults.font.family = "-apple-system,Segoe UI,Roboto,system-ui,sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.boxHeight = 10;
Chart.defaults.plugins.legend.labels.padding = 12;
const GRID = "rgba(255,255,255,.06)";

function destroyCharts(){ Object.keys(charts).forEach(k=>{ try{charts[k].destroy();}catch(e){} delete charts[k]; }); }
function mk(id, cfg){ const el = document.getElementById(id); if(!el) return; charts[id]=new Chart(el.getContext("2d"), cfg); }

function barChart(id, items, {horizontal=false, color=0, labels=null}={}){
  const lbls = labels || items.map(i=>pretty(i.label));
  const data = items.map(i=>i.count);
  const colors = items.map((_,i)=> PALETTE[(color+i)%PALETTE.length]);
  mk(id,{ type:"bar",
    data:{ labels:lbls, datasets:[{ data, backgroundColor: horizontal? PALETTE[color%PALETTE.length]+"cc": colors,
      borderRadius:6, borderSkipped:false, maxBarThickness:38 }]},
    options:{ indexAxis: horizontal?"y":"x", responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>` ${c.parsed[horizontal?'x':'y']} (${items[c.dataIndex].pct}%)`}}},
      scales:{ x:{grid:{color:horizontal?GRID:"transparent"},ticks:{maxRotation:0,autoSkip:true}},
               y:{grid:{color:horizontal?"transparent":GRID},ticks:{precision:0}}}}});
}
function doughnut(id, items, {color=0}={}){
  mk(id,{ type:"doughnut",
    data:{ labels:items.map(i=>pretty(i.label)),
      datasets:[{ data:items.map(i=>i.count), backgroundColor:items.map((_,i)=>PALETTE[(color+i)%PALETTE.length]),
        borderColor:"#15151f", borderWidth:2, hoverOffset:6 }]},
    options:{ responsive:true, maintainAspectRatio:false, cutout:"62%",
      plugins:{ legend:{position:"right",labels:{font:{size:10.5}}},
        tooltip:{callbacks:{label:c=>` ${pretty(items[c.dataIndex].label)}: ${items[c.dataIndex].pct}%`}}}}});
}
function radarChart(id, labels, values, {color=1}={}){
  const c = PALETTE[color%PALETTE.length];
  mk(id,{ type:"radar",
    data:{ labels, datasets:[{ data:values, backgroundColor:c+"33", borderColor:c, pointBackgroundColor:c, borderWidth:2 }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ r:{ angleLines:{color:GRID}, grid:{color:GRID}, pointLabels:{font:{size:10.5},color:"#c7c7de"},
        ticks:{display:false,maxTicksLimit:4}, suggestedMin:0 }}}});
}
function lineChart(id, labels, values, {color=2,fill=true}={}){
  const c = PALETTE[color%PALETTE.length];
  mk(id,{ type:"line",
    data:{ labels, datasets:[{ data:values, borderColor:c, backgroundColor:c+"22", fill, tension:.35,
      pointRadius:2, pointBackgroundColor:c, borderWidth:2 }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ x:{grid:{color:"transparent"}}, y:{grid:{color:GRID},ticks:{precision:0}}}}});
}
function groupedRate(id, labels, datasets){
  mk(id,{ type:"bar",
    data:{ labels, datasets: datasets.map((d,i)=>({ label:d.label, data:d.data,
      backgroundColor:PALETTE[i%PALETTE.length]+"dd", borderRadius:5, maxBarThickness:26 })) },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:"top"}, tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.parsed.y}%`}}},
      scales:{ x:{grid:{color:"transparent"}}, y:{grid:{color:GRID},ticks:{callback:v=>v+"%"},suggestedMax:100}}}});
}

// ---------------------------------------------------------------- HTML helpers
function card(title, sub, inner){ return `<div class="card"><h3>${title}</h3>${sub?`<div class="sub">${sub}</div>`:""}${inner}</div>`; }
function chartCard(title, sub, id, tall){ return card(title, sub, `<div class="chart-wrap${tall?" tall":""}"><canvas id="${id}"></canvas></div>`); }
function kpi(v,l,t){ return `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div>${t?`<div class="t">${t}</div>`:""}</div>`; }
function insight(ico, html){ return `<div class="insight"><div class="ico">${ico}</div><p>${html}</p></div>`; }
function barlist(items,{unit=""}={}){ const max=Math.max(...items.map(i=>i.count),1);
  return `<div class="barlist">${items.map(i=>`<div class="barrow"><span class="nm">${pretty(i.label)}</span>
    <span class="bartrk"><span class="barfil" style="width:${Math.max(3,i.count/max*100)}%"></span></span>
    <span class="vv">${i.pct}%</span></div>`).join("")}</div>`; }

// ---------------------------------------------------------------- views
function renderOverview(rows){
  const music = distribution(rows,"music_genre_preference",{order:false});
  const seg = distribution(rows,"consumer_psychographic_segment",{order:false});
  const ages = {}; rows.forEach(r=>ages[r.age]=(ages[r.age]||0)+1);
  const ageLabels = Object.keys(ages).map(Number).sort((a,b)=>a-b);
  const cityItems = distribution(rows,"city",{order:false,top:8});
  const medianAge = (()=>{ const a=rows.map(r=>r.age).sort((x,y)=>x-y); return a.length? a[Math.floor(a.length/2)]:0; })();
  const banca = rateYes(rows,"bank_account_holder");
  const smart = rateYes(rows,"smartphone_ownership");
  const topMusic = music[0]||{label:"—",pct:0};
  const topSeg = seg[0]||{label:"—",pct:0};

  const html = `
  ${insight("✨", `<b>${fmt(rows.length)}</b> personas sintéticas en el foco actual · <b>${state.filter.label}</b>, edades ${state.filter.ageMin}–${state.filter.ageMax}${state.filter.sex!=="all"?", "+(state.filter.sex==="F"?"mujeres":"hombres"):""}.`)}
  <div class="kpis" style="margin-top:12px">
    ${kpi(fmt(rows.length),"Personas en foco", state.source==="demo"?"dataset motor V3":"API en vivo")}
    ${kpi(medianAge,"Edad mediana","años")}
    ${kpi(pretty(topMusic.label),"Género musical top",topMusic.pct+"% de la muestra")}
    ${kpi(pretty(topSeg.label),"Segmento dominante",topSeg.pct+"% psicográfico")}
    ${kpi(banca+"%","Bancarizados","tienen cuenta")}
    ${kpi(smart+"%","Con smartphone","penetración")}
  </div>

  <h2 class="section">Pulso cultural y social</h2>
  <div class="grid k2">
    ${chartCard("Gustos musicales","Distribución del género preferido","cMusic")}
    ${chartCard("Segmentos psicográficos","Perfil de consumo derivado","cSeg")}
  </div>
  <div class="grid">
    ${chartCard("Distribución por edad","Personas por año de edad","cAge")}
    ${card("Top ciudades en foco","Participación en la muestra", barlist(cityItems))}
  </div>
  ${insight("📈", overviewInsight(rows))}
  `;
  $("#view-overview").innerHTML = html;
  doughnut("cSeg", seg, {color:1});
  barChart("cMusic", music, {horizontal:false, color:0});
  lineChart("cAge", ageLabels, ageLabels.map(a=>ages[a]), {color:2});
}
function overviewInsight(rows){
  const inc = rows.map(r=>ordIndex("household_income_decile",r.household_income_decile));
  const str = rows.map(r=>r.streaming_video_subscription==="si"?1:0);
  const r = pearson(inc,str);
  const digital = pct(rows.filter(r=>r.digital_skills_index==="alto").length, rows.length);
  return `Ingreso y suscripción a streaming co-mueven (<b>r=${r.toFixed(2)}</b>): a mayor decil, mayor probabilidad de pagar streaming. Además, <b>${digital}%</b> tiene competencias digitales altas.`;
}

function renderCulture(rows){
  const music = distribution(rows,"music_genre_preference",{order:false});
  const tv = distribution(rows,"favorite_tv_genre",{order:false});
  const film = distribution(rows,"favorite_film_genre",{order:false});
  const radarLabels = ["Cine","Conciertos","Lectura","Museos","Videojuegos","Festivales"];
  const radarVals = [
    pct(rows.filter(r=>r.cinema_attendance_frequency!=="nunca").length,rows.length),
    pct(rows.filter(r=>r.live_concert_attendance!=="nunca").length,rows.length),
    pct(rows.filter(r=>typeof r.reading_books_per_year==="number"&&r.reading_books_per_year>0).length,rows.length),
    pct(rows.filter(r=>r.museum_gallery_visits!=="nunca").length,rows.length),
    pct(rows.filter(r=>r.videogame_player==="si").length,rows.length),
    pct(rows.filter(r=>r.cultural_festival_participation==="si").length,rows.length),
  ];
  const avgBooks = meanNum(rows,"reading_books_per_year").toFixed(1);
  const gamers = pct(rows.filter(r=>r.videogame_player==="si").length,rows.length);
  const topMusic = music[0]||{label:"—",pct:0}, topTv = tv[0]||{label:"—",pct:0};
  const html = `
  <div class="kpis">
    ${kpi(pretty(topMusic.label),"Música #1",topMusic.pct+"%")}
    ${kpi(pretty(topTv.label),"TV favorita",topTv.pct+"%")}
    ${kpi(avgBooks,"Libros/año","promedio")}
    ${kpi(gamers+"%","Gamers","juegan videojuegos")}
  </div>
  <h2 class="section">Música, pantallas y lectura</h2>
  <div class="grid k2">
    ${chartCard("Gustos musicales","Género preferido","cMusic2")}
    ${chartCard("Programas de TV favoritos","Género de TV","cTv")}
  </div>
  <div class="grid k2">
    ${chartCard("Cine favorito","Género de película","cFilm")}
    ${chartCard("Huella cultural","% que participa en cada actividad","cRadar",true)}
  </div>
  ${insight("🎭", cultureInsight(rows))}
  `;
  $("#view-culture").innerHTML = html;
  barChart("cMusic2", music, {color:0});
  barChart("cTv", tv, {horizontal:true, color:4});
  doughnut("cFilm", film, {color:6});
  radarChart("cRadar", radarLabels, radarVals, {color:2});
}
function cultureInsight(rows){
  // compare music top by region within filtered set
  const byReg = {};
  rows.forEach(r=>{ (byReg[r.region]=byReg[r.region]||[]).push(r.music_genre_preference); });
  let best=null;
  Object.entries(byReg).forEach(([reg,arr])=>{
    const m=new Map(); arr.forEach(g=>m.set(g,(m.get(g)||0)+1));
    const top=[...m.entries()].sort((a,b)=>b[1]-a[1])[0];
    if(top && (!best || top[1]/arr.length>best.share)) best={reg,genre:top[0],share:top[1]/arr.length};
  });
  if(!best) return "Sin datos suficientes para el cruce regional.";
  return `En la región <b>${REGION_NAMES[best.reg]||best.reg}</b>, <b>${pretty(best.genre)}</b> es el género más fuerte (${Math.round(best.share*100)}%). Los gustos musicales se modelan con cópula condicionada a edad y región (Tier 3, ECC).`;
}

function renderEconomy(rows){
  const inc = distribution(rows,"household_income_decile",{order:true});
  const power = distribution(rows,"purchasing_power_band",{order:true});
  const emp = distribution(rows,"employment_status",{order:false});
  // streaming rate by income decile (correlation as a trend)
  const decLabels = VARMETA.household_income_decile.categories;
  const rateByDec = decLabels.map(d=>{
    const sub = rows.filter(r=>r.household_income_decile===d);
    return { d, n:sub.length, rate: rateYes(sub,"streaming_video_subscription") };
  });
  const banca = rateYes(rows,"bank_account_holder");
  const credit = rateYes(rows,"credit_card_holder");
  const digitalPay = rateYes(rows,"digital_payment_use");
  const informal = pct(rows.filter(r=>r.informality_status==="informal").length, rows.length);
  const inclLabels = ["Cuenta bancaria","Tarjeta crédito","Pago digital"];
  const inclVals = [banca, credit, digitalPay];
  const html = `
  <div class="kpis">
    ${kpi(banca+"%","Bancarizados","cuenta bancaria")}
    ${kpi(digitalPay+"%","Pagos digitales","los usan")}
    ${kpi(informal+"%","Informalidad","empleo informal")}
    ${kpi(credit+"%","Tarjeta crédito","la tienen")}
  </div>
  <h2 class="section">Poder adquisitivo</h2>
  <div class="grid k2">
    ${chartCard("Deciles de ingreso","Distribución del hogar","cInc")}
    ${chartCard("Poder adquisitivo","Banda declarada","cPow")}
  </div>
  <div class="grid">
    ${chartCard("Inclusión financiera","% con cada producto","cIncl")}
    ${chartCard("Streaming según ingreso","% suscrito a video por decil","cStr")}
  </div>
  ${insight("💡", economyInsight(rows, rateByDec))}
  `;
  $("#view-economy").innerHTML = html;
  barChart("cInc", inc, {color:3});
  doughnut("cPow", power, {color:5});
  barChart("cIncl", inclLabels.map((l,i)=>({label:l,count:inclVals[i],pct:inclVals[i]})), {horizontal:true,color:4});
  // streaming by decile as line
  lineChart("cStr", decLabels, rateByDec.map(x=>x.rate), {color:0});
}
function economyInsight(rows, rateByDec){
  const low = rateByDec.slice(0,3).filter(x=>x.n).reduce((a,x)=>a+x.rate,0)/Math.max(1,rateByDec.slice(0,3).filter(x=>x.n).length);
  const high = rateByDec.slice(7).filter(x=>x.n).reduce((a,x)=>a+x.rate,0)/Math.max(1,rateByDec.slice(7).filter(x=>x.n).length);
  return `Brecha de consumo: el streaming pasa de ~<b>${Math.round(low)}%</b> en los deciles bajos a ~<b>${Math.round(high)}%</b> en los altos. El gradiente es la firma de la cópula que liga ingreso, pagos digitales y consumo (Tier 3, GEIH/ENTIC).`;
}

function renderTech(rows){
  const smart = rateYes(rows,"smartphone_ownership");
  const inet = rateYes(rows,"internet_access_home");
  const sv = rateYes(rows,"streaming_video_subscription");
  const sm = rateYes(rows,"streaming_music_subscription");
  const platform = distribution(rows,"primary_social_platform",{order:false});
  const skills = distribution(rows,"digital_skills_index",{order:true});
  const adopter = distribution(rows,"early_adopter_index",{order:true});
  // social media hours by age band (whole population, mirrors the engine's age bands)
  const bands=[["0-11",0,11],["12-17",12,17],["18-24",18,24],["25-34",25,34],["35-49",35,49],["50+",50,100]];
  const smhByBand = bands.map(([lbl,a,b])=>{
    const sub=rows.filter(r=>r.age>=a&&r.age<=b); return meanNum(sub,"social_media_hours_day");
  });
  const html = `
  <div class="kpis">
    ${kpi(smart+"%","Smartphone","penetración")}
    ${kpi(inet+"%","Internet hogar","acceso")}
    ${kpi(sv+"%","Streaming video","suscritos")}
    ${kpi(sm+"%","Streaming música","suscritos")}
  </div>
  <h2 class="section">Vida digital</h2>
  <div class="grid k2">
    ${chartCard("Red social principal","Plataforma #1 declarada","cPlat")}
    ${chartCard("Competencias digitales","Nivel auto-derivado","cSkill")}
  </div>
  <div class="grid k2">
    ${chartCard("Curva de adopción","Índice de early adopter","cAdopt")}
    ${chartCard("Horas en redes / día","Promedio por edad","cSmh")}
  </div>
  ${insight("📲", techInsight(rows, platform))}
  `;
  $("#view-tech").innerHTML = html;
  doughnut("cPlat", platform, {color:0});
  barChart("cSkill", skills, {color:3});
  barChart("cAdopt", adopter, {horizontal:true, color:1});
  lineChart("cSmh", bands.map(b=>b[0]), smhByBand.map(v=>Math.round(v*10)/10), {color:2});
}
function techInsight(rows, platform){
  const top = platform[0]||{label:"—",pct:0};
  const young = rows.filter(r=>r.age<=17);
  const yp = distribution(young,"primary_social_platform",{order:false})[0];
  return `<b>${pretty(top.label)}</b> domina como red principal (${top.pct}%).${yp?` En menores de 18, <b>${pretty(yp.label)}</b> lidera (${yp.pct}%).`:""} Variables de tecnología (Tier 3, ENTIC) — verdad departamental, entregadas con banda de confianza.`;
}

function renderPeople(){
  const sample = state.detailed.length? state.detailed : [];
  // also pick a few quick rows from current filter
  const rows = filtered();
  const quick = rows.slice(0,8);
  const html = `
  ${insight("🧬", "Cada persona es una extracción reproducible: misma <b>seed</b> + versión de modelo ⇒ misma persona multivariable. Toca una tarjeta para ver su bloque enriquecido con bandas de confianza.")}
  <h2 class="section">Personas con detalle (bandas)</h2>
  <div class="grid" id="detailedList">${sample.map((d,i)=>personaCard(d,i)).join("")}</div>
  <h2 class="section">Muestra rápida del foco actual</h2>
  <div class="grid k2">${quick.map(q=>quickCard(q)).join("")}</div>
  `;
  $("#view-people").innerHTML = html;
  $("#detailedList").addEventListener("click", e=>{
    const c = e.target.closest(".persona"); if(c) c.classList.toggle("open");
  });
}
function initials(sex){ return sex==="F"?"♀":"♂"; }
function personaCard(d,i){
  const m=d.meta; const a=d.attributes;
  const key=["music_genre_preference","favorite_tv_genre","household_income_decile","primary_social_platform","consumer_psychographic_segment","socioeconomic_stratum"];
  const tags=key.map(k=>`<span class="tag"><span class="k">${shortName(k)}</span>${pretty(a[k].value)}</span>`).join("");
  const attrs=Object.entries(a).map(([k,v])=>{
    const conf=Math.round((v.confidence||0)*100);
    return `<div class="attr"><span class="an">${shortName(k)} <span class="tierb t${v.tier}">T${v.tier}</span></span>
      <span class="av">${pretty(v.value)}</span>
      <span class="conf"><i style="width:${conf}%"></i></span></div>`;
  }).join("");
  return `<div class="persona" data-i="${i}">
    <div class="head"><div class="avatar">${initials(m.sex)}</div>
      <div><div style="font-weight:700">${m.age} años · ${m.city}</div>
      <div class="meta">${REGION_NAMES[m.region]||m.region} · toca para ver 52 variables</div></div></div>
    <div class="tags">${tags}</div>
    <div class="attrs">${attrs}</div>
  </div>`;
}
function quickCard(q){
  return `<div class="persona"><div class="head"><div class="avatar">${initials(q.sex)}</div>
    <div><div style="font-weight:700">${q.age} · ${q.city}</div><div class="meta">${pretty(q.consumer_psychographic_segment)}</div></div></div>
    <div class="tags">
      <span class="tag"><span class="k">🎵</span>${pretty(q.music_genre_preference)}</span>
      <span class="tag"><span class="k">📺</span>${pretty(q.favorite_tv_genre)}</span>
      <span class="tag"><span class="k">💳</span>decil ${q.household_income_decile}</span>
    </div></div>`;
}
function shortName(k){ const map={
  music_genre_preference:"Música",favorite_tv_genre:"TV",favorite_film_genre:"Cine",
  household_income_decile:"Ingreso (decil)",primary_social_platform:"Red social",
  consumer_psychographic_segment:"Segmento",socioeconomic_stratum:"Estrato",
  education_level:"Educación",purchasing_power_band:"Poder adq.",early_adopter_index:"Adopción",
  digital_skills_index:"Comp. digital",streaming_video_subscription:"Streaming video"};
  return map[k]||pretty(k); }

function renderDict(){
  const domains = DEMO.domains;
  const html = `
  <div style="margin:8px 0 12px"><input class="search" id="dictSearch" placeholder="Buscar variable, fuente o dominio…"/></div>
  <div class="chips" id="domChips" style="margin-bottom:10px">
    <button class="chip active" data-dom="all">Todas (52)</button>
    ${Object.entries(domains).map(([k,v])=>`<button class="chip" data-dom="${k}">${k} · ${v.split("(")[0].trim()}</button>`).join("")}
  </div>
  <div class="grid" id="dictList"></div>`;
  $("#view-dict").innerHTML = html;
  let dom="all", q="";
  const draw=()=>{
    const list = DEMO.dictionary.filter(v=>{
      if(dom!=="all" && v.domain!==dom) return false;
      if(q){ const s=(v.name+" "+v.source+" "+v.domain_label).toLowerCase(); if(!s.includes(q)) return false; }
      return true;
    });
    $("#dictList").innerHTML = list.map(v=>`<div class="dictrow">
      <div class="r1"><span class="nm">${pretty(v.name)}</span><span class="tierb t${v.tier}">TIER ${v.tier}</span></div>
      <div class="src">${v.source} · ${v.truth_granularity} · método ${v.method}</div>
      ${v.categories?`<div class="cats">${v.categories.map(pretty).join(" · ")}</div>`:`<div class="cats">numérico (${v.unit||""})</div>`}
    </div>`).join("") || `<div class="card muted">Sin coincidencias.</div>`;
  };
  draw();
  $("#dictSearch").addEventListener("input",e=>{ q=e.target.value.trim().toLowerCase(); draw(); });
  $("#domChips").addEventListener("click",e=>{ const b=e.target.closest("[data-dom]"); if(!b)return;
    [...$("#domChips").children].forEach(c=>c.classList.remove("active")); b.classList.add("active"); dom=b.dataset.dom; draw(); });
}

// ---------------------------------------------------------------- render dispatch
function render(){
  destroyCharts();
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $("#view-"+state.view).classList.remove("hidden");
  const rows = filtered();
  if(state.view==="overview") renderOverview(rows);
  else if(state.view==="culture") renderCulture(rows);
  else if(state.view==="economy") renderEconomy(rows);
  else if(state.view==="tech") renderTech(rows);
  else if(state.view==="people") renderPeople();
  else if(state.view==="dict") renderDict();
  updateChips();
  $("#foot").innerHTML = `Fuente: ${state.source==="demo"?"dataset de respaldo (motor V3, ilustrativo)":"API V3 en vivo"} · modelo ${DEMO.model_version} · ${fmt(state.persons.length)} personas cargadas.<br/>Tier 2 anclado (Censo/MinTIC) · Tier 3 modelado con banda (ECC/GEIH/ENTIC). Población sintética: ninguna persona es real.`;
}

function updateChips(){
  $("#fTerr").textContent = state.filter.label;
  $("#fAge").textContent = `${state.filter.ageMin}–${state.filter.ageMax}`;
  $("#fSex").textContent = state.filter.sex==="all"?"Todos":(state.filter.sex==="F"?"Mujeres":"Hombres");
  $("#srcBadge").className = "badge "+(state.source==="demo"?"demo":"live");
  $("#srcBadge").innerHTML = `<span class="led"></span>${state.source==="demo"?"DEMO":"EN VIVO"}`;
}

// ---------------------------------------------------------------- sheets
function openSheet(title, bodyHTML, onMount){
  const root=$("#sheetRoot");
  root.innerHTML=`<div class="sheet-bg"><div class="sheet"><div class="grab"></div><h3>${title}</h3>${bodyHTML}</div></div>`;
  const bg=$(".sheet-bg",root);
  bg.addEventListener("click",e=>{ if(e.target===bg) root.innerHTML=""; });
  if(onMount) onMount(root);
}
function closeSheet(){ $("#sheetRoot").innerHTML=""; }

function territorySheet(){
  const regions = Object.keys(REGION_NAMES);
  const cities = [...new Set(state.persons.map(p=>p.city))].sort();
  openSheet("Territorio", `
    <div class="field"><label>Región</label>
      <select id="selRegion"><option value="">Todas</option>${regions.map(r=>`<option value="${r}">${REGION_NAMES[r]}</option>`).join("")}</select></div>
    <div class="field"><label>Ciudad</label>
      <select id="selCity"><option value="">Todas</option>${cities.map(c=>`<option value="${c}">${c}</option>`).join("")}</select></div>
    <button class="btn" id="applyTerr">Aplicar</button>
    <button class="btn ghost" id="clearTerr" style="margin-top:8px">Todo el país</button>
  `, root=>{
    if(state.filter.scope==="region") $("#selRegion",root).value=state.filter.value;
    if(state.filter.scope==="city") $("#selCity",root).value=state.filter.value;
    $("#applyTerr",root).onclick=()=>{
      const reg=$("#selRegion",root).value, city=$("#selCity",root).value;
      if(city){ state.filter.scope="city"; state.filter.value=city; state.filter.label=city; }
      else if(reg){ state.filter.scope="region"; state.filter.value=reg; state.filter.label=REGION_NAMES[reg]; }
      else { state.filter.scope="all"; state.filter.value=null; state.filter.label="Todo el país"; }
      closeSheet(); render();
    };
    $("#clearTerr",root).onclick=()=>{ state.filter.scope="all"; state.filter.value=null; state.filter.label="Todo el país"; closeSheet(); render(); };
  });
}
function ageSheet(){
  openSheet("Rango de edad", `
    <div class="row2">
      <div class="field"><label>Mínima</label><input id="aMin" type="number" min="0" max="100" value="${state.filter.ageMin}"/></div>
      <div class="field"><label>Máxima</label><input id="aMax" type="number" min="0" max="100" value="${state.filter.ageMax}"/></div>
    </div>
    <div class="chips" style="margin-bottom:12px">
      ${[["Toda",0,100],["Gen Z",12,28],["Niñez 0–11",0,11],["18–24",18,24],["25–34",25,34],["35–49",35,49],["50+",50,100]].map(p=>`<button class="chip" data-a="${p[1]}-${p[2]}">${p[0]}</button>`).join("")}
    </div>
    <button class="btn" id="applyAge">Aplicar</button>
  `, root=>{
    $$(".chip[data-a]",root).forEach(b=>b.onclick=()=>{ const [a,b2]=b.dataset.a.split("-"); $("#aMin",root).value=a; $("#aMax",root).value=b2; });
    $("#applyAge",root).onclick=()=>{
      let mn=+$("#aMin",root).value||0, mx=+$("#aMax",root).value||100;
      mn=Math.max(0,Math.min(100,mn)); mx=Math.max(0,Math.min(100,mx)); if(mn>mx)[mn,mx]=[mx,mn];
      state.filter.ageMin=mn; state.filter.ageMax=mx; closeSheet(); render();
    };
  });
}
function $$(s,r){ return [...(r||document).querySelectorAll(s)]; }
function sexSheet(){
  openSheet("Sexo", `
    <div class="seg" id="sexSeg" style="margin-bottom:14px">
      <button data-s="all" class="${state.filter.sex==='all'?'active':''}">Todos</button>
      <button data-s="F" class="${state.filter.sex==='F'?'active':''}">Mujeres</button>
      <button data-s="M" class="${state.filter.sex==='M'?'active':''}">Hombres</button>
    </div>
    <button class="btn" id="applySex">Aplicar</button>
  `, root=>{
    let val=state.filter.sex;
    $$("#sexSeg button",root).forEach(b=>b.onclick=()=>{ $$("#sexSeg button",root).forEach(x=>x.classList.remove("active")); b.classList.add("active"); val=b.dataset.s; });
    $("#applySex",root).onclick=()=>{ state.filter.sex=val; closeSheet(); render(); };
  });
}
function settingsSheet(){
  openSheet("Conexión a la API en vivo", `
    <p class="muted small" style="margin:-6px 0 14px">El frontend (Vercel) consume la API V3 del VPS. Configura la URL base y tu API key (plan Pro/Enterprise con scope <b>enrich:read</b>).</p>
    <div class="field"><label>API base URL</label><input id="cfgBase" placeholder="https://api.tudominio.com" value="${CFG.API_BASE||""}"/></div>
    <div class="field"><label>API key (X-API-Key)</label><input id="cfgKey" placeholder="gzv3_..." value="${CFG.API_KEY||""}"/></div>
    <div class="field"><label>Tamaño de muestra en vivo</label><input id="cfgN" type="number" min="50" max="1000" value="${CFG.LIVE_SAMPLE_SIZE||500}"/></div>
    <button class="btn" id="cfgLoad">Guardar y cargar en vivo</button>
    <button class="btn ghost" id="cfgDemo" style="margin-top:8px">Volver al dataset de respaldo</button>
    <p class="muted small" style="margin-top:14px">Nota CORS: en el VPS agrega tu dominio de Vercel a <b>CORS_ORIGINS</b>.</p>
  `, root=>{
    $("#cfgLoad",root).onclick=()=>{
      CFG.API_BASE=$("#cfgBase",root).value.trim().replace(/\/$/,"");
      CFG.API_KEY=$("#cfgKey",root).value.trim();
      CFG.LIVE_SAMPLE_SIZE=Math.max(50,Math.min(1000,+$("#cfgN",root).value||500));
      saveLS("genz_cfg",{API_BASE:CFG.API_BASE,API_KEY:CFG.API_KEY,LIVE_SAMPLE_SIZE:CFG.LIVE_SAMPLE_SIZE});
      closeSheet(); loadLive();
    };
    $("#cfgDemo",root).onclick=()=>{ state.source="demo"; state.persons=DEMO.persons.slice(); state.detailed=DEMO.detailed.slice(); closeSheet(); toast("Mostrando dataset de respaldo"); render(); };
  });
}

// ---------------------------------------------------------------- live API
async function loadLive(){
  if(!CFG.API_BASE || !CFG.API_KEY){ toast("Configura URL y API key primero"); settingsSheet(); return; }
  toast("Cargando datos en vivo…");
  const f=state.filter;
  const body={ filters:{ age_min:f.ageMin, age_max:f.ageMax }, sample_size:CFG.LIVE_SAMPLE_SIZE, seed:2026, enrich:true };
  if(f.sex!=="all") body.filters.sex=f.sex;
  if(f.scope==="city"){ const p=state.persons.find(x=>x.city===f.value); if(p) body.filters.municipality_code=p.code; }
  try{
    const res=await fetch(`${CFG.API_BASE}/api/v3/population/sample`,{
      method:"POST", headers:{ "Content-Type":"application/json", "X-API-Key":CFG.API_KEY }, body:JSON.stringify(body) });
    if(!res.ok){ throw new Error("HTTP "+res.status); }
    const data=await res.json();
    const rows=(data.persons||[]).map(mapLivePerson);
    if(!rows.length) throw new Error("respuesta vacía");
    state.persons=rows; state.source="live";
    state.detailed=(data.persons||[]).slice(0,6).map(p=>({ meta:{age:p.age,sex:p.sex,city:p.municipality_name,region:DEPT_REGION[(p.municipality_code||"").slice(0,2)]||"andina"}, attributes:p.enrichment||{} }));
    toast(`✓ ${rows.length} personas en vivo`); render();
  }catch(err){
    toast("No se pudo conectar ("+err.message+"). Mostrando respaldo.");
    state.source="demo"; render();
  }
}
function mapLivePerson(p){
  const row={ id:(p.synthetic_id||"").slice(0,14), age:p.age, sex:p.sex, city:p.municipality_name,
    code:p.municipality_code, region:DEPT_REGION[(p.municipality_code||"").slice(0,2)]||"andina" };
  const e=p.enrichment||{};
  Object.keys(e).forEach(k=>{ row[k]=e[k].value; });
  return row;
}

// ---------------------------------------------------------------- toast & events
let toastT;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2600); }

function bind(){
  $("#nav").addEventListener("click",e=>{ const b=e.target.closest("button[data-view]"); if(!b)return;
    $$("#nav button").forEach(x=>x.classList.remove("active")); b.classList.add("active");
    state.view=b.dataset.view; window.scrollTo({top:0,behavior:"smooth"}); render(); });
  $("#filterChips").addEventListener("click",e=>{ const b=e.target.closest("[data-filter]"); if(!b)return;
    const f=b.dataset.filter;
    if(f==="territory") territorySheet(); else if(f==="age") ageSheet();
    else if(f==="sex") sexSheet(); else if(f==="live") loadLive(); });
  $("#openSettings").addEventListener("click",settingsSheet);
}

// ---------------------------------------------------------------- init
bind();
render();
if(CFG.API_BASE && CFG.API_KEY) loadLive(); // si ya hay config, intenta en vivo

})();
