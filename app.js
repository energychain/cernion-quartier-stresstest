/**
 * Quartier-Elektro-Stresstest — App Logic (ES5-compatible)
 * Stadtentwickler-Tool für Netzauslastungsprüfung
 */

var chartInstances = {};
var isDemoMode = false;
var currentScenario = 'worst';
var currentTemp = 15;

// ===== Startup =====
document.addEventListener('DOMContentLoaded', function() {
  initSettings();
  setupTabs();
  setupSimulationForm();
  testConnection().then(function(connected) {
    if (!connected) {
      isDemoMode = true;
      var badge = document.getElementById('demo-badge');
      if (badge) badge.style.display = 'block';
    }
    runSimulation();
  });
});

function testConnection() {
  return new Promise(function(resolve) {
    api.get('/openapi.json')
      .then(function() { resolve(true); })
      .catch(function() { resolve(false); });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('nav[aria-label="breadcrumb"] button').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabId) btn.classList.add('active');
  });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

function setupTabs() {
  document.querySelectorAll('nav[aria-label="breadcrumb"] button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchTab(btn.dataset.tab);
    });
  });
}

// ===== Simulation Form =====
function setupSimulationForm() {
  var form = document.getElementById('sim-form');
  if (!form || form._initialized) return;
  form._initialized = true;

  form.onsubmit = function(e) {
    e.preventDefault();
    runSimulation();
  };

  // Scenario buttons
  document.querySelectorAll('.scenario-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.scenario-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentScenario = btn.dataset.scenario;
      runSimulation();
    });
  });
}

function runSimulation() {
  showLoading(true);

  var we = parseInt(document.getElementById('sim-we').value) || 40;
  var wp = parseInt(document.getElementById('sim-wp').value) || 20;
  var wb = parseInt(document.getElementById('sim-wb').value) || 15;
  currentTemp = parseInt(document.getElementById('sim-temp').value) || 15;
  var trafoKva = parseInt(document.getElementById('sim-trafo').value) || 400;

  // Generate synthetic data based on inputs
  var date = '2026-05-12';
  var whgData = generateH0Data(we, date);
  var wpData = generateWPData(wp, date, currentTemp);
  var wbData = generateWallboxData(wb, date, currentScenario);
  var trafoData = [];

  for (var i = 0; i < 96; i++) {
    trafoData.push({
      ts: whgData[i].ts,
      value: whgData[i].value + wpData[i].value + wbData[i].value
    });
  }

  // Calculate metrics
  var trafoKw = trafoData.map(function(v) { return v.value; });
  var peakLoad = Math.max.apply(null, trafoKw);
  var avgLoad = trafoKw.reduce(function(s, v) { return s + v; }, 0) / trafoKw.length;
  var totalKwh = trafoKw.reduce(function(s, v) { return s + v / 4; }, 0);
  var utilization = (peakLoad / trafoKva) * 100;

  var metrics = {
    we: we, wp: wp, wb: wb, temp: currentTemp, trafoKva: trafoKva,
    peakLoad: peakLoad, avgLoad: avgLoad, totalKwh: totalKwh,
    utilization: utilization,
    status: utilization > 100 ? 'overload' : (utilization > 80 ? 'warning' : 'ok')
  };

  renderDashboard(metrics, whgData, wpData, wbData, trafoData);
  renderStackedChart(whgData, wpData, wbData, trafoData);
  renderMetrics(metrics);
  renderFindings(metrics);

  showLoading(false);
}

function renderDashboard(metrics, whg, wp, wb, trafo) {
  var container = document.getElementById('dashboard-cards');
  if (!container) return;
  container.innerHTML = '';

  var statusColor = metrics.status === 'ok' ? '#2a8a2a' : (metrics.status === 'warning' ? '#e8b339' : '#d05050');
  var statusText = metrics.status === 'ok' ? 'Im grünen Bereich' : (metrics.status === 'warning' ? 'Grenzwertig' : 'Überlastung!');

  var kpiHtml = '<div class="grid kpi-grid">' +
    '<article class="kpi-card" style="border-left:4px solid ' + statusColor + '">' +
    '<h3>Trafo-Auslastung</h3>' +
    '<p class="kpi-value" style="color:' + statusColor + '">' + metrics.utilization.toFixed(1) + ' <span>%</span></p>' +
    '<small>' + statusText + '</small></article>' +
    '<article class="kpi-card"><h3>Spitzenlast</h3>' +
    '<p class="kpi-value">' + metrics.peakLoad.toFixed(1) + ' <span>kW</span></p>' +
    '<small>bei ' + metrics.trafoKva + ' kVA Trafo</small></article>' +
    '<article class="kpi-card"><h3>Tagesverbrauch</h3>' +
    '<p class="kpi-value">' + (metrics.totalKwh / 1000).toFixed(2) + ' <span>MWh</span></p>' +
    '<small>Gesamt Quartier</small></article>' +
    '<article class="kpi-card"><h3>Installierte Last</h3>' +
    '<p class="kpi-value">' + metrics.we + '+' + metrics.wp + '+' + metrics.wb + '</p>' +
    '<small>WE+WP+WB</small></article>' +
    '</div>';

  container.innerHTML = kpiHtml;
}

