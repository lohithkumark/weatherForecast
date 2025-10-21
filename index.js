/* index.js - Setup selectors, state, events, recent cities, search & geolocation */
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

/* ---------- Placeholder functions for next commits ---------- */
function setUnit(u){}
function fetchByCity(city){}
function fetchByCoords(lat, lon, name){}
function showError(msg){}
function showLoading(msg){}
function hideLoading(){}
