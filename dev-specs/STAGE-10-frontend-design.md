# Stage 10: Frontend Design System & Theming

## Goal
Restyle the entire frontend to match the "Suspect Sketch" design language — a Material Design 3–inspired system with semantic color tokens, dual typefaces (Manrope + Inter), Material Symbols icons, and glass/gradient effects. This stage does NOT change any logic, state management, or API calls — it is purely visual.

## Prerequisites
- Stages 5–8 complete (all components exist and are functional)

## Reference Mockups
The HTML mockups for each page are stored alongside this spec. They are the **source of truth** for every visual decision below.

---

## 10.1 — Design Tokens & Tailwind Configuration

### Fonts

Install Google Fonts in `client/index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
```

| Role | Family | Weights | Usage |
|------|--------|---------|-------|
| `headline` | Manrope | 400, 600, 700, 800 | Page titles, section headings, stat numbers, button labels |
| `body` | Inter | 300–700 | Paragraph text, chat messages, input fields |
| `label` | Inter | 500–700 | Phase labels, micro-labels, uppercase tracking-widest captions |

### Color Palette (Material Design 3 Tokens)

> **Tailwind v4 note:** This project uses `@tailwindcss/vite` (Tailwind v4), which does **not** use `tailwind.config.js`. All design tokens go in `@theme {}` blocks inside `client/src/index.css`. The CSS custom property `--color-*` naming convention generates `bg-*`, `text-*`, `border-*` utilities automatically.

Add all tokens to `client/src/index.css` inside an `@theme {}` block:

```css
@theme {
  /* Primary */
  --color-primary:                  #004ac6;
  --color-primary-container:        #2563eb;
  --color-on-primary:               #ffffff;
  --color-on-primary-container:     #eeefff;
  --color-on-primary-fixed:         #00174b;
  --color-on-primary-fixed-variant: #003ea8;
  --color-primary-fixed:            #dbe1ff;
  --color-primary-fixed-dim:        #b4c5ff;
  --color-inverse-primary:          #b4c5ff;

  /* Secondary */
  --color-secondary:                  #575e70;
  --color-secondary-container:        #d9dff5;
  --color-secondary-fixed:            #dce2f7;
  --color-secondary-fixed-dim:        #c0c6db;
  --color-on-secondary:               #ffffff;
  --color-on-secondary-container:     #5c6274;
  --color-on-secondary-fixed:         #141b2b;
  --color-on-secondary-fixed-variant: #404758;

  /* Tertiary */
  --color-tertiary:                  #485767;
  --color-tertiary-container:        #606f80;
  --color-tertiary-fixed:            #d5e4f8;
  --color-tertiary-fixed-dim:        #b9c8db;
  --color-on-tertiary:               #ffffff;
  --color-on-tertiary-container:     #e9f2ff;
  --color-on-tertiary-fixed:         #0e1d2b;
  --color-on-tertiary-fixed-variant: #3a4858;

  /* Error */
  --color-error:             #ba1a1a;
  --color-error-container:   #ffdad6;
  --color-on-error:          #ffffff;
  --color-on-error-container: #93000a;

  /* Surface hierarchy */
  --color-surface:                    #f9f9ff;
  --color-surface-dim:                #d3daef;
  --color-surface-bright:             #f9f9ff;
  --color-surface-container-lowest:   #ffffff;
  --color-surface-container-low:      #f1f3ff;
  --color-surface-container:          #e9edff;
  --color-surface-container-high:     #e1e8fd;
  --color-surface-container-highest:  #dce2f7;
  --color-surface-variant:            #dce2f7;
  --color-surface-tint:               #0053db;

  /* On-surface */
  --color-on-surface:         #141b2b;
  --color-on-surface-variant: #434655;
  --color-on-background:      #141b2b;
  --color-background:         #f9f9ff;

  /* Outline */
  --color-outline:         #737686;
  --color-outline-variant: #c3c6d7;

  /* Inverse */
  --color-inverse-surface:    #293040;
  --color-inverse-on-surface: #edf0ff;

  /* Font families */
  --font-headline: "Manrope", sans-serif;
  --font-body:     "Inter", sans-serif;
  --font-label:    "Inter", sans-serif;

  /* Border radii (tighter than Tailwind defaults) */
  --radius:    0.125rem;
  --radius-lg: 0.25rem;
  --radius-xl: 0.5rem;
}
```

