# Design & Engineering Principles (Anti-SaaS & Domain Integrity)

These rules are permanent constraints to prevent generic AI UI patterns, unnecessary jargon, and dimensional confusion across all coding and data visualization tasks.

## 1. Zero B2B SaaS Clutter & Vanity Elements
- **No Fake Versions or Build Tags:** Never display software version numbers (e.g. `v24.0`, `v1.2 Stable`, `Build 894`) on user-facing UI unless explicitly requested by the user.
- **No Vanity Status Pills:** Never add decorative green pulsing dots, "Live Telemetry Connected", "System Status: Optimal", or generic server health badges.
- **No Tech Jargon Padding:** Every word and label on screen must communicate verifiable domain facts. Never add fluff text or software engineering buzzwords just to fill screen real estate.
- **No Unverified Superlatives or Marketing Copy:** Ban promotional engineering hyperbole in all UI text and documentation (e.g., `100% uptime`, `infinite scaling`, `zero-failure`, `never crashes`, `sub-50ms`, `0 KB bundle`, `seamless`, `enterprise-grade`). Every quantitative claim in prose (latency, counts, sizes, percentages) must be directly measured or verified in this repo.
- **Layout Authenticity (Edward Tufte / Editorial Standard):** Do not default to the generic B2B SaaS template ("top navbar + left collapsible sidebar + metric card grid"). Match the interface architecture strictly to the domain (e.g. cartographic full-bleed, Swiss transit schematic, editorial data journalism).

## 2. Dimensional & Temporal Rigor
- **Strict Metric Hygiene:** Never mix instantaneous rates with cumulative volumes without an explicit, mathematically sound conversion bridge.
  - Rate: $Q = \frac{dV}{dt}$ (e.g., cubic feet per second, cfs)
  - Volume: $V = \int Q \, dt$ (e.g., Million Acre-Feet, MAF; Acre-Feet, AF)
  - Physical Bridge: $1\text{ cfs sustained for 1 year} = 723.97\text{ AF} \approx 0.000724\text{ MAF}$.
- **Temporal Scope Separation:**
  - Operational Hydrology (Map): Instantaneous rate ($t = \text{now}$, cfs). Reflects live weather, pulses, and real-time operations.
  - Macro Water Budget (Sankey / Transit Diagram): Annualized multi-year accounting ($t = 1\text{ year}$, MAF/yr). Must remain unaffected by transient weather pulses.

## 3. Hydrologic Mass-Balance Laws
- **Confluence Rule:** At any junction, Downstream Reach Discharge $\approx$ Upstream Mainstem Discharge $+$ Tributary Inflows $-$ Diversions $-$ Seepage/Evaporation Losses.
- Never render discontinuous, unexplained jumps in river vectors or budgets.

## 4. Helpful But Rigorously Critical (Anti-Sycophancy & Anti-Bloat)
- **Constructive Critical Pushback:** Do not reflexively agree with every proposed idea or feature. Actively evaluate whether an addition is actually necessary, whether authentic foundational data exists to support it, or whether it just adds noise, confusion, and AI slop.
- **Reject "More is More":** More charts, more pages, and more complex models are often worse. Defend simplicity, precision, and demonstrable truth over feature bloat. If an idea adds unnecessary complexity or premature analysis, push back with clear reasoning.
- **Honest Data Provenance & Verification:** Never invent placeholder formulas, extrapolate missing numbers, or declare something "completely fixed" unless every underlying data point and visual line has been physically verified against reality. If data does not exist or has not been downloaded yet, say so plainly rather than improvising.
- **No Sycophantic Cheerleading:** Ban empty praise and artificial cheerleading ("Great idea!", "Absolutely!", "100% solved!"). Maintain an objective, disciplined engineering partnership: identify edge cases, highlight data limitations, and ensure every concept and metric can be clearly and simply explained by the user in plain English.

## 5. Mandatory Changelog & Documentation Hygiene
- **Continuous Session Logging:** Every completed task or meaningful set of changes (features, bug fixes, refactors, domain calibrations) MUST be appended to both:
  1. `CHANGELOG.md` under the appropriate version header ([Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standard: Added, Changed, Fixed, Documented).
  2. `AI_LOG.md` under the `## Session Log` table (`| Date | Model Used | Task / Prompt Scope | Outcome & Human Verification |`).
- **No Silent Completes:** Never conclude a work session or feature milestone without updating the changelog and documenting the verification steps performed.

