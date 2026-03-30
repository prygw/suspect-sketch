# WitnessSketch — Development Stages

## Overview

The project is split into 10 stages. Each stage has a self-contained spec with step-by-step instructions, code examples, and a "Definition of Done" checklist. Complete them in order — each stage builds on the previous one.

## Stages

| Stage | File | What It Builds | Dependencies |
|-------|------|----------------|--------------|
| 1 | [STAGE-1-project-setup.md](./STAGE-1-project-setup.md) | Project scaffolding — React, Express, SQLite, Tailwind, dev proxy | None |
| 2 | [STAGE-2-backend-api.md](./STAGE-2-backend-api.md) | Full REST API with session CRUD, stub responses, SQLite persistence | Stage 1 |
| 3 | [STAGE-3-interview-engine.md](./STAGE-3-interview-engine.md) | Gemini-powered interview engine — question generation, profile parsing, phase management | Stage 2 |
| 4 | [STAGE-4-sketch-generation.md](./STAGE-4-sketch-generation.md) | Gemini image generation — prompt assembly, sketch storage, refinement | Stage 3 |
| 5 | [STAGE-5-frontend-landing.md](./STAGE-5-frontend-landing.md) | Landing page — hero, statistics, research methodology, CTA | Stage 1 |
| 6 | [STAGE-6-frontend-interview.md](./STAGE-6-frontend-interview.md) | Interview UI — chat panel, session hook, phase indicator, timer | Stage 3, 5 |
| 7 | [STAGE-7-sketch-panel.md](./STAGE-7-sketch-panel.md) | Sketch panel — display, history filmstrip, compare view, confidence meter | Stage 4, 6 |
| 8 | [STAGE-8-export.md](./STAGE-8-export.md) | Export — PDF report generation, PNG download, export modal | Stage 7 |
| 9 | [STAGE-9-polish-security.md](./STAGE-9-polish-security.md) | Polish & deployment — session expiry, error handling, production build, PM2, Nginx, Cloudflare | Stage 8 |
| 10 | [STAGE-10-frontend-design.md](./STAGE-10-frontend-design.md) | Frontend design system — M3 color tokens, typography, glass effects, component theming | Stage 9 |

## Dependency Graph

```
Stage 1 (Setup)
  ├── Stage 2 (API)
  │     └── Stage 3 (Interview Engine)
  │           └── Stage 4 (Sketch Generation)
  └── Stage 5 (Landing Page)
        └── Stage 6 (Interview UI) ← also needs Stage 3
              └── Stage 7 (Sketch Panel) ← also needs Stage 4
                    └── Stage 8 (Export)
                          └── Stage 9 (Polish & Deployment)
                                └── Stage 10 (Frontend Design System)
```

Stages 5 and 2 can be worked on in parallel after Stage 1 is complete.
Stages 3-4 (backend) and Stage 5 (frontend landing) can also be parallelized.

## Key Reference

- **Main spec:** `../SPEC.md` — full product specification
- **Research:** `../RESEARCH_QA.md` — forensic psychology research backing the interview methodology
- **Gemini API docs:** https://ai.google.dev/docs