This generates utilities like `bg-primary`, `text-on-surface`, `border-outline-variant`, `font-headline`, `rounded-xl`, etc.

### Font families

Font families are declared inside the `@theme {}` block above via `--font-*` custom properties.

### Border radii (tighter than Tailwind defaults)

Border radii are declared inside the `@theme {}` block above via `--radius-*` custom properties.

### Custom CSS Classes

Add to `client/src/index.css` (after the Tailwind import):

```css
/* Material Symbols baseline */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Glass card (stats, floating elements) */
.glass-card {
  background: rgba(220, 226, 247, 0.7);
  backdrop-filter: blur(12px);
}

/* Glass panel (sketch utility buttons) */
.glass-panel {
  background: rgba(220, 226, 247, 0.7);
  backdrop-filter: blur(12px);
}

/* Glass overlay (modal backdrop) */
.glass-overlay {
  background-color: rgba(220, 226, 247, 0.7);
  backdrop-filter: blur(12px);
}

/* Primary gradient (CTA buttons, witness bubbles) */
.primary-gradient {
  background: linear-gradient(135deg, #004ac6 0%, #2563eb 100%);
}

/* Dark hero/footer backgrounds */
.hero-dark {
  background-color: #0f172a;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #c3c6d7; border-radius: 10px; }
```

---

## 10.2 — Global Layout Components

### TopNavBar

Present on ALL pages. Fixed at top, `z-50`.

```
┌─────────────────────────────────────────────────────────┐
│  [Suspect Sketch]              [History] [New Session] [👤]│
└─────────────────────────────────────────────────────────┘
```

**Structure:**
```jsx
<nav className="bg-slate-50 border-b border-slate-200 shadow-sm fixed top-0 z-50 w-full">
  <div className="flex justify-between items-center w-full px-6 py-3">
    {/* Left: Brand */}
    <span className="text-xl font-extrabold text-blue-700 tracking-tighter font-headline">
      Suspect Sketch
    </span>

    {/* Right: Nav links (hidden on mobile) */}
    <div className="hidden md:flex items-center gap-8">
      <a className="text-blue-700 font-semibold border-b-2 border-blue-700">New Session</a>
      <span className="material-symbols-outlined text-slate-500">account_circle</span>
    </div>

    {/* Mobile hamburger */}
    <div className="md:hidden">
      <span className="material-symbols-outlined text-slate-900">menu</span>
    </div>
  </div>
</nav>
```

**On the Interview page**, the nav also shows the case/session ID:
```jsx
<div className="flex items-center gap-4">
  <span className="...font-headline">Suspect Sketch</span>
  <div className="h-4 w-px bg-outline-variant mx-2" />
  <span className="font-headline font-bold tracking-tight text-slate-900">
    Case #{sessionId.slice(0, 8)}
  </span>
</div>
```

### BottomStatusBar

Present on ALL pages. Fixed at bottom, `z-50`. Replaces the current `<StatusBar>` component.

```
┌─────────────────────────────────────────────────────────┐
│  ⏳ Current Phase: Feature Recall          ⏱ Elapsed: 12:45 │
└─────────────────────────────────────────────────────────┘
```

**Structure:**
```jsx
<footer className="fixed bottom-0 left-0 w-full flex justify-between items-center px-8 bg-slate-900 border-t border-slate-800 z-50 h-10">
  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest font-mono">
    <span className="material-symbols-outlined text-[16px]">pending_actions</span>
    Current Phase: {PHASE_LABELS[phase]}
  </div>
  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-mono">
    <span className="material-symbols-outlined text-[16px]">timer</span>
    Elapsed: {mm}:{ss}
  </div>
</footer>
```

- Phase label uses `text-blue-400 font-bold`
- Timer uses `text-slate-400`
- Both use `uppercase tracking-widest font-mono text-xs`
- Material Symbols icons at 16px

### ErrorBar

Shown below the TopNavBar when `error` state is set. Full-width red bar.

