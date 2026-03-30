# Stage 5: Frontend — Landing Page

## Goal
Build the landing page that users see before starting an interview session. This page establishes credibility, communicates the problem (lack of sketch artist access), highlights the research-backed methodology, and provides a clear call-to-action to start a session.

## Prerequisites
- Stage 1 complete (React + Vite + Tailwind running)
- No backend dependencies — this is a static page with one button that navigates to the interview view

---

## Step-by-Step Instructions

### 5.1 — Set up React Router

```bash
cd client
npm install react-router-dom
```

**Update `client/src/main.jsx`:**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Update `client/src/App.jsx`:**

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {/* Interview route will be added in Stage 6 */}
      {/* <Route path="/session/:id" element={<InterviewPage />} /> */}
    </Routes>
  );
}

export default App;
```

---

### 5.2 — Build the LandingPage component

**Create `client/src/components/LandingPage.jsx`:**

This is a long component. Build it section by section.

#### Structure overview:
1. **Hero section** — Name, tagline, CTA button
2. **Problem section** — Statistics cards showing the accessibility gap
3. **Science section** — Research methodology cards
4. **How It Works** — 3-step visual process
5. **Who It's For** — Target audience
6. **Footer CTA** — Repeat the start button

```jsx
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function LandingPage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Check for a previous session in localStorage.
  // NOTE: The session ID is written by InterviewPage on mount (Stage 6 section 6.2)
  // using the key 'witnessSketch_lastSessionId'. Use the same key here so the resume
  // link works correctly.
  const previousSessionId = localStorage.getItem('witnessSketch_lastSessionId');

  const handleStartSession = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/session', { method: 'POST' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (!data.sessionId) throw new Error('No sessionId in response');
      // Save to localStorage so the session can be resumed.
      // Must match the key used in Stage 6 (witnessSketch_lastSessionId).
      localStorage.setItem('witnessSketch_lastSessionId', data.sessionId);
      navigate(`/session/${data.sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to start session. Please check your connection and try again.');
      setIsCreating(false);
    }
  };

  const handleResumeSession = () => {
    if (previousSessionId) {
      navigate(`/session/${previousSessionId}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <HeroSection
        onStart={handleStartSession}
        isCreating={isCreating}
        error={error}
        previousSessionId={previousSessionId}
        onResume={handleResumeSession}
      />

      {/* PROBLEM — STATISTICS */}
      <StatsSection />

      {/* SCIENCE — RESEARCH METHODOLOGY */}
      <ScienceSection />

      {/* HOW IT WORKS */}
      <HowItWorksSection />

      {/* WHO IT'S FOR */}
      <AudienceSection />

      {/* FOOTER CTA */}
      <FooterCTA onStart={handleStartSession} isCreating={isCreating} />
    </div>
  );
}

export default LandingPage;
```

---

### 5.3 — Hero Section

```jsx
function HeroSection({ onStart, isCreating }) {
  return (
    <section className="bg-gray-900 text-white py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-4">WitnessSketch</h1>
        <p className="text-xl text-gray-300 mb-2">
          AI-powered suspect sketches for every department, everywhere.
        </p>
        <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
          No sketch artist? No problem. WitnessSketch uses AI to guide witnesses
          through a proven interview process and generate accurate suspect
          portraits in minutes.
        </p>
        <button
          onClick={onStart}
          disabled={isCreating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-colors"
        >
          {isCreating ? 'Starting...' : 'Start a Witness Interview'}
        </button>
      </div>
    </section>
  );
}
```

---

### 5.4 — Statistics Section

Display each statistic as a card with a large number and supporting context.

```jsx
const STATS = [
  {
    number: '<30%',
    label: 'of U.S. law enforcement agencies have access to a trained forensic sketch artist',
    context: 'Many departments rely on regional artists who may be hours away or unavailable',
  },
  {
    number: '$500–$2,000+',
    label: 'average cost per forensic sketch session when using a contracted artist',
    context: 'Smaller departments and rural agencies often cannot justify this cost per case',
  },
  {
    number: '<50',
    label: 'estimated full-time forensic sketch artists working in the entire U.S.',
    context: 'The profession is shrinking as artists retire and are not replaced',
  },
  {
    number: '3x',
    label: 'less likely for rural and underfunded departments to produce a suspect sketch',
    context: 'Investigative capability gaps based purely on geography and budget',
  },
  {
    number: '40%',
    label: 'more likely to generate actionable leads when a suspect sketch is available',
    context: 'Yet most cases never get one due to resource constraints',
  },
];

function StatsSection() {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          The Problem
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Most law enforcement agencies in America don't have access to a
          forensic sketch artist. It's not a training gap — it's an economic one.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STATS.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</p>
              <p className="text-gray-800 font-medium mb-2">{stat.label}</p>
              <p className="text-sm text-gray-500">{stat.context}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-8">
          Statistics reflect commonly reported estimates in forensic science
          literature and law enforcement reporting. Sources to be cited.
        </p>
      </div>
    </section>
  );
}
```

---

### 5.5 — Science / Research Section

This is the section that establishes credibility by listing the research methodologies.

```jsx
const METHODS = [
  {
    name: 'Enhanced Cognitive Interview (ECI)',
    description: 'Structured interview protocol that elicits 35–45% more accurate details than standard questioning.',
    source: 'Fisher & Geiselman, 1992; validated across 40+ years of peer-reviewed research',
  },
  {
    name: 'Holistic-Cognitive Interview (H-CI)',
    description: 'Captures holistic facial impressions before feature breakdown — composites are 4x more recognizable.',
    source: 'Latest forensic composite research; addresses how the brain actually encodes faces',
  },
  {
    name: 'Verbal Overshadowing Mitigation',
    description: 'Prevents the act of describing a face from impairing visual memory.',
    source: 'Schooler & Engstler-Schooler; 2024–2025 mitigation protocols',
  },
  {
    name: 'Person Description Interview (PDI)',
    description: 'Down-to-Up body recall instruction that captures details witnesses naturally skip.',
    source: 'Validated in laboratory and field settings',
  },
  {
    name: 'Category Clustering Recall (CCR)',
    description: 'Organizes memory by semantic category to surface hidden details.',
    source: 'Grounded in Spreading Activation Theory',
  },
  {
    name: 'FETI Trauma-Informed Protocol',
    description: 'Adapts questioning for trauma survivors using sensory memory cues.',
    source: 'Addresses the neurobiology of traumatic memory encoding',
  },
];

