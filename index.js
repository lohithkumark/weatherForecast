/* index.js - Full weather fetch and error handling */
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

/* ---------- Placeholder functions for next commits ---------- */
function renderCurrent(data){}
function renderForecast(forecastData){}
function setUnit(u){}
function showError(msg){}
function showLoading(msg){}
function hideLoading(){}
function clearUIForFetch(){}