```jsx
<div className="bg-error text-on-error px-6 py-2 flex items-center justify-between text-sm font-medium z-40">
  <div className="flex items-center gap-2">
    <span className="material-symbols-outlined text-sm">report</span>
    {error}
  </div>
  <button className="underline font-bold hover:opacity-80 transition-opacity" onClick={onRetry}>
    Retry
  </button>
</div>
```

---

## 10.3 — Landing Page (`LandingPage.jsx`)

The body element uses: `bg-background font-body text-on-background`

### Hero Section

- Background: `hero-dark` class (`#0f172a` slate-900)
- Decorative overlay: radial dot grid pattern (`radial-gradient(#2563eb 1px, transparent 1px)` at `40px 40px`, `opacity-10`)
- Padding: `pt-32 pb-24 md:pt-48 md:pb-40`
- Content left-aligned on desktop (`text-center md:text-left`), max-w-4xl
- Title: `font-headline text-5xl md:text-7xl font-extrabold text-white tracking-tight` — "Suspect Sketch"
- Subtitle: `font-headline text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl`
- Primary CTA: `primary-gradient text-white px-8 py-4 rounded-lg font-bold text-lg shadow-xl` with `arrow_forward` icon
- Secondary CTA ("View Demo"): `bg-slate-800 text-slate-100 px-8 py-4 rounded-lg font-semibold border border-slate-700`
  - **Behavior:** Smooth-scrolls the page to the "How It Works" section (`#how-it-works`). The How It Works section must have `id="how-it-works"` on its `<section>` element. Use `document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })` on click.
- "Resume Previous Session" link: `text-blue-400 hover:underline text-sm`
- Both buttons in a `flex flex-col md:flex-row gap-4` container

### Statistics Section

- Background: `bg-surface`
- Padding: `py-20`
- 3-column grid: `grid grid-cols-1 md:grid-cols-3 gap-6`
- Each card: `bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/20`
  - Icon: `text-primary` Material Symbol (e.g., `verified`, `speed`, `groups`) at `text-4xl`
  - Number: `font-headline text-4xl font-extrabold text-on-background`
  - Label: `text-tertiary font-medium`
  - Description: `text-sm text-on-surface-variant leading-relaxed mt-4`

**Content:**

| Icon | Number | Label | Description |
|------|--------|-------|-------------|
| `verified` | 94% | Recognition Accuracy | Validated against controlled witness memory trials and forensic database cross-referencing. |
| `speed` | 15m | Average Session Time | Reducing traditional forensic sketching time by over 80% through iterative AI rendering. |
| `groups` | 50+ | Departments Served | Adopted by law enforcement agencies across rural and urban jurisdictions nationwide. |

### Methodology Section

- Background: `bg-surface-container-low`
- Padding: `py-24`
- Two-column layout: `flex flex-col lg:flex-row gap-16 items-center`

**Left column (`lg:w-1/2`):**
- Eyebrow: `text-primary font-bold tracking-widest text-xs uppercase mb-4 block` — "Our Methodology"
- Heading: `font-headline text-4xl font-bold text-on-background leading-tight` — "Neural Reconstruction of Subjective Memory"
- Body: `text-tertiary text-lg leading-relaxed`
- Feature list (2 items):
  - Icon in `bg-primary/10 p-2 rounded-full` container
  - Bold title + `text-sm text-on-surface-variant` description

| Icon | Title | Description |
|------|-------|-------------|
| `fingerprint` | Anatomical Precision | AI-driven mapping of cranial structures and feature ratios. |
| `neurology` | Cognitive Loading Mitigation | Reduced witness stress through non-linear descriptive input. |

**Right column (`lg:w-1/2`):**
- Sample witness sketch image in `rounded-2xl overflow-hidden shadow-2xl border-4 border-white`
- The image area uses a placeholder face icon (`material-symbols-outlined: face` at 120px, in a `bg-surface-container-high aspect-[4/3]` container) until a real sample sketch asset is added
- Apply the same `grayscale brightness-90 contrast-125` filter used on the interview sketch panel to maintain visual consistency
- No testimonial card — keep the layout clean and let the sketch speak for itself

### How It Works Section

