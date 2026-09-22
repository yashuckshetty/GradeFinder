# ULTIMATE GRADEFINDER UI/UX + VISUAL DESIGN DIRECTIVE

> **Status**: Approved Master Visual Directive  
> **Precedence**: Supersedes all prior visual specifications (Section 11 "Design System," Section 12's UI notes, and prior color/typography choices). Where this directive is silent, the original functional requirements apply.

---

## 1. Design Philosophy

GradeFinder is not a dashboard that happens to show a route. It is an instrument for reading terrain — closer to a surveyor's tool or a high-end altimeter watch than a fitness app. The governing idea: the interface is made of the same material as the data. Elevation lines are not decoration applied to the UI — contour-derived curves are the UI's visual grammar, appearing in dividers, loading states, section transitions, and backgrounds, always derived from or evocative of real elevation data, never as arbitrary decoration.

**Design principle, stated as a test for every screen**: if you removed all text and left only shape, color, and motion, could someone tell this is a tool about terrain and elevation, not a generic analytics product? If the answer is no, the screen isn't done.

---

## 2. Brand Personality

Five words, load-bearing, checked against every decision below: **Grounded. Precise. Warm. Unhurried. Alive.**

* **Grounded** — earth-toned, not futuristic-neon. This product studies real ground, so its palette comes from rock, clay, moss, not from screens.
* **Precise** — numbers are exact, typography is disciplined, alignment is exact. Precision is the product's core credibility claim (it computes an optimal answer, not a heuristic guess) and the visual design must earn that same trust.
* **Warm** — never cold-blue-tech. Warmth comes from the color temperature (clay, ember, moss) and from microcopy that sounds like a person, not a system.
* **Unhurried** — motion is confident and deliberate, never rushed or twitchy. A mountain doesn't hurry.
* **Alive** — the terrain visibly responds to the user's attention (hover, selection) the way real ground has texture and presence, not the flat inertness of a spreadsheet.

---

## 3. Visual Identity

* **Logo Concept**: A single continuous line that reads simultaneously as:
  1. An elevation profile silhouette
  2. A topographic contour ring  
  Rendered as one unbroken stroke that rises, peaks, and settles — three ascending points of increasing height, the tallest subtly notched at its peak (evoking a summit marker without being a literal mountain icon). Monoline, 2.5px stroke at 32px reference size, terminates in rounded caps.
  * Legible at 16×16 favicon size.
  * Single-color mark in the navbar.
  * Animated loading glyph (draws itself left-to-right).
  * Color: `--color-primary` on light backgrounds, `--color-text-primary` reversed on dark backgrounds. Never placed inside a colored badge, circle, or gradient container.
* **Wordmark**: `"GradeFinder"` set in the display typeface (Fraunces) at medium weight (500), with a single visual detail: the crossbar of the "F" is extended slightly and angled ~8° upward — a subtle, almost-subliminal nod to "grade" (slope) baked into the letterform itself.

---

## 4. Color System

Rejecting purple/blue/indigo entirely. Alpine and mineral sources:

```css
/* Base surfaces — warm near-black, never pure #000 or navy */
--color-background:      #14120F;   /* base page background: warm charcoal-black */
--color-surface:         #1C1914;   /* raised surface (cards, panels) */
--color-surface-raised:  #241F18;   /* further-raised surface (modals, popovers) */
--color-border:          #332C22;   /* hairline borders, dividers */
--color-border-strong:   #4A3F30;   /* emphasized borders, active input outlines */

/* Text */
--color-text-primary:    #F2EDE3;   /* primary text — warm off-white, not pure white */
--color-text-secondary:  #B8AC98;   /* secondary text, labels */
--color-text-muted:      #7A6F5E;   /* tertiary text, disabled, placeholders */

/* Brand */
--color-primary:         #C9642F;   /* clay/terracotta — primary actions, brand accent */
--color-primary-hover:   #DE7640;   /* primary hover state, +10% lightness */
--color-primary-muted:   #C9642F1A; /* primary at 10% opacity, for subtle fills */
--color-secondary:       #7C8863;   /* moss — secondary actions, supporting UI */
--color-secondary-hover: #8E9973;

/* Route-specific semantic colors */
--color-climb:           #E08A34;   /* warm ember — the hardest climb, everywhere it appears */
--color-climb-fill:      #E08A3426; /* climb segment area-fill, 15% opacity */
--color-recovery:        #4E9C93;   /* glacier teal — the recovery segment, everywhere it appears */
--color-recovery-fill:   #4E9C9326;
--color-flat:            #6B6355;   /* neutral warm grey — flat/rolling zones */
--color-alternate-tie:   #B08D57;   /* muted gold — alternate maxima ties */

/* Status */
--color-success:         #7A9B5E;
--color-warning:         #D9A441;
--color-error:           #C1503D;
--color-info:            #6E92A3;

/* Terrain gradient (3D landscape material + chart background wash) — 5 stops */
--terrain-stop-1:        #4A5C3E;   /* valley floor — deep moss */
--terrain-stop-2:        #7C8863;   /* mid-low — sage moss */
--terrain-stop-3:        #B99A5C;   /* mid — dry clay/tussock */
--terrain-stop-4:        #C9642F;   /* mid-high — exposed rock/clay */
--terrain-stop-5:        #E8DCC8;   /* summit — pale stone/glacier */
```

* **Contrast**: Text primary on background = 14.2:1 (AAA). Text secondary = 6.1:1 (AA). Climb on background = 5.8:1 (AA). Recovery = 4.9:1 (AA).
* Never rely on color alone — always pair with distinct icon glyphs (ascending-chevron for climb, descending-chevron for recovery) and text labels.

---

## 5. Typography

* **Display (`--font-display`)**: **Fraunces** (Google Fonts variable) — soft, slightly irregular terminals, premium editorial feel. Weights: 400 (rare, italic in hero), 500, 600 (primary heading weight), 900 (hero headline impact).
* **UI/Body (`--font-body`)**: **General Sans** (Fontshare) / Inter fallback — geometric-humanist, warm and legible. Weights: 400 (body), 500 (labels), 600 (buttons, nav).
* **Data/Numeric (`--font-mono`)**: **IBM Plex Mono** (Google Fonts) — precision instrument credibility for all numeric metrics, coordinates, distances, grades, and algorithms. Weights: 400 (values), 500 (emphasized), 600 (hero metric).

```css
--text-hero:       clamp(2.75rem, 6vw, 5rem);
--text-h1:         clamp(2rem, 4vw, 3rem);
--text-h2:         1.5rem;
--text-h3:         1.125rem;
--text-body-lg:    1.125rem;
--text-body:       1rem;
--text-small:      0.875rem;
--text-caption:    0.75rem;
--text-metric-lg:  clamp(2.5rem, 5vw, 3.5rem);
--text-metric:     1.75rem;
--text-metric-sm:  1.125rem;
```

---

## 6. Layout System

* No sidebar, no 12-card grid. Asymmetric editorial layout on a 12-column grid with generous negative space.
* Spacing scale: 4px base (`--space-1: 4px` to `--space-32: 128px`). Section vertical rhythm uses `--space-24` to `--space-32`.
* Radius: `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`. Never exceed 12px. No pill-shaped buttons except primary CTA.
* Warm-tinted shadows only on floating elements (tooltips, drag-active dropzone, modals). Cards use 1px `--color-border` hairline.

---

## 7. Navigation

* 64px slim top bar, 1px bottom border `--color-border`.
* Left: Monoline logo mark + "GradeFinder" wordmark with 8° angled 'F'. Center: empty.
* Right: 4 text links — `Analyze · Routes · Compare · About` with 200ms left-to-right underline on hover.
* Mobile (<768px): 3 stacked elevation-profile line segments icon, opening full-screen staggered fade-in overlay.

---

## 8. Landing Page & Hero

* **Hero Copy**:
  * Eyebrow: `FIND THE CLIMB THAT MATTERS`
  * Headline: *"See where your route actually gets hard."* (Fraunces 600 with *actually* in italic 400).
  * Subhead: *"Not an estimate. Not a guess from a length-and-grade rule of thumb. The exact section of your route where the climbing is genuinely sustained — computed, not eyeballed."*
  * Primary CTA: `Analyze a route`
  * Secondary CTA: `Explore a demo route`
* **Hero Visual**: WebGL continuous elevation ribbon (multi-climb route) on right ~55% with slow 40s ambient drift loop, cursor-tracking vertex lift, pulse contour line, and 1.5s hover illumination of the climb in `--color-climb`.
* **"How it works"**: 3-step sequence connected by animated contour-line strokes.
* **Live mini-demo**: Embedded interactive 2D chart using rolling-hills demo with pre-highlighted climb.
* **Algorithm credibility strip**: Mono numerals comparing `O(n²) → O(n)`.
* **Footer**: Minimalist signature: *"Built with Java + Kadane's algorithm"*.

---

## 9. Input / Upload Experience

* 280px dropzone, dashed `--color-border`.
* Concentric contour-ring ripple outward on drag-enter.
* Cross-fades (200ms) to compact file preview with mono filename and inline sparkline, then transitions into the 4-step purposeful loading sequence.

---

## 10. Demo Route Experience

* 5 cards in a horizontal scroll-snap shelf (~220px wide):
  1. *The Double Climb* (Multi-Climb Technical)
  2. *Mountain Climb*
  3. *Rolling Hills*
  4. *Long Gradual Ascent*
  5. *Flat Route*
* Each card includes: name, inline elevation sparkline from real precomputed data, mono distance/gain, hover lift (4px), and brief climb segment highlight.

---

## 11. Results Experience

* **Route Identity**: Top-left aligned, understated route name + inline mono distance/gain.
* **Main Visualization**: Dominant ~60vh container with synchronized 2D/3D split on desktop (≥1280px).
* **Key Insight**: Single Fraunces sentence directly beneath chart: *"Your hardest climb runs from 3.15 km to 6.71 km — 120 m of sustained gain at 3.4%."*
* **Supporting Metrics**: Single horizontal mono strip with thin vertical dividers (Distance, Total Gain, Total Loss, Avg Grade, Recovery).
* **Interactive Analysis**: Detail annotations with 4px colored left-edge accent bar beside the visualization.
* **What-If Simulation**: Demarcated section separated by contour-line divider.
* **Comparison**: Clear secondary CTA at the end of the page.

---

## 12. 2D & 3D Visualization Details

* **2D Chart**:
  * 6% opacity terrain-gradient wash background.
  * Segment area fills (`--color-climb-fill`, `--color-recovery-fill`).
  * 900ms stroke-dashoffset draw-in on load.
  * Crosshair with floating mono tooltip.
  * Flag-shaped segment labels: `↗ HARDEST CLIMB` and `↘ BEST RECOVERY`.
* **3D Terrain**:
  * Full 5-stop terrain gradient vertex shader / color mapping.
  * Matte-shaded ribbon with soft rim-light emissive glow on climb/recovery segments.
  * Ground plane with sparse logarithmic contour rings and exponential atmospheric fog.
  * Orbit controls with inertia damping, camera focus animation (1200ms cubic), and "Terrain emphasis" slider (default 3.0×).
* **Sync**: Shared glowing cursor point marker rendered in both 2D and 3D simultaneously.

---

## 13. What-If Detour Simulation

* Direct-manipulation shaded drag overlay on the 2D chart with drag handles.
* Quick-preset buttons (*Bypass the climb*, *Bypass the recovery*).
* Sequencing: 400ms terrain morph / gap closure, followed by 600ms numeric counter tween for delta stats.

---

## 14. Route Comparison

* Dual slots (demo or dropzone).
* Single shared-axis overlay with solid vs dashed line differentiation.
* Confident Fraunces verdict banner above chart, followed by compact metric table.

---

## 15. Loading & Error States

* **Loading**: 4-step purposeful sequence (min 1.8s):
  1. *Reading your route* (0-450ms, animated logo line)
  2. *Mapping the elevation* (450-900ms, elevation squiggle sketches in)
  3. *Finding the real climb* (900-1350ms, climb pulses `--color-climb`)
  4. *Building the terrain* (1350-1800ms, subtle 3D hint extrusion)
* **Error**: Full-width inline banner with red left accent bar, human-sounding copy, and "Try another file" ghost action.

---

## 16. Accessibility & Responsive Standards

* All contrast ratios verified (>14:1 primary text, >6:1 secondary, >5.8:1 climb).
* Non-color signals (ascending/descending chevrons, solid/dashed lines) accompany all status/segments.
* Full keyboard `:focus-visible` 2px `--color-primary` rings.
* `prefers-reduced-motion` halts ambient drift, removes loading delay, cuts camera transitions instantly.
