# EASE Dashboard — Multi-Tenant Marketing-Plattform

## Was ist das hier?

Dieses Projekt ist eine **Marketing-Plattform**, die als zentrales Dashboard für Agenturen und deren Kunden dient. Die Vision: Ein Ort, an dem alle Marketing-KPIs, Ad-Daten, Commerce-Metriken und Tools zusammenlaufen — pro Kunde individuell, aber auf einer gemeinsamen Infrastruktur.

Der **Eigentümer** ist Can (Agentur/Consulting). Er betreut mehrere Unternehmen und eigene Brands. Für jedes dieser Unternehmen soll es ein eigenes Dashboard geben, auf das sowohl Can als auch der jeweilige Kunde Zugriff hat.

## Wer nutzt das?

**Can (Agency-Admin):** Sieht alle Kunden-Projekte, kann Integrationen verbinden, KPIs definieren, Kampagnen steuern.

**Kunden (Client-Zugang):** Sehen nur ihr eigenes Projekt. Können KPIs einsehen, Ziele tracken, Hard Costs eintragen, Verbesserungen nachvollziehen — alles an einem Ort, mit Grafiken und klarer Übersicht.

## Die große Vision

Das Dashboard soll langfristig eine vollwertige Marketing-Plattform werden:

- **Zentrale Übersicht** über alle Ad-Accounts und Marketing-/Commerce-Systeme pro Kunde.
- **Kampagnen schalten** direkt aus dem Dashboard heraus (z.B. Meta Ads), ohne in den jeweiligen Ads Manager wechseln zu müssen. Die initialen Setups (Pixel, Ad Account, etc.) werden weiterhin in den nativen Plattformen gemacht, aber das laufende Management (Budgets, Anzeigen ein-/ausschalten, Performance-Übersicht) soll hier passieren.
- **KPI-Tracking mit Zielen:** Pro Kunde definierbare Ziele, Ist-vs-Soll-Vergleiche, Trend-Grafiken.
- **Kosten-Tracking:** Kunden können Hard Costs (z.B. Produktion, Influencer) selbst eintragen.
- **Multi-Tenant:** Eine Instanz, viele Organisationen/Projekte. Jeder Kunde sieht nur seine Daten.

## Der aktuelle Stand (MVP)

Der erste reale Baustein ist das **EASE Nervensystem-Quiz** — ein Shopify-basiertes Quiz (Liquid Section) für die Brand EASE. Das Quiz hat 7 Fragen, eine Lade-Animation, ein E-Mail-Gate und eine personalisierte Ergebnis-Seite mit Akupressurpunkt-Empfehlungen.

**Was bereits gebaut ist:**

- Next.js 14 App (App Router) mit Tailwind CSS
- Dashboard-UI mit Demo-Daten: Quiz-Completion-Funnel, Lead-Metriken (Stress-Verteilung, Symptome, Wünsche), Zeittrends (Submissions/Tag), letzte Submissions als Tabelle
- Webhook-Endpoint (`POST /api/webhooks/quiz`) zum Empfangen von Quiz-Daten aus Shopify
- Funnel-Tracking-Endpoint (`PUT /api/webhooks/quiz`) für Step-by-Step Drop-off Analyse
- Vollständiges PostgreSQL-Schema (Supabase) mit Multi-Tenant-Struktur und Row Level Security
- Recharts-basierte Chart-Komponenten (wiederverwendbar)

**Was noch NICHT verbunden ist:**

- Supabase Auth (Magic Link / Login-Page existiert noch nicht)
- Der Shopify-Quiz-Code sendet noch keinen Webhook an dieses Dashboard
- Alles läuft aktuell mit Demo-Daten (`src/lib/demo-data.js`)

## Warum so aufgebaut?

Die Idee ist: **Ein Kunde (EASE), ein Feature (Quiz) — erst damit alles zum Laufen bringen.** Dann dieses Setup als Framework nehmen und für weitere Kunden wiederverwenden. Das Multi-Tenant-Schema, die Auth-Struktur und die Projekt-Trennung sind von Anfang an eingebaut, damit man nicht später alles umbauen muss.