- **Section element must have `id="how-it-works"`** (scroll target for the "View Demo" hero button)
- Background: `bg-surface`
- Padding: `py-24`, centered text
- Heading: `font-headline text-4xl font-bold text-on-background mb-16` — "The Identification Workflow"
- 3-column grid with connecting line:
  - Horizontal line: `hidden md:block absolute top-12 left-0 w-full h-0.5 bg-surface-container-high z-0`
  - Each step: `relative z-10 flex flex-col items-center`
    - Number circle: `w-20 h-20 rounded-full bg-primary text-white font-headline text-2xl font-bold border-4 border-background`
    - Title: `font-headline text-xl font-bold mb-3`
    - Description: `text-on-surface-variant text-sm`

| Step | Title | Description |
|------|-------|-------------|
| 1 | Structured Dialogue | The AI guides the investigator through a trauma-informed narrative gathering process. |
| 2 | Iterative Rendering | Features are refined in real-time as the witness provides feedback on the generated visual base. |
| 3 | Certified Output | A final evidentiary package is exported, including the sketch, interview logs, and session metadata. |

### Who It's For Section

- Background: `bg-surface-container-low`
- Padding: `py-24`
- Heading: `font-headline text-4xl font-bold text-on-background mb-12 text-center` — "Institutional Deployment"
- Max-width: `max-w-3xl mx-auto`
- List items: `bg-surface-container-lowest p-6 rounded-xl flex items-center gap-6 shadow-sm border border-outline-variant/10`
  - Icon: `text-primary text-3xl` Material Symbol
  - Title: `font-bold text-lg`
  - Description: `text-on-surface-variant`

| Icon | Title | Description |
|------|-------|-------------|
| `local_police` | Law Enforcement Agencies | Accelerate investigations and provide patrol units with visual leads faster than ever. |
| `balance` | Legal Defense & Prosecution | Document witness accounts with verifiable, audit-trailed visual evidence. |
| `psychology` | Academic Research | Studying memory retrieval and visual facial processing using standardized AI generation. |

### Footer CTA

- Background: `hero-dark`
- Padding: `py-24`, centered
- Heading: `font-headline text-3xl md:text-5xl font-bold text-white` — "Integrity in Every Pixel"
- Subtitle: `text-slate-400 text-lg max-w-xl mx-auto`
- CTA button: `primary-gradient text-white px-10 py-5 rounded-lg font-bold text-xl shadow-2xl hover:scale-105 transition-transform`
- Footer meta row: `mt-20 border-t border-slate-800 pt-10 flex justify-center items-center`
  - Brand + copyright only — no legal links
  - Brand: `text-xl font-extrabold text-blue-700 tracking-tighter font-headline` — "Suspect Sketch"
  - Copyright: `text-slate-600 text-xs uppercase tracking-widest font-mono ml-4` — "© 2026 Suspect Sketch"

---

## 10.4 — Interview Page (`InterviewPage.jsx`)

Body uses: `bg-surface font-body text-on-surface overflow-hidden h-screen flex flex-col`

Page must account for fixed TopNavBar (top) and BottomStatusBar (bottom) by adding appropriate padding (`pt-[52px] pb-10` or equivalent).

### Chat Panel (Left — `InterviewPanel.jsx` + `ChatMessage.jsx`)

Container: `w-full lg:w-1/2 flex flex-col border-r border-outline-variant/20 bg-surface`

**Message Bubbles:**

| Type | Alignment | Label | Bubble Style |
|------|-----------|-------|-------------|
| Interviewer | Left (`items-start`) | `"Interviewer"` — `text-[0.6875rem] text-tertiary font-semibold uppercase tracking-wider ml-4` | `bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 text-on-surface` |
| Witness answer | Right (`items-end ml-auto`) | `"Witness"` — `text-[0.6875rem] text-tertiary font-semibold uppercase tracking-wider mr-4` | `primary-gradient text-on-primary p-4 rounded-xl shadow-md` |
| Skipped | Right (`items-end ml-auto`) | `"Witness"` — same as above | `bg-surface-container-low text-on-surface-variant p-4 rounded-xl border border-dashed border-outline-variant italic` |

- All bubbles capped at `max-w-[85%]`
- Messages area: `flex-1 overflow-y-auto p-6 space-y-6`

**Input Area:**

Container: `p-6 bg-surface-container-low border-t border-outline-variant/20 space-y-4`

