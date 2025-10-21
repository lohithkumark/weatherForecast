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
