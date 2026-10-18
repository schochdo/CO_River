# Design & Engineering Principles (Anti-SaaS & Domain Integrity)

These rules are permanent constraints to prevent generic AI UI patterns, unnecessary jargon, and dimensional confusion across all coding and data visualization tasks.

## 1. Zero B2B SaaS Clutter & Vanity Elements
- **No Fake Versions or Build Tags:** Never display software version numbers (e.g. `v24.0`, `v1.2 Stable`, `Build 894`) on user-facing UI unless explicitly requested by the user.
- **No Vanity Status Pills:** Never add decorative green pulsing dots, "Live Telemetry Connected", "System Status: Optimal", or generic server health badges.
- **No Tech Jargon Padding:** Every word and label on screen must communicate verifiable domain facts. Never add fluff text or software engineering buzzwords just to fill screen real estate.
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