Action buttons row (above input):
```jsx
<div className="flex gap-2">
  {/* Skip button */}
  <button className="bg-surface-container-high text-on-secondary-container px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-bright transition-colors">
    I don't remember
  </button>
  {/* Finish button (after 5+ exchanges) */}
  <button className="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity ml-auto">
    Finish & Export
  </button>
</div>
```

Text input with embedded send button:
```jsx
<div className="relative flex items-center">
  <input
    className="w-full bg-surface-container-lowest border-none rounded-xl px-4 py-4 pr-16 focus:ring-0 text-on-surface placeholder:text-outline/60 border-b-2 border-transparent focus:border-primary transition-all shadow-sm"
    placeholder="Describe the feature..."
  />
  <button className="absolute right-2 primary-gradient text-on-primary w-10 h-10 rounded-lg flex items-center justify-center shadow-lg active:scale-95 transition-transform">
    <span className="material-symbols-outlined">send</span>
  </button>
</div>
```

### Sketch Panel (Right — `SketchPanel.jsx`)

Container: `w-full lg:w-1/2 flex flex-col bg-surface-container-low`

**Sketch Display Area:**

```
┌──────────────────────────────────┐
│                            [🔍] │
│                            [⚖️] │
│      [ Sketch Image ]     [⬇️] │
│                                  │
│      [ Loading Overlay ]         │
│                                  │
└──────────────────────────────────┘
```

- Outer: `flex-1 relative flex items-center justify-center p-10`
- Sketch frame: `relative w-full max-w-lg aspect-[3/4] bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden border border-outline-variant/10`
- Image filter: `grayscale brightness-90 contrast-125` (gives pencil-sketch forensic look)
- Loading overlay: `absolute inset-0 bg-on-background/10 backdrop-blur-[2px] flex flex-col items-center justify-center`
  - Spinner: `w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin`
  - Text: `mt-4 font-headline font-bold text-on-background tracking-wide` — "Generating sketch..."

**Utility Floating Bar** (top-right of sketch area):
```jsx
<div className="absolute top-6 right-6 flex flex-col gap-2">
  <button className="glass-panel w-12 h-12 rounded-full flex items-center justify-center shadow-sm hover:bg-surface-bright transition-colors">
    <span className="material-symbols-outlined text-primary">zoom_in</span>
  </button>
  <button className="glass-panel w-12 h-12 rounded-full ...">
    <span className="material-symbols-outlined text-on-surface">compare</span>
  </button>
  <button className="glass-panel w-12 h-12 rounded-full ...">
    <span className="material-symbols-outlined text-on-surface">download</span>
  </button>
</div>
```

**Controls Panel** (below sketch, slides up):

Container: `p-6 bg-surface-container-lowest rounded-t-[2rem] shadow-inner space-y-6`

Confidence Slider:
```jsx
<div className="space-y-3">
  <div className="flex justify-between items-center">
    <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-tertiary">
      Witness Confidence
    </label>
    <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
      {value} / 10
    </span>
  </div>
  <div className="relative h-2 w-full bg-surface-container rounded-full overflow-hidden">
    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-error via-surface-tint to-primary"
         style={{ width: `${value * 10}%` }} />
    <input type="range" min="1" max="10" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
  </div>
</div>
```

Filmstrip (`SketchHistory.jsx`):
- Label: `text-[0.6875rem] font-bold uppercase tracking-widest text-tertiary` — "Iteration History"
- Container: `flex gap-4 overflow-x-auto pb-2`
- Current version thumbnail: `flex-shrink-0 w-20 aspect-[3/4] rounded-lg border-2 border-primary overflow-hidden cursor-pointer ring-4 ring-primary/10`
- Other thumbnails: `flex-shrink-0 w-20 aspect-[3/4] rounded-lg border border-outline-variant/30 overflow-hidden cursor-pointer hover:border-primary transition-colors`
- Non-current images: `grayscale opacity-60`

---

## 10.5 — Export Modal (`ExportModal.jsx`)

**Overlay:** `fixed inset-0 z-[100] flex items-center justify-center p-4 glass-overlay`

**Modal container:** `bg-surface-container-lowest w-full max-w-3xl rounded-xl shadow-[0_12px_32px_-4px_rgba(20,27,43,0.08)] overflow-hidden flex flex-col md:flex-row`

