/**
 * Cernion API Client — mit konfigurierbarer API + Quartier-Demo-Fallback
 */

// --- Fallback Demo Data: Quartier Grünfeld-SÜd ---
var DEMO_MELos = [
  {
    meloId: "melo-quartier-whg",
    name: "Quartier Wohnungen (40 WE, H0)",
    type: "virtual",
    metadata: {
      einheiten: 40,
      typ: "wohnung",
      jahresverbrauchKwh: 140000,
      profileId: "H0",
      quartier: "Grünfeld-SÜd",
      capacityKw: 80
    }
  },
  {
    meloId: "melo-quartier-wp",
    name: "Wärmepumpen (20 Stk, G0)",
    type: "virtual",
    metadata: {
      einheiten: 20,
      typ: "waermepumpe",
      jahresverbrauchKwh: 120000,
      profileId: "G0",
      quartier: "Grünfeld-SÜd",
      capacityKw: 60
    }
  },
  {
    meloId: "melo-quartier-wallbox",
    name: "Wallboxen (15 Stk, L0)",
    type: "virtual",
    metadata: {
      einheiten: 15,
      typ: "wallbox",
      jahresverbrauchKwh: 75000,
      profileId: "L0",
      quartier: "Grünfeld-SÜd",
      ladeleistungKw: 11,
      capacityKw: 165
    }
  },
  {
    meloId: "melo-quartier-trafo",
    name: "Transformator Grünfeld-SÜd T1",
    type: "physical",
    metadata: {
      nennleistungKva: 400,
      spannung: "400V/3-phasig",
      quartier: "Grünfeld-SÜd",
      transformatorId: "T1-GRN-2020",
      capacityKw: 400
    }
  }
];

// --- Synthetic Load Profile Generators ---

function generateH0Data(einheiten, date) {
  // BDEW H0 profile: household consumption
  var data = [];
  var annualKwh = 3500 * einheiten;
  var scale = annualKwh / (365 * 96);
  for (var i = 0; i < 96; i++) {
    var hour = i / 4.0;
    var h = String(Math.floor(hour)).padStart(2, '0');
    var m = String((i % 4) * 15).padStart(2, '0');
    var ts = date + "T" + h + ":" + m + ":00Z";
    var base = scale;
    if (hour >= 6 && hour < 9) base *= 2.5;
    else if (hour >= 18 && hour < 22) base *= 2.0;
    else if (hour >= 1 && hour < 5) base *= 0.3;
    else base *= 0.8;
    var noise = (Math.sin(i * 0.3) * 0.1) + 1;
    var val = Math.max(0.5, base * noise * einheiten);
    data.push({ ts: ts, value: Math.round(val * 100) / 100 });
  }
  return data;
}

function generateWPData(einheiten, date, temperature) {
  // Heat pump: high in morning/evening, low at night
  var data = [];
  var baseKw = 2.0 * einheiten; // ~2 kW per heat pump
  for (var i = 0; i < 96; i++) {
    var hour = i / 4.0;
    var h = String(Math.floor(hour)).padStart(2, '0');
    var m = String((i % 4) * 15).padStart(2, '0');
    var ts = date + "T" + h + ":" + m + ":00Z";
    var factor = 0.3;
    if (hour >= 5 && hour < 8) factor = 1.0;
    else if (hour >= 17 && hour < 21) factor = 0.9;
    else if (hour >= 10 && hour < 16) factor = 0.5;
    else if (hour >= 1 && hour < 4) factor = 0.15;
    var tempFactor = temperature < 5 ? 1.3 : (temperature < 10 ? 1.1 : 0.9);
    var val = baseKw * factor * tempFactor * (0.95 + Math.random() * 0.1);
    data.push({ ts: ts, value: Math.round(val * 100) / 100 });
  }
  return data;
}

function generateWallboxData(einheiten, date, scenario) {
  // Wallbox: sharp peaks when cars charge
  var data = [];
  var peakKw = 11.0 * einheiten;
  for (var i = 0; i < 96; i++) {
    var hour = i / 4.0;
    var h = String(Math.floor(hour)).padStart(2, '0');
    var m = String((i % 4) * 15).padStart(2, '0');
    var ts = date + "T" + h + ":" + m + ":00Z";
    var val = 0;
    if (scenario === "worst") {
      // All cars charge simultaneously 18-22h
      if (hour >= 18 && hour <= 22) val = peakKw;
      else if (hour >= 6 && hour <= 8) val = peakKw * 0.3; // some morning charging
    } else if (scenario === "smart") {
      // Smart load shifting: 22h-6h
      if (hour >= 22 || hour <= 6) val = peakKw * 0.6;
      else if (hour >= 17 && hour < 19) val = peakKw * 0.2;
    } else {
      // Balanced: some at work, some at home
      if (hour >= 8 && hour <= 17) val = peakKw * 0.4; // workplace
      else if (hour >= 18 && hour <= 22) val = peakKw * 0.5; // home
    }
    data.push({ ts: ts, value: Math.round(val * 100) / 100 });
  }
  return data;
}

