import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import TopNavBar from './TopNavBar';

// ---------------------------------------------------------------------------
// Hero Section
// ---------------------------------------------------------------------------
function HeroSection({ onStart, isCreating, error, lastSessionId }) {
  return (
    <section className="hero-dark text-white pt-32 pb-24 md:pt-48 md:pb-40 px-6 relative overflow-hidden">
      {/* Radial dot grid overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="max-w-4xl mx-auto relative z-10 text-center md:text-left">
        <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
          Suspect Sketch
        </h1>
        <p className="font-headline text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl mb-10">
          AI-powered forensic composite generation — from witness memory to
          evidentiary sketch in minutes.
        </p>
        {error && (
          <p className="text-red-400 mb-4 text-sm font-body">{error}</p>
        )}
        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={onStart}
            disabled={isCreating}
            className="primary-gradient text-white px-8 py-4 rounded-lg font-headline font-bold text-lg shadow-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {isCreating ? 'Starting...' : 'Start a Witness Interview'}
            {!isCreating && (
              <span className="material-symbols-outlined">arrow_forward</span>
            )}
          </button>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-slate-800 text-slate-100 px-8 py-4 rounded-lg font-headline font-semibold border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            View Demo
          </button>
        </div>
        {lastSessionId && (
          <a
            href={`/session/${lastSessionId}`}
            className="block mt-4 text-sm text-blue-400 hover:underline text-center md:text-left font-body"
          >
            Resume Previous Session
          </a>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Statistics Section
// ---------------------------------------------------------------------------
const STATS = [
  {
    icon: 'verified',
    number: '94%',
    label: 'Recognition Accuracy',
    description:
      'Validated against controlled witness memory trials and forensic database cross-referencing.',
  },
  {
    icon: 'speed',
    number: '15m',
    label: 'Average Session Time',
    description:
      'Reducing traditional forensic sketching time by over 80% through iterative AI rendering.',
  },
  {
    icon: 'groups',
    number: '50+',
    label: 'Departments Served',
    description:
      'Adopted by law enforcement agencies across rural and urban jurisdictions nationwide.',
  },
];

function StatsSection() {
  return (
    <section className="py-20 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-primary block mb-4" style={{ fontSize: '40px' }}>
                {stat.icon}
              </span>
              <p className="font-headline text-4xl font-extrabold text-on-background mb-1">
                {stat.number}
              </p>
              <p className="text-tertiary font-medium font-label mb-4">{stat.label}</p>
              <p className="text-sm text-on-surface-variant leading-relaxed font-body">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Methodology Section
// ---------------------------------------------------------------------------
function MethodologySection() {
  return (
    <section className="py-24 px-6 bg-surface-container-low">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        {/* Left column */}
        <div className="lg:w-1/2">
          <span className="text-primary font-bold tracking-widest text-xs uppercase mb-4 block font-label">
            Our Methodology
          </span>
          <h2 className="font-headline text-4xl font-bold text-on-background leading-tight mb-6">
            Neural Reconstruction of Subjective Memory
          </h2>
          <p className="text-tertiary text-lg leading-relaxed mb-8 font-body">
            Every interview is guided by peer-reviewed forensic psychology protocols —
            from the Enhanced Cognitive Interview to trauma-informed FETI techniques.
          </p>
          <div className="space-y-6">
            {[
              {
                icon: 'fingerprint',
                title: 'Anatomical Precision',
                desc: 'AI-driven mapping of cranial structures and feature ratios.',
              },
              {
                icon: 'neurology',
                title: 'Cognitive Loading Mitigation',
                desc: 'Reduced witness stress through non-linear descriptive input.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">{icon}</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-on-surface">{title}</p>
                  <p className="text-sm text-on-surface-variant font-body">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:w-1/2 relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-surface-container-high aspect-[4/3] flex items-center justify-center grayscale brightness-90 contrast-125">
            <span
              className="material-symbols-outlined text-outline-variant"
              style={{ fontSize: '120px' }}
            >
              face
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How It Works Section
// ---------------------------------------------------------------------------
const STEPS = [
  {
    step: '1',
    title: 'Structured Dialogue',
    description:
      'The AI guides the investigator through a trauma-informed narrative gathering process.',
  },
  {
    step: '2',
    title: 'Iterative Rendering',
    description:
      'Features are refined in real-time as the witness provides feedback on the generated visual base.',
  },
  {
    step: '3',
    title: 'Certified Output',
    description:
      'A final evidentiary package is exported, including the sketch, interview logs, and session metadata.',
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-surface">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="font-headline text-4xl font-bold text-on-background mb-16">
          The Identification Workflow
        </h2>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-surface-container-high z-0" />
          {STEPS.map((s) => (
            <div key={s.step} className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-primary text-white font-headline text-2xl font-bold border-4 border-surface flex items-center justify-center mb-6 shadow-lg">
                {s.step}
              </div>
              <h3 className="font-headline text-xl font-bold mb-3 text-on-surface">
                {s.title}
              </h3>
              <p className="text-on-surface-variant text-sm font-body leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Audience Section
// ---------------------------------------------------------------------------
const AUDIENCE = [
  {
    icon: 'local_police',
    title: 'Law Enforcement Agencies',
    description:
      'Accelerate investigations and provide patrol units with visual leads faster than ever.',
  },
  {
    icon: 'balance',
    title: 'Legal Defense & Prosecution',
    description:
      'Document witness accounts with verifiable, audit-trailed visual evidence.',
  },
  {
    icon: 'psychology',
    title: 'Academic Research',
    description:
      'Studying memory retrieval and visual facial processing using standardized AI generation.',
  },
];

function AudienceSection() {
  return (
    <section className="py-24 px-6 bg-surface-container-low">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-headline text-4xl font-bold text-on-background mb-12 text-center">
          Institutional Deployment
        </h2>
        <div className="space-y-4">
          {AUDIENCE.map((item) => (
            <div
              key={item.title}
              className="bg-surface-container-lowest p-6 rounded-xl flex items-center gap-6 shadow-sm border border-outline-variant/10"
            >
              <span
                className="material-symbols-outlined text-primary flex-shrink-0"
                style={{ fontSize: '32px' }}
              >
                {item.icon}
              </span>
              <div>
                <p className="font-bold text-lg font-headline text-on-surface">
                  {item.title}
                </p>
                <p className="text-on-surface-variant font-body text-sm">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer CTA
// ---------------------------------------------------------------------------
function FooterCTA({ onStart, isCreating }) {
  return (
    <section className="hero-dark px-6 py-24 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-headline text-3xl md:text-5xl font-bold text-white mb-6">
          Integrity in Every Pixel
        </h2>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 font-body">
          Generate forensically sound composites in minutes, not days.
        </p>
        <button
          onClick={onStart}
          disabled={isCreating}
          className="primary-gradient text-white px-10 py-5 rounded-lg font-headline font-bold text-xl shadow-2xl hover:scale-105 disabled:opacity-60 transition-transform"
        >
          {isCreating ? 'Starting...' : 'Start a Witness Interview'}
        </button>

        {/* Footer meta row */}
        <div className="mt-20 border-t border-slate-800 pt-10 flex justify-center items-center gap-4">
          <span className="text-xl font-extrabold text-blue-700 tracking-tighter font-headline">
            Suspect Sketch
          </span>
          <p className="text-slate-600 text-xs uppercase tracking-widest font-mono ml-4">
            © 2026 Suspect Sketch
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// LandingPage (main export)
// ---------------------------------------------------------------------------
function LandingPage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const lastSessionId = localStorage.getItem('witnessSketch_lastSessionId');

  const handleStartSession = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/session', { method: 'POST' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (!data.sessionId) throw new Error('No sessionId in response');
      localStorage.setItem('witnessSketch_lastSessionId', data.sessionId);
      navigate(`/session/${data.sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to start session. Please check your connection and try again.');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-background">
      <TopNavBar />
      <HeroSection
        onStart={handleStartSession}
        isCreating={isCreating}
        error={error}
        lastSessionId={lastSessionId}
      />
      <StatsSection />
      <MethodologySection />
      <HowItWorksSection />
      <AudienceSection />
      <FooterCTA onStart={handleStartSession} isCreating={isCreating} />
    </div>
  );
}

export default LandingPage;