### Left Panel (Summary) — `md:w-5/12`

Background: `bg-surface-container-low p-10 border-r border-outline-variant/10`

- Title: `font-headline font-bold text-2xl text-on-surface` — "Session Summary"
- Subtitle: `font-body text-sm text-on-surface-variant` — "Exporting forensic assets for administrative review."

Stats list (vertical, `space-y-6`):

Each stat:
```jsx
<div className="flex items-center gap-4">
  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
    <span className="material-symbols-outlined text-primary">{icon}</span>
  </div>
  <div>
    <p className="font-label text-[10px] uppercase tracking-wider text-tertiary">{label}</p>
    <p className="font-headline font-bold text-lg text-on-surface">{value}</p>
  </div>
</div>
```

| Icon | Label | Value (dynamic) |
|------|-------|-----------------|
| `timer` | Duration | `{mm}:{ss}` |
| `draw` | Sketch Count | `{n} Versions` |
| `forum` | Total Exchanges | `{n} Exchanges` |

Confidence bar at bottom:
```jsx
<div className="mt-12">
  <div className="flex justify-between items-end mb-2">
    <p className="font-label text-[10px] uppercase tracking-wider text-tertiary">Confidence Score</p>
    <p className="font-headline font-extrabold text-2xl text-primary">{score * 10}%</p>
  </div>
  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
    <div className="h-full bg-primary rounded-full" style={{ width: `${score * 10}%` }} />
  </div>
</div>
```

### Right Panel (Actions) — `md:w-7/12`

Background: `bg-surface-container-lowest p-10`

Loading indicator (shown while preparing):
```jsx
<div className="mb-10 text-center">
  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-fixed mb-4">
    <span className="material-symbols-outlined text-primary text-3xl animate-pulse">sync</span>
  </div>
  <h3 className="font-headline font-bold text-xl text-on-surface">Preparing Evidence Report</h3>
  <p className="font-body text-sm text-on-surface-variant mt-2">
    Aggregating session logs and rendering high-resolution assets...
  </p>
</div>
```

Action buttons (`space-y-4`):
```jsx
{/* PDF */}
<button className="w-full primary-gradient text-on-primary py-4 px-6 rounded-lg font-headline font-bold flex items-center justify-center gap-3 shadow-lg hover:opacity-90 transition-opacity">
  <span className="material-symbols-outlined">picture_as_pdf</span>
  Download Full Report (PDF)
</button>

{/* PNG */}
<button className="w-full bg-surface-container-high text-on-secondary-container py-4 px-6 rounded-lg font-headline font-bold flex items-center justify-center gap-3 hover:bg-surface-variant transition-colors">
  <span className="material-symbols-outlined">image</span>
  Download Sketch Only (PNG)
</button>

{/* Cancel */}
<div className="pt-6 flex justify-center">
  <button className="text-on-surface-variant hover:text-error font-label text-xs uppercase tracking-widest font-bold transition-colors">
    Cancel Export
  </button>
</div>
```

Session hash footer:
```jsx
<div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
  <p className="font-label text-[10px] text-tertiary leading-relaxed">
    Session hash: {sessionId.slice(0, 4)}...{sessionId.slice(-4)}<br />
    Forensic Integrity Verified via SHA-256
  </p>
</div>
```

---

## 10.6 — Material Symbols Icon Reference

All icons use `<span className="material-symbols-outlined">icon_name</span>`.

| Context | Icon Name | Usage |
|---------|-----------|-------|
| Nav profile | `account_circle` | TopNavBar right |
| Nav mobile | `menu` | Hamburger toggle |
| CTA arrow | `arrow_forward` | Primary button suffix |
| Stat: accuracy | `verified` | Landing stats |
| Stat: speed | `speed` | Landing stats |
| Stat: departments | `groups` | Landing stats |
| Methodology: anatomy | `fingerprint` | Feature list |
| Methodology: cognitive | `neurology` | Feature list |
| Audience: police | `local_police` | Who It's For |
| Audience: legal | `balance` | Who It's For |
| Audience: research | `psychology` | Who It's For |
| Phase indicator | `pending_actions` | Bottom status bar |
| Timer | `timer` | Bottom status bar, export modal |
| Error | `report` | Error bar |
| Send message | `send` | Chat input |
| Sketch: zoom | `zoom_in` | Floating utility |
| Sketch: compare | `compare` | Floating utility |
| Sketch: download | `download` | Floating utility |
| Export: PDF | `picture_as_pdf` | Export modal |
| Export: PNG | `image` | Export modal |
| Export: loading | `sync` | Export modal (animate-pulse) |
| Export: sketches | `draw` | Export modal stat |
| Export: exchanges | `forum` | Export modal stat |