function generateTrafoLoad(dataWHG, dataWP, dataWB) {
  var result = [];
  for (var i = 0; i < 96; i++) {
    var ts = dataWHG[i].ts;
    var total = dataWHG[i].value + dataWP[i].value + dataWB[i].value;
    result.push({ ts: ts, value: Math.round(total * 100) / 100 });
  }
  return result;
}

// Pre-generate demo data for a spring day (15°C)
var DEMO_DATE = "2026-05-12";
var DEMO_TEMP = 15;
var DEMO_SCENARIO = "worst"; // worst-case simultaneous charging

var DEMO_WHG = generateH0Data(40, DEMO_DATE);
var DEMO_WP = generateWPData(20, DEMO_DATE, DEMO_TEMP);
var DEMO_WB = generateWallboxData(15, DEMO_DATE, DEMO_SCENARIO);
var DEMO_TRAFO = generateTrafoLoad(DEMO_WHG, DEMO_WP, DEMO_WB);

var DEMO_TIMESERIES = {
  "melo-quartier-whg": DEMO_WHG,
  "melo-quartier-wp": DEMO_WP,
  "melo-quartier-wallbox": DEMO_WB,
  "melo-quartier-trafo": DEMO_TRAFO
};

// --- API Client ---
var CERNION_CONFIG_KEY = 'cernion.api.config';

class CernionAPI {
  constructor() {
    this.config = this.loadConfig();
    this.config.baseUrl = (this.config.baseUrl || 'https://api.cernion.de/').replace(/\/api\/$/, '').replace(/\/$/, '') + '/';
  }

  loadConfig() {
    try {
      var raw = localStorage.getItem(CERNION_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('Config parse error', e); }
    return {
      baseUrl: 'https://api.cernion.de/',
      tenantId: 'agentic-hackathon',
      token: ''
    };
  }

  saveConfig(cfg) {
    for (var k in cfg) this.config[k] = cfg[k];
    localStorage.setItem(CERNION_CONFIG_KEY, JSON.stringify(this.config));
  }

  get headers() {
    var h = { 'Content-Type': 'application/json', 'x-tenant-id': this.config.tenantId };
    if (this.config.token) h['Authorization'] = 'Bearer ' + this.config.token;
    return h;
  }

  async get(endpoint) {
    var url = this.config.baseUrl + endpoint;
    try {
      var res = await fetch(url, { headers: this.headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    } catch (e) {
      e.isCORS = e.message.indexOf('Failed to fetch') >= 0;
      throw e;
    }
  }

  async post(endpoint, body) {
    var url = this.config.baseUrl + endpoint;
    try {
      var res = await fetch(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    } catch (e) {
      e.isCORS = e.message.indexOf('Failed to fetch') >= 0;
      throw e;
    }
  }

  async listMelos() {
    try { var result = await this.get('api/edm/melos');
      if (!result.data || result.data.length === 0) {
        console.warn('API returned empty tenant, using demo data');
        return { data: DEMO_MELos };
      }
      return result; }
    catch (e) { return { rows: DEMO_MELos }; }
  }

  async getTimeseries(meloId, obis, from, to) {
    try { return await this.get('api/edm/timeseries/' + meloId + '?obis=' + obis + '&from=' + from + '&to=' + to); }
    catch (e) {
      var values = DEMO_TIMESERIES[meloId] || [];
      var vals = values.map(function(v) { return v.value; });
      return {
        success: true, meloId: meloId, obis: obis, from: from, to: to,
        resolution: '15min', values: values,
        summary: {
          count: values.length,
          total_kwh: values.reduce(function(s, v) { return s + v.value / 4; }, 0).toFixed(2),
          min_kw: vals.length ? Math.min.apply(null, vals).toFixed(2) : 0,
          max_kw: vals.length ? Math.max.apply(null, vals).toFixed(2) : 0,
          avg_kw: vals.length ? (vals.reduce(function(s, v) { return s + v; }, 0) / vals.length).toFixed(2) : 0
        }
      };
    }
  }

  async populateSLP(meloId, date, profileId, annualKwh) {
    try {
      return await this.post('api/edm/virtual/populate-slp', {
        meloId: meloId, date: date, profileId: profileId,
        annualConsumptionKwh: annualKwh, overwriteExisting: true
      });
    } catch (e) {
      return { success: true, meloId: meloId, simulated: true, message: "Demo-Daten verwendet" };
    }
  }

  async forecastLoad(meloId, date, profileId, annualKwh, temp) {
    try {
      return await this.post('api/forecast/load', {
        meloId: meloId, date: date, profileId: profileId,
        annualConsumptionKwh: annualKwh, temperatureCelsius: temp
      });
    } catch (e) {
      // Return synthetic data
      var data;
      if (profileId === 'H0') data = generateH0Data(Math.round(annualKwh / 3500), date);
      else if (profileId === 'G0') data = generateWPData(Math.round(annualKwh / 6000), date, temp || 12);
      else data = generateWallboxData(Math.round(annualKwh / 5000), date, 'balanced');
      return {
        success: true, meloId: meloId, profileId: profileId, date: date,
        values: data,
        summary: { totalKwh: data.reduce(function(s, v) { return s + v.value / 4; }, 0).toFixed(2) }
      };
    }
  }
}

var api = new CernionAPI();
