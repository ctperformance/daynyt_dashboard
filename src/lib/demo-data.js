// ============================================================
// Demo data generator – used when Supabase is not connected
// Generates realistic quiz submission + funnel data
// ============================================================

import { subDays, format, addHours } from 'date-fns';

const SYMPTOMS = [
  'Verspannungen im Nacken',
  'Kopfschmerzen',
  'Schlafprobleme',
  'Magenprobleme',
  'Herzrasen',
  'Kieferverspannung',
  'Kalte Hände/Füße',
];

const TRIED = [
  'Meditation',
  'Sport',
  'Atemübungen',
  'Therapie',
  'Nahrungsergänzung',
  'Nichts bisher',
];

const Q1_OPTIONS = [
  'Ständig angespannt',
  'Erschöpft & ausgebrannt',
  'Gereizt & überfordert',
  'Kann nicht abschalten',
  'Fühle mich okay, aber nicht gut',
];

const Q3_OPTIONS = ['Seit ein paar Tagen', 'Seit Wochen', 'Seit Monaten', 'Seit Jahren', 'Schon immer'];
const Q6_OPTIONS = ['Kaum', 'Etwas', 'Deutlich', 'Sehr stark', 'Es dominiert alles'];
const Q7_OPTIONS = [
  'Besser schlafen',
  'Weniger Anspannung',
  'Mehr Energie',
  'Innere Ruhe',
  'Schmerzfrei sein',
];

const STEPS = ['intro', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'loading', 'email', 'result'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickMulti(arr, min = 1, max = 3) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateDemoSubmissions(days = 30, perDay = { min: 3, max: 15 }) {
  const submissions = [];
  for (let d = 0; d < days; d++) {
    const date = subDays(new Date(), d);
    const count = rand(perDay.min, perDay.max);
    for (let i = 0; i < count; i++) {
      const stressLevel = rand(1, 5);
      const stressScore = Math.min(100, rand(15, 30) + stressLevel * 15 + rand(-5, 10));
      submissions.push({
        id: `demo-${d}-${i}`,
        email: `user${d * 100 + i}@example.com`,
        q1_answer: pick(Q1_OPTIONS),
        q2_answer: stressLevel,
        q3_answer: pick(Q3_OPTIONS),
        q4_answers: pickMulti(SYMPTOMS, 1, 4),
        q5_answers: pickMulti(TRIED, 1, 3),
        q6_answer: pick(Q6_OPTIONS),
        q7_answer: pick(Q7_OPTIONS),
        stress_score: stressScore,
        tags: ['nervensystem-check', `stress-${stressScore}`],
        submitted_at: addHours(date, rand(6, 23)).toISOString(),
      });
    }
  }
  return submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

export function generateDemoFunnel(days = 30) {
  // Per day: simulate sessions that drop off at various steps
  const dailyData = [];
  for (let d = 0; d < days; d++) {
    const date = subDays(new Date(), d);
    const dateStr = format(date, 'yyyy-MM-dd');
    const totalSessions = rand(20, 80);

    const dropRates = {
      intro: 1.0,
      q1: 0.85 + Math.random() * 0.1,
      q2: 0.75 + Math.random() * 0.1,
      q3: 0.68 + Math.random() * 0.1,
      q4: 0.60 + Math.random() * 0.1,
      q5: 0.55 + Math.random() * 0.08,
      q6: 0.50 + Math.random() * 0.08,
      q7: 0.45 + Math.random() * 0.08,
      loading: 0.42 + Math.random() * 0.06,
      email: 0.38 + Math.random() * 0.06,
      result: 0.30 + Math.random() * 0.08,
    };

    const stepCounts = {};
    for (const step of STEPS) {
      stepCounts[step] = Math.round(totalSessions * dropRates[step]);
    }

    dailyData.push({ date: dateStr, total: totalSessions, steps: stepCounts });
  }
  return dailyData;
}

// Aggregate funnel across all days
export function aggregateFunnel(dailyFunnelData) {
  const totals = {};
  for (const step of STEPS) {
    totals[step] = 0;
  }
  for (const day of dailyFunnelData) {
    for (const step of STEPS) {
      totals[step] += day.steps[step] || 0;
    }
  }
  return STEPS.map((step) => ({
    step,
    label: step === 'intro' ? 'Quiz geöffnet' :
           step === 'email' ? 'E-Mail eingegeben' :
           step === 'result' ? 'Ergebnis gesehen' :
           step === 'loading' ? 'Auswertung' :
           step.toUpperCase(),
    count: totals[step],
    rate: totals.intro > 0 ? Math.round((totals[step] / totals.intro) * 100) : 0,
  }));
}

// Time series: submissions per day
export function submissionsTimeSeries(submissions, days = 30) {
  const byDay = {};
  for (let d = 0; d < days; d++) {
    const dateStr = format(subDays(new Date(), d), 'yyyy-MM-dd');
    byDay[dateStr] = 0;
  }
  for (const s of submissions) {
    const dateStr = format(new Date(s.submitted_at), 'yyyy-MM-dd');
    if (byDay[dateStr] !== undefined) byDay[dateStr]++;
  }
  return Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Stress score distribution
export function stressDistribution(submissions) {
  const buckets = [
    { label: '0-20 (Niedrig)', min: 0, max: 20, count: 0, color: '#22c55e' },
    { label: '21-40', min: 21, max: 40, count: 0, color: '#84cc16' },
    { label: '41-60 (Mittel)', min: 41, max: 60, count: 0, color: '#f97316' },
    { label: '61-80', min: 61, max: 80, count: 0, color: '#ef4444' },
    { label: '81-100 (Hoch)', min: 81, max: 100, count: 0, color: '#dc2626' },
  ];
  for (const s of submissions) {
    const bucket = buckets.find((b) => s.stress_score >= b.min && s.stress_score <= b.max);
    if (bucket) bucket.count++;
  }
  return buckets;
}

// Top symptoms
export function topSymptoms(submissions) {
  const counts = {};
  for (const s of submissions) {
    for (const symptom of s.q4_answers || []) {
      counts[symptom] = (counts[symptom] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// Aggregate funnel from raw Supabase events
export function aggregateFunnelFromEvents(events) {
  const STEPS = ['intro', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'loading', 'email', 'result'];
  const stepCounts = {};
  for (const step of STEPS) {
    stepCounts[step] = new Set();
  }
  for (const event of events) {
    if (stepCounts[event.step]) {
      stepCounts[event.step].add(event.session_id);
    }
  }
  const introCount = stepCounts.intro.size || 1;
  return STEPS.map((step) => ({
    step,
    label: step === 'intro' ? 'Quiz geöffnet' :
           step === 'email' ? 'E-Mail eingegeben' :
           step === 'result' ? 'Ergebnis gesehen' :
           step === 'loading' ? 'Auswertung' :
           step.toUpperCase(),
    count: stepCounts[step].size,
    rate: Math.round((stepCounts[step].size / introCount) * 100),
  }));
}

// Top wishes (q7)
export function topWishes(submissions) {
  const counts = {};
  for (const s of submissions) {
    if (s.q7_answer) {
      counts[s.q7_answer] = (counts[s.q7_answer] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
