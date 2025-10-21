/* index.js - Render current weather and forecast */
const API_KEY = '3a959fdc66b1bd81bc07baeec627fae5';
const MAX_RECENTS = 6;
const RECENTS_KEY = 'wf_recent_cities';

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const selectors = {
  searchInput: $('#search'),
  searchBtn: $('#searchBtn'),
  locBtn: $('#locBtn'),
  cBtn: $('#cBtn'),
  fBtn: $('#fBtn'),
  recentBtn: $('#recentBtn'),
  recentDropdownWrap: document.querySelector('.recent-dropdown'),
  recentList: $('#recentList'),
  alertArea: $('#alertArea'),
  currentSection: $('#current'),
  forecastSection: $('#forecast'),
  cityEl: $('#city'),
  localTimeEl: $('#localTime'),
  tempEl: $('#temp'),
  descEl: $('#desc'),
  iconEl: $('#icon'),
  humidityEl: $('#humidity'),
  windEl: $('#wind'),
  feelsEl: $('#feels'),
  forecastList: $('#forecastList'),
  errorBox: $('#errorBox')
};

let state = { unit: 'metric', lastQuery: null, recents: [] };

/* ---------- Init ---------- */
function init() {
  loadRecents();
  bindEvents();
}
init();

/* ---------- Event Binding ---------- */
function bindEvents(){
  selectors.searchBtn.addEventListener('click', onSearch);
  selectors.searchInput.addEventListener('keydown', e => { if(e.key==='Enter') onSearch(); });
  selectors.locBtn.addEventListener('click', useMyLocation);
  selectors.cBtn.addEventListener('click', ()=>setUnit('metric'));
  selectors.fBtn.addEventListener('click', ()=>setUnit('imperial'));

  selectors.recentBtn.addEventListener('click', e => { e.stopPropagation(); toggleRecentDropdown(); });
  document.addEventListener('click', e => { if(!e.target.closest('.recent-dropdown')) closeRecentDropdown(); });
}

/* ---------- Recent Dropdown ---------- */
function renderRecents(){
  const list = selectors.recentList;
  list.innerHTML = '';
  if(!state.recents.length){
    const li = document.createElement('li');
    li.textContent = 'No recent searches';
    li.style.opacity='0.6';
    list.appendChild(li);
    return;
  }
  state.recents.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.tabIndex = 0;
    li.addEventListener('click', e => { fetchByCity(city); closeRecentDropdown(); });
    li.addEventListener('keydown', e => { if(e.key==='Enter'){ fetchByCity(city); closeRecentDropdown(); } });
    list.appendChild(li);
  });
}

function loadRecents(){
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    state.recents = raw ? JSON.parse(raw) : [];
  } catch(e){ state.recents = []; }
  renderRecents();
}

function addToRecents(city){
  if(!city) return;
  const norm = city.trim();
  state.recents = state.recents.filter(c=>c.toLowerCase()!==norm.toLowerCase());
  state.recents.unshift(norm);
  if(state.recents.length>MAX_RECENTS) state.recents.length = MAX_RECENTS;
  localStorage.setItem(RECENTS_KEY, JSON.stringify(state.recents));
  renderRecents();
}

function toggleRecentDropdown(){
  selectors.recentList.classList.toggle('hidden');
  selectors.recentDropdownWrap.classList.toggle('active');
}

function closeRecentDropdown(){
  selectors.recentList.classList.add('hidden');
  selectors.recentDropdownWrap.classList.remove('active');
}

/* ---------- Search & Geolocation ---------- */
function onSearch(){
  const q = selectors.searchInput.value.trim();
  if(!q) { showError('Please enter a city name'); return; }
  fetchByCity(q);
}

function useMyLocation(){
  if(!navigator.geolocation){ showError('Geolocation not supported'); return; }
  showLoading('Getting location…');
  navigator.geolocation.getCurrentPosition(pos=>{
    fetchByCoords(pos.coords.latitude, pos.coords.longitude);
  }, err => { hideLoading(); showError('Unable to get location'); });
}