function ScienceSection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Built on the Latest Breakthroughs in Forensic Psychology
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Every question WitnessSketch asks is grounded in peer-reviewed forensic
          psychology research. The same science used to train FBI forensic
          interviewers — now accessible to every department.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {METHODS.map((method, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {method.name}
              </h3>
              <p className="text-gray-600 mb-3">{method.description}</p>
              <p className="text-xs text-gray-400">{method.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### 5.6 — How It Works Section

```jsx
const STEPS = [
  {
    step: '1',
    title: 'Answer Questions',
    description: 'A guided interview built on the Enhanced Cognitive Interview and Holistic-Cognitive Interview techniques helps you accurately recall what you saw.',
  },
  {
    step: '2',
    title: 'Watch the Sketch Build',
    description: 'An AI-generated portrait refines with each answer, using holistic facial processing research to build the most recognizable composite possible.',
  },
  {
    step: '3',
    title: 'Export & Share',
    description: 'Download the final sketch and full session report with interview transcript, sketch evolution, and confidence rating.',
  },
];

function HowItWorksSection() {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="space-y-8">
          {STEPS.map((s) => (
            <div key={s.step} className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                {s.step}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-gray-600">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### 5.7 — Audience Section

```jsx
function AudienceSection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Who It's For
        </h2>
        <ul className="space-y-4 max-w-2xl mx-auto">
          {[
            'Small-town and rural police departments without a sketch artist on staff',
            "Departments that can't afford to contract forensic artists for every case",
            'Agencies looking to supplement their existing sketch capability with faster turnaround',
            'Any law enforcement office that wants a suspect composite within minutes, not days',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-blue-600 mt-1 font-bold">—</span>
              <span className="text-gray-700 text-lg">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

---

### 5.8 — Footer CTA

```jsx
function FooterCTA({ onStart, isCreating }) {
  return (
    <section className="py-20 px-6 bg-gray-900 text-white text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">
          Ready to build a sketch?
        </h2>
        <p className="text-gray-400 mb-8">
          Start a guided witness interview and generate an AI-powered suspect
          portrait in minutes.
        </p>
        <button
          onClick={onStart}
          disabled={isCreating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-colors"
        >
          {isCreating ? 'Starting...' : 'Start a Witness Interview'}
        </button>
      </div>
    </section>
  );
}
```

---

### 5.9 — Put it all together

Make sure all the sub-components (`HeroSection`, `StatsSection`, `ScienceSection`, `HowItWorksSection`, `AudienceSection`, `FooterCTA`) are either:
- Defined in the same file as `LandingPage.jsx` (simplest approach), or
- Extracted into their own files under `client/src/components/landing/` and imported

For a junior engineer, keeping them all in `LandingPage.jsx` is the simplest approach. The file will be long but everything is in one place.

---

### 5.10 — Responsive design checks

Test the landing page at these breakpoints:
- Mobile (375px) — single column layout, smaller text
- Tablet (768px) — 2-column grid for stats/methods cards
- Desktop (1280px) — 3-column grid for stats/methods cards

Tailwind's `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` classes handle this automatically in the code above.

---

## Definition of Done

- [ ] Landing page renders at `/` with all six sections visible
- [ ] "Start a Witness Interview" button calls `POST /api/session` and navigates to `/session/:id`
- [ ] Button shows "Starting..." while the session is being created
- [ ] All 5 statistics display correctly with large numbers, labels, and context
- [ ] All 6 research methodology cards display with name, description, and source
- [ ] 3-step "How It Works" section renders with numbered circles
- [ ] "Who It's For" list renders with 4 items
- [ ] Footer CTA repeats the start button
- [ ] Page is responsive: single column on mobile, multi-column on desktop
- [ ] No broken layouts or overflow at any common viewport width
- [ ] Tailwind styles are applied correctly (no unstyled elements)