## Roadmap (Phasen)

### Phase 0 — Fundament (teilweise done)
- [x] Multi-Tenant DB-Schema: `organizations` → `projects` → `organization_members` (Rollen)
- [x] Rollen-Konzept: `super_admin`, `agency_admin`, `client_read`, `client_write`
- [x] Row Level Security auf allen Tabellen
- [ ] Auth: Supabase Auth mit Magic Link (Login-Page, Session-Handling, Middleware)
- [ ] Projekt-Switcher im Dashboard (Org/Projekt-Auswahl)
- [ ] Einladungs-System (Kunden per Link einladen)

### Phase 1 — Quiz-Dashboard für EASE (aktueller Fokus)
- [x] Webhook-Endpoint für Quiz-Submissions
- [x] Funnel-Tracking-Endpoint
- [x] Dashboard-UI mit KPI-Cards, Funnel-Chart, Zeitreihen, Stress-Verteilung, Top-Symptome, Top-Wünsche, letzte Submissions
- [ ] Shopify-Quiz-Code anpassen: Webhook + Funnel-Events an dieses Dashboard senden
- [ ] Demo-Daten durch echte Supabase-Queries ersetzen
- [ ] CSV-Export der Submissions
- [ ] E-Mail-Benachrichtigung bei neuen Leads (optional)

### Phase 2 — Shopify vertiefen
- [ ] Shopify OAuth-Integration (App installieren, Token speichern)
- [ ] Orders + Umsatz pro Projekt abrufen und anzeigen
- [ ] Einfache Kunden-Segmente (z.B. Wiederkäufer, Quiz-Converter)
- [ ] Shopify-Webhooks (Order Created, Customer Created) empfangen

### Phase 3 — Ads-Kanäle (ein Kanal nach dem anderen)
- [ ] **Meta Ads:** OAuth, Token-Refresh, Campaign/AdSet/Ad Reporting, Spend, ROAS, CPM, CPC
- [ ] **Google Ads:** OAuth, Reporting API, Search + Shopping Metriken
- [ ] **TikTok Ads:** OAuth, Reporting, Spend-Metriken
- [ ] Kampagnen-Steuerung aus dem Dashboard (Budgets ändern, Ads pausieren)
- [ ] Kanalübergreifende Übersicht: Total Spend, Total Revenue, Blended ROAS

### Phase 4 — Klaviyo (bewusst später)
- [ ] Zunächst über Zapier/Make als Brücke (Quiz → Klaviyo List)
- [ ] Später: Eigene OAuth-Integration, Flow-Metriken, Campaign-Performance
- [ ] E-Mail-KPIs im Dashboard (Open Rate, Click Rate, Revenue per Email)

### Phase 5 — Plattform-Features
- [ ] Kunden-Portal: Hard Costs eintragen, Ziele definieren, Berichte einsehen
- [ ] Automatische Monats-Reports (PDF-Export oder E-Mail)
- [ ] Verbesserungsvorschläge basierend auf Daten
- [ ] 2FA, Audit-Log
- [ ] DSGVO: Auftragsverarbeitung, Datenminimierung, Löschkonzept

## Tech-Stack

| Komponente | Technologie | Warum |
|---|---|---|
| Frontend + API | **Next.js 14** (App Router) | Full-Stack in einem Projekt, Vercel-optimiert, React Server Components |
| Datenbank + Auth | **Supabase** (PostgreSQL) | Hosted Postgres, eingebaute Auth (Magic Link), Row Level Security, Realtime |
| Charts | **Recharts** | React-native, gut für dashboards, leichtgewichtig |
| Styling | **Tailwind CSS** | Schnell, konsistent, kein CSS-File-Overhead |
| Hosting | **Vercel** | Zero-Config für Next.js, Edge Functions, Preview Deployments |
| Ads-APIs (später) | Meta Marketing API, Google Ads API, TikTok Ads API | Jeweils OAuth + Reporting |

## Datenbank-Schema (Überblick)