/* ---------- Fetching ---------- */
async function fetchByCity(city){
  try{
    clearUIForFetch();
    showLoading('Searching city…');
    const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
    if(!resp.ok){ handleHTTPError(resp); return; }
    const data = await resp.json();
    state.lastQuery = city;
    addToRecents(data.name);
    await fetchFullAndRender(data.coord.lat, data.coord.lon, data.name);
  } catch(e){ hideLoading(); showError(e.message || 'Network error'); }
}

async function fetchByCoords(lat, lon, name=null){
  try{
    clearUIForFetch();
    showLoading('Fetching weather…');
    if(!name){
      try{
        const geoResp = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
        if(geoResp.ok){ const geoData = await geoResp.json(); if(geoData[0]) name = geoData[0].name; }
      } catch(e){}
    }
    state.lastQuery = { lat, lon, name };
    if(name) addToRecents(name);
    await fetchFullAndRender(lat, lon, name);
  } catch(e){ hideLoading(); showError('Failed to fetch weather'); }
}

async function fetchFullAndRender(lat, lon, displayName){
  try{
    const [cwResp,fResp] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
    ]);
    if(!cwResp.ok){ handleHTTPError(cwResp); return; }
    if(!fResp.ok){ handleHTTPError(fResp); return; }
    const cw = await cwResp.json(), forecast = await fResp.json();
    hideLoading();
    renderCurrent(cw);
    renderForecast(forecast);
    selectors.currentSection.classList.remove('hidden');
    selectors.forecastSection.classList.remove('hidden');
  } catch(e){ hideLoading(); showError('Failed to fetch weather'); }
}

function handleHTTPError(resp){
  hideLoading();
  if(resp.status===401) showError('Invalid API key');
  else if(resp.status===404) showError('City not found');
  else showError(`API error ${resp.status}`);
}

/* ---------- Render Current Weather ---------- */
function renderCurrent(data){
  const name = data.name || 'Unknown';
  const utcSec = data.dt;
  const tzSec = data.timezone;
  const localSec = utcSec + tzSec;
  const localDate = new Date(localSec * 1000);

  const h = localDate.getUTCHours().toString().padStart(2,'0');
  const m = localDate.getUTCMinutes().toString().padStart(2,'0');
  const weekday = localDate.toLocaleDateString('en-US',{ weekday:'short' });

  selectors.cityEl.textContent = name;
  selectors.localTimeEl.textContent = `${weekday} ${h}:${m}`;

  let temp = data.main.temp;
  let feels = data.main.feels_like;
  if(state.unit==='imperial'){ temp = cToF(temp); feels=cToF(feels); }

  selectors.tempEl.textContent = `${Math.round(temp)}°${state.unit==='metric'?'C':'F'}`;
  selectors.descEl.textContent = data.weather?.[0]?.description || '—';
  selectors.humidityEl.textContent = data.main.humidity;
  selectors.windEl.textContent = formatWind(data.wind?.speed ?? 0);
  selectors.feelsEl.textContent = `${Math.round(feels)}°${state.unit==='metric'?'C':'F'}`;
  selectors.iconEl.src = data.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : '';

  applyWeatherBackground(data.weather?.[0]?.main?.toLowerCase() || '');
}