---

## 10.7 — Key Visual Differences from Current Implementation

| Element | Current | New Design |
|---------|---------|------------|
| Brand name | "WitnessSketch" in nav | "Suspect Sketch" in nav and hero title |
| Fonts | System/Tailwind defaults | Manrope (headlines) + Inter (body) |
| Icons | None / text-only | Material Symbols Outlined throughout |
| Primary color | `blue-600` | `#004ac6` (deeper blue) with gradient CTAs |
| Hero background | `bg-gray-900` | `#0f172a` with radial dot grid overlay |
| Stat cards | Simple grid | Bento grid with icons, shadows, border tokens |
| Chat: interviewer | White bg | `surface-container-lowest` with outline-variant border |
| Chat: witness | Blue bg | `primary-gradient` (gradient blue) |
| Chat: skipped | Gray italic | `surface-container-low` with dashed border |
| Chat: labels | None | Uppercase micro-labels ("INTERVIEWER" / "WITNESS") above each bubble |
| Send button | Text "Send" | Gradient icon button (`send` icon) embedded in input |
| Skip button | Gray border pill | `surface-container-high` filled button |
| Finish button | Gray border pill | `error-container` filled button (urgent feel) |
| Sketch display | Plain image | `grayscale brightness-90 contrast-125` filter, 3:4 aspect, heavy shadow |
| Sketch loading | Pulse text | Spinner (`border-4 animate-spin`) + backdrop blur |
| Sketch utilities | None | Glass floating buttons (zoom, compare, download) |
| Filmstrip | Blue border active | `ring-4 ring-primary/10` glow on active, `opacity-60 grayscale` on others |
| Confidence slider | Colored bar | Gradient bar (`from-error via-surface-tint to-primary`) with pill badge |
| Status bar | White bg, bottom of layout | Fixed dark bar (`slate-900`), uppercase mono, Material icons |
| Export modal | Simple white card | Split layout (summary left / actions right), glass overlay backdrop |
| Error display | Red bg inline | Full-width `bg-error` bar below nav with Material `report` icon |

---

## Definition of Done

- [ ] Google Fonts (Manrope + Inter) and Material Symbols loaded in `index.html`
- [ ] `@theme {}` block in `index.css` defines all M3 color tokens, font families, and border radii (Tailwind v4 — no `tailwind.config.js`)
- [ ] Custom CSS classes (`glass-card`, `glass-panel`, `glass-overlay`, `primary-gradient`, `hero-dark`) added to `index.css`
- [ ] TopNavBar component created and rendered on all pages with "Suspect Sketch" brand
- [ ] BottomStatusBar component renders on all pages with phase + timer in dark bar
- [ ] Landing page restyled: hero with dot grid, gradient CTAs (View Demo scrolls to workflow), bento stats with icons, methodology with sample sketch (no testimonial), workflow with connecting line, audience list with icons, dark footer (no legal links)
- [ ] Interview chat bubbles restyled: gradient witness, bordered interviewer, dashed skipped, uppercase micro-labels
- [ ] Chat input restyled: embedded send icon button, filled action buttons
- [ ] Sketch panel restyled: 3:4 aspect, grayscale filter, glass floating utility buttons, spinner loading overlay
- [ ] Confidence slider uses gradient bar with pill badge
- [ ] Filmstrip thumbnails use ring glow on active, opacity on inactive
- [ ] Export modal uses split layout with glass overlay, Material icons, gradient PDF button
- [ ] Error bar uses full-width `bg-error` with `report` icon and Retry button
- [ ] All Material Symbols render correctly (font loaded, class applied)
- [ ] No logic, state, or API changes — purely visual
- [ ] Build passes (`npm run build`)