```
organizations
  └── projects (one per client/brand)
        ├── integrations (shopify, meta_ads, google_ads, ...)
        ├── quiz_submissions (email, answers, stress_score, tags)
        └── quiz_funnel_events (session_id, step, timestamp)

organization_members (user_id, org_id, role)
```

Vollständiges SQL: `supabase/schema.sql`

## Projekt-Struktur

```
src/
  app/
    page.js                      — Redirect → /dashboard
    layout.js                    — Root Layout (HTML, Fonts, globals.css)
    globals.css                  — Tailwind + Custom Properties
    dashboard/
      page.js                    — Haupt-Dashboard (KPIs, Charts, Tabelle)
    api/
      webhooks/quiz/
        route.js                 — POST: Quiz-Submission speichern
                                   PUT: Funnel-Event tracken
  components/
    KpiCard.js                   — Einzelne KPI-Karte (Wert, Trend, Icon)
    FunnelChart.js               — Horizontaler Bar-Chart für Quiz-Funnel
    TimeSeriesChart.js           — Area-Chart: Submissions über Zeit
    StressDistChart.js           — Bar-Chart: Stress-Score-Verteilung
    HorizontalBarList.js         — Horizontale Balken-Liste (Symptome, Wünsche)
    RecentSubmissions.js         — Tabelle der letzten Quiz-Submissions
  lib/
    supabase-server.js           — Supabase Client (Service Role + Browser)
    demo-data.js                 — Realistische Demo-Daten-Generator
supabase/
  schema.sql                     — Vollständiges DB-Schema mit RLS
```

## Shopify-Quiz (Kontext)

Das EASE Nervensystem-Quiz ist eine Shopify Liquid Section (`ease-nervensystem-quiz.liquid`) mit zugehörigem CSS und JS. Es läuft komplett im Shopify-Theme und hat folgende Struktur:

- **7 Fragen:** Befindlichkeit, Stress-Level (1-5 Emoji-Scale), Dauer, körperliche Symptome (Multi-Select), bisherige Versuche (Multi-Select), Alltags-Einschränkung, größter Wunsch
- **Lade-Animation:** Simulierte Auswertung nach den Fragen
- **E-Mail-Gate:** Nutzer gibt E-Mail ein, wird als Shopify-Customer mit Tags gespeichert
- **Ergebnis-Screen:** Personalisiertes Stress-Profil mit Akupressurpunkt-Empfehlungen und CTA zum Produkt
- **Optional: Webhook** (`quiz_webhook_url` in Section Settings) — sendet JSON mit allen Antworten nach Submit

Der Quiz-Code muss noch angepasst werden, um (a) den Webhook an dieses Dashboard zu senden und (b) Funnel-Events bei jedem Step-Wechsel zu feuern.

## Quick Start (Entwicklung)

```bash
npm install
cp .env.local.example .env.local
# Supabase-Credentials eintragen (oder leer lassen für Demo-Modus)
npm run dev
```

Das Dashboard zeigt unter `http://localhost:3000` automatisch Demo-Daten an, solange keine Supabase-Verbindung besteht.

## Deploy (Vercel)

1. Repo auf GitHub pushen
2. In Vercel importieren
3. Environment Variables setzen (siehe `.env.local.example`)
4. Deploy — fertig

## Wichtige Design-Entscheidungen

- **Dark Theme** mit EASE-Brand-Farben (`#0a0a0a` Background, `#fbf8f1` Text, `#d4a853` Accent/Gold)
- **Demo-Daten als Default:** Das Dashboard funktioniert sofort ohne DB-Anbindung — erleichtert Entwicklung und Demos
- **Multi-Tenant von Tag 1:** Auch wenn aktuell nur ein Projekt (EASE) existiert, ist die DB-Struktur bereits für beliebig viele Organisationen/Projekte ausgelegt
- **Webhook-basiert:** Daten kommen per Webhook rein (nicht per Polling), was für Shopify-Quiz und spätere Integrationen gut skaliert
- **Komponenten wiederverwendbar:** `KpiCard`, `FunnelChart`, `HorizontalBarList` etc. sind generisch und können für jedes Dashboard-Modul (Ads, Shopify, Klaviyo) wiederverwendet werden