/* ---------- Render Forecast ---------- */
function renderForecast(forecastData){
  const groups = {};
  forecastData.list.forEach(item=>{
    const key = new Date(item.dt*1000).toISOString().split('T')[0];
    if(!groups[key]) groups[key]=[];
    groups[key].push(item);
  });
  const keys = Object.keys(groups).slice(0,6);
  const daily = keys.map(k=>{
    const items = groups[k];
    const temps = items.map(i=>i.main.temp);
    const minT = Math.min(...temps), maxT = Math.max(...temps);
    const humidityAvg = Math.round(items.reduce((s,it)=>s+it.main.humidity,0)/items.length);
    const windAvg = items.reduce((s,it)=>s+(it.wind?.speed||0),0)/items.length;
    const mid = items[Math.floor(items.length/2)] || items[0];
    return { date:k, min:minT, max:maxT, humidity:humidityAvg, wind:windAvg, icon:mid.weather?.[0]?.icon, desc:mid.weather?.[0]?.description||'' };
  });

  const todayKey = new Date().toISOString().split('T')[0];
  let toShow = daily.length>5 && daily[0].date===todayKey ? daily.slice(1,6) : daily.slice(0,5);

  selectors.forecastList.innerHTML='';
  toShow.forEach(d=>{
    const dayName = formatDateToDay(d.date);
    const maxDisp = state.unit==='metric'?Math.round(d.max):Math.round(cToF(d.max));
    const minDisp = state.unit==='metric'?Math.round(d.min):Math.round(cToF(d.min));
    const windDisp = formatWind(d.wind);
    selectors.forecastList.innerHTML += `
      <div class="day">
        <div class="day-name">${dayName}</div>
        <div class="day-icon"><img src="${d.icon?`https://openweathermap.org/img/wn/${d.icon}.png`:''}" alt="${d.desc}" /></div>
        <div class="day-temps">Max ${maxDisp}°${state.unit==='metric'?'C':'F'} • Min ${minDisp}°${state.unit==='metric'?'C':'F'}</div>
        <div class="day-meta">Wind: ${windDisp} • Humidity: ${d.humidity}%</div>
      </div>
    `;
  });
}

/* ---------- Utils ---------- */
function cToF(c){ return (c*9)/5+32; }
function formatDateToDay(dateStr){ return new Date(dateStr+'T00:00:00').toLocaleDateString(undefined,{ weekday:'short', month:'short', day:'numeric' }); }
function formatWind(speed){ return state.unit==='metric'?`${roundTo(speed,1)} m/s`:`${roundTo(speed*2.23694,1)} mph`; }
function roundTo(n,d=0){ const p=Math.pow(10,d); return Math.round(n*p)/p; }
function applyWeatherBackground(main){
  document.body.classList.remove('bg-clear','bg-clouds','bg-rain','bg-snow','bg-thunder','bg-mist');
  if(main.includes('clear')) document.body.classList.add('bg-clear');
  else if(main.includes('cloud')) document.body.classList.add('bg-clouds');
  else if(main.includes('rain')||main.includes('drizzle')) document.body.classList.add('bg-rain');
  else if(main.includes('snow')) document.body.classList.add('bg-snow');
  else if(main.includes('thunder')) document.body.classList.add('bg-thunder');
  else document.body.classList.add('bg-mist');
}

/* ---------- Units ---------- */
function setUnit(u){
  if(state.unit===u) return;
  state.unit=u;
  $$('.unit').forEach(b=>b.classList.remove('active'));
  if(u==='metric') selectors.cBtn.classList.add('active'); else selectors.fBtn.classList.add('active');
  if(state.lastQuery){
    if(typeof state.lastQuery==='string') fetchByCity(state.lastQuery);
    else fetchByCoords(state.lastQuery.lat,state.lastQuery.lon,state.lastQuery.name||null);
  }
}

/* ---------- UI Helpers ---------- */
function showLoading(msg='Loading…'){ selectors.alertArea.textContent=msg; selectors.alertArea.classList.remove('hidden'); }
function hideLoading(){ selectors.alertArea.textContent=''; selectors.alertArea.classList.add('hidden'); }
function showError(msg){ selectors.errorBox.textContent=msg; selectors.errorBox.classList.remove('hidden'); setTimeout(()=>selectors.errorBox.classList.add('hidden'),5000); }
function clearUIForFetch(){
  selectors.currentSection.classList.add('hidden');
  selectors.forecastSection.classList.add('hidden');
  selectors.errorBox.classList.add('hidden');
  selectors.alertArea.classList.add('hidden');
}
