# Quartier-Elektro-Stresstest

> Stadtentwickler-Tool zur Simulation von Quartierslasten unter Elektrifizierung (Wärmepumpen + E-Mobilität)

**Live-Demo:** [energychain.github.io/cernion-quartier-stresstest](https://energychain.github.io/cernion-quartier-stresstest/)

---

## 1. Der Use Case

### Medien-Anker
> *„Kommunen stemmen sich gegen Wärmepumpen-Verbot, aber der Netzanschluss ist der Flaschenhals"* (Fachpresse 2024)

### Problemstellung
Bei Quartiersneubauten oder Sanierungen mit 50% Wärmepumpen-Anteil und 20+ E-Autos steigt die Spitzenlast dramatisch. Stadtentwickler müssen frühzeitig prüfen, ob der lokale Transformator und die Kabel dimensioniert sind — bevor die Baugenehmigung erteilt wird.

Heute verwenden Planungsbüros Excel-Sheets oder SLP-Prognosen aus verschiedenen Tools. Die Daten liegen fragmentiert vor, die Szenarien sind statisch.

### Alleinstellungsmerkmal
Cernion a²mdm berechnet dynamische Lastprofile aus realen Haushalts- und Erzeugungsdaten, simulating gleichzeitige Volllast-Szenarien und zeigt Transformators-Auslastung in Echtzeit.

---

## 2. Was das Tool zeigt

| Feature | Beschreibung |
|---------|--------------|
| **Quartier-Parameter** | Anzahl Wohneinheiten, WP-Quote, Wallbox-Anzahl, PV-Kapazität |
| **Stresstest-Szenarien** | Normalbetrieb vs. Volllast-Gleichzeitigkeit (kalter Wintertag) |
| **Lastgang-Chart** | 24h-Simulierung mit 15-Min-Auflösung (Hausstrom + WP + E-Mobilität) |
| **Transformator-Ampel** | 🟢 <70% / 🟡 70-90% / 🔴 >90% Auslastung |
| **Szenario-Vergleich** | Jetzt-Zustand vs. Elektrifizierung vs. Netzausbau |
| **KPIs** | Spitzenlast, Jahresenergie, Gleichzeitigkeitsfaktor |
| **Tenant-fähig** | Konfigurierbare API-URL, Tenant-ID und Token |

---

## 3. Technischer Stack

| Schicht | Technologie | Entscheidung |
|---------|-------------|------------|
| Frontend | Vanilla HTML5 + ES5 JavaScript | Zero-Build, jeder Fork läuft sofort |
| Styling | Pico.css (CDN) | Professionell, Dark-Mode, kein Build |
| Charts | Chart.js (CDN) | Industriestandard, keine Toolchain |
| Backend | Cernion a²mdm API | Kein eigenes Backend |
| Hosting | GitHub Pages | Kostenlos, automatisch |
| CI/CD | GitHub Actions | Push → Deploy |

---

## 4. Schnellstart

### Live-Demo
[energychain.github.io/cernion-quartier-stresstest](https://energychain.github.io/cernion-quartier-stresstest/)

### Lokal
```bash
git clone https://github.com/energychain/cernion-quartier-stresstest.git
cd cernion-quartier-stresstest
python3 -m http.server 8080
```

### API-Anbindung
1. Tab **Einstellungen** → API-URL, Tenant-ID eingeben
2. **Verbindung testen**
3. Bei Erfolg → Live-Daten, sonst → Demo-Modus

---

## 5. Cernion-Mehrwert

| Ohne Cernion | Mit Cernion a²mdm |
|---|---|
| Excel-Szenarien, statisch | **Dynamische Lastsimulation** per API-Call |
| Fragmentierte Datenquellen | **Eine API** — Haushalte, WP, E-Mobilität, Netzanschluss |
| Keine Tenant-Isolation | **Kunde sieht nur eigene Quartiersdaten** |
| Manuelle Updates | **Sofortige Neuberechnung** bei Parameteränderung |

---

## 6. Demo-Daten

| Szenario | WE | WP | Wallboxen | PV | Spitzenlast |
|---|---|---|---|---|---|
| Jetzt-Zustand | 120 | 30% | 5 | 200 kWp | 450 kW |
| Elektrifizierung | 120 | 80% | 25 | 500 kWp | 1.200 kW |
| Netzausbau | 120 | 80% | 25 | 800 kWp | 1.200 kW (Trafo: 1.600 kVA) |

**Standort:** Grünfeld-Süd, PLZ 69115

---

## 7. Architektur

```
  ┌─────────────────────────────────────┐
  │  Browser (GitHub Pages)             │
  │  ┌─────────┬─────────┬───────────┐  │
  │  │Szenario │ Lastgang│ Einstell. │  │
  │  └────┬────┴────┬────┴─────┬─────┘  │
  │       │         │          │         │
  │  ┌────▼─────────▼──────────▼────┐    │
  │  │  CernionAPI Class           │    │
  │  │  • Tenant-Header            │    │
  │  │  • Fetch-Wrapper            │    │
  │  │  • Demo-Fallback            │    │
  │  └─────────────┬───────────────┘    │
  └────────────────┼────────────────────┘
                   │ HTTPS
  ┌────────────────▼────────────────────┐
  │  CERNION a²mdm (SaaS)               │
  │  ┌──────────────────────────────┐   │
  │  │  + Multi-Tenancy             │   │
  │  │  + EDM: SLP-Simulation       │   │
  │  │  + Grid-Connection           │   │
  │  │  + Forecast-Engine           │   │
  │  └──────────────────────────────┘   │
  └─────────────────────────────────────┘
```

## Lizenz

GNU Affero General Public License v3 (AGPL-3.0) — siehe [LICENSE](./LICENSE)

---

*Erstellt im Cernion Agentic Hackathon — ein Open-Source-Projekt der energychain.de*