function renderStackedChart(whg, wp, wb, trafo) {
  var canvas = document.getElementById('stacked-chart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var labels = whg.map(function(v) { return v.ts.slice(11, 16); });

  if (chartInstances['stacked']) {
    chartInstances['stacked'].destroy();
  }

  chartInstances['stacked'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Wohnungen (H0)',
          data: whg.map(function(v) { return v.value; }),
          borderColor: '#5a8abf',
          backgroundColor: 'rgba(90, 138, 191, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 3
        },
        {
          label: 'Wärmepumpen',
          data: wp.map(function(v) { return v.value; }),
          borderColor: '#e8b339',
          backgroundColor: 'rgba(232, 179, 57, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 3
        },
        {
          label: 'Wallboxen',
          data: wb.map(function(v) { return v.value; }),
          borderColor: '#d05050',
          backgroundColor: 'rgba(208, 80, 80, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 3
        },
        {
          label: 'Gesamtlast',
          data: trafo.map(function(v) { return v.value; }),
          borderColor: '#ffffff',
          borderDash: [5, 5],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + ' kW'; }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { title: { display: true, text: 'kW' }, beginAtZero: true }
      }
    }
  });
}

function renderMetrics(metrics) {
  var container = document.getElementById('metrics-panel');
  if (!container) return;
  container.style.display = 'block';

  var tableHtml = '<table><thead><tr><th>Verbraucher</th><th>Anzahl</th><th>Spitzenlast</th><th>Anteil</th></tr></thead><tbody>' +
    '<tr><td>Wohnungen (H0)</td><td>' + metrics.we + ' WE</td><td>~' + (metrics.we * 3.5).toFixed(0) + ' kW</td><td>Basislast</td></tr>' +
    '<tr><td>Wärmepumpen</td><td>' + metrics.wp + ' Stk</td><td>~' + (metrics.wp * 2.0).toFixed(0) + ' kW</td><td>Temperatur-abhängig</td></tr>' +
    '<tr><td>Wallboxen</td><td>' + metrics.wb + ' Stk</td><td>~' + (metrics.wb * 11.0).toFixed(0) + ' kW</td><td>' + currentScenario + '-Case</td></tr>' +
    '</tbody></table>';

  container.innerHTML = tableHtml;
}

function renderFindings(metrics) {
  var container = document.getElementById('findings-panel');
  if (!container) return;
  container.style.display = 'block';

  var findings = [];
  if (metrics.utilization > 100) {
    findings.push({ severity: 'error', code: 'OVERLOAD', message: 'Transformator-Überlastung! Spitzenlast ' + metrics.peakLoad.toFixed(1) + ' kW > ' + metrics.trafoKva + ' kVA Nennleistung' });
    findings.push({ severity: 'warning', code: 'SIMULTAN', message: 'Gleichzeitige Volllast aller Wallboxen + Wärmepumpen nicht realistisch — Ladesteuerung (§14a) empfohlen' });
  } else if (metrics.utilization > 80) {
    findings.push({ severity: 'warning', code: 'HIGH_LOAD', message: 'Trafo-Auslastung > 80% — keine Reserve für Zubau' });
  } else {
    findings.push({ severity: 'info', code: 'OK', message: 'Transformator im grünen Bereich. Reserve für ~' + Math.round((metrics.trafoKva - metrics.peakLoad) / 11) + ' weitere Wallboxen vorhanden.' });
  }

  if (metrics.wp > 0 && metrics.temp < 0) {
    findings.push({ severity: 'warning', code: 'WINTER', message: 'Bei Temperaturen < 0°C steigt WP-Verbrauch um ~30% — Auslastung prüfen' });
  }

  var html = '<h3>📋 Prüfergebnisse</h3><ul>';
  findings.forEach(function(f) {
    var cls = f.severity === 'error' ? 'finding-error' : (f.severity === 'warning' ? 'finding-warning' : 'finding-info');
    var icon = f.severity === 'error' ? '❌' : (f.severity === 'warning' ? '⚠️' : '✅');
    html += '<li class="' + cls + '">' + icon + ' <strong>[' + f.code + ']</strong> ' + f.message + '</li>';
  });
  html += '</ul>';
  container.innerHTML = html;
}

// ===== Settings =====
function initSettings() {
  var form = document.getElementById('settings-form');
  if (!form || form._initialized) return;
  form._initialized = true;

  form.onsubmit = function(e) {
    e.preventDefault();
    api.saveConfig({
      baseUrl: document.getElementById('cfg-url').value,
      tenantId: document.getElementById('cfg-tenant').value,
      token: document.getElementById('cfg-token').value
    });
    alert('Einstellungen gespeichert');
  };
}

function loadSettings() {
  document.getElementById('cfg-url').value = api.config.baseUrl;
  document.getElementById('cfg-tenant').value = api.config.tenantId;
  document.getElementById('cfg-token').value = api.config.token;
}

// ===== Utils =====
function showLoading(show) {
  var el = document.getElementById('loading');
  if (el) el.style.display = show ? 'block' : 'none';
}

function showError(msg) {
  var el = document.getElementById('error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}
