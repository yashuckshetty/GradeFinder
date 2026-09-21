# GradeFinder

> **High-Precision Topographic Route Analysis, Climb Detection & What-If Simulation Engine**

GradeFinder is an engineering-grade elevation profile analyzer for endurance athletes, race directors, and route planners. It detects sustained climbs and recovery segments from GPX track files using a specialized **Kadane algorithm with bounded descent tolerance**, offers interactive **2D profile charts** and **3D terrain ribbons with bidirectional hover-sync**, enables **what-if detour simulations**, and provides **head-to-head route comparisons**.

---

## 🚀 Key Features

- **Algorithmic Climb & Recovery Detection**: Evaluates true sustained climbing efforts rather than noisy instantaneous gradient spikes or naive start-to-summit approximations.
- **Dual-Metric Transparency**: Explicitly computes and presents both **Net Elevation Change** ($\text{Elevation}_{\text{peak}} - \text{Elevation}_{\text{start}}$) and **Cumulative Step Sum** ($\sum \max(0, \Delta E_i)$) with non-monotonicity warning badges.
- **Disjoint Recovery Window**: Evaluates recovery over candidate regions excluding the primary climb window, ensuring zero segment overlap across flat valleys.
- **Split 2D + 3D Synchronized View**:
  - **2D Elevation Profile**: Interactive Recharts canvas with climb/recovery shaded bands and dynamic hover crosshair.
  - **3D Terrain Ribbon**: GPU-accelerated Three.js terrain mesh with elevation exaggeration and dynamic vertex shaders.
  - **Bidirectional Hover-Sync**: Hovering either the 2D chart or 3D terrain ribbon updates the other in real-time.
- **What-If Detour Simulator**: Splice out steep climbs or road closures with live recalculation of distance, gain, loss, and climb index transitions.
- **Head-to-Head Route Comparison**: Topographic comparison table and natural-language severity assessments.
- **Hardened Security & Performance**: Native defense against XML External Entity (XXE) attacks, $O(N)$ linear time processing, and sub-15ms P50 latency.
- **Accessibility**: Full WCAG 2.1 AA compliance with high-contrast color palettes and complete keyboard navigation.

---

## 🧠 Core Algorithm: Kadane with Bounded Descent Tolerance

### 1. The Telescoping Property
Given a route of $N$ points with elevations $E_0, E_1, \dots, E_{N-1}$, the step deltas are:
$$\Delta_i = E_{i+1} - E_i$$
By telescoping summation:
$$\sum_{k=i}^{j-1} \Delta_k = E_j - E_i$$
Maximizing the subarray sum $\sum_{k=i}^{j-1} \Delta_k$ directly maximizes the net elevation gain between start point $i$ and summit point $j$.

### 2. Bounded Descent Tolerance
Standard Kadane's algorithm resets whenever the running sum drops below zero. However, natural cycling climbs contain minor dips (rollers) that an athlete absorbs without breaking the continuity of the climb.

GradeFinder tracks:
- `currentGain`: Running net elevation gain from `currentStart`.
- `currentPeakEnd`: Index of the highest point reached so far in the candidate climb.
- `descentSinceLastPeak`: Accumulated descent since `currentPeakEnd`.

If a descending step occurs, `descentSinceLastPeak` increases. If `descentSinceLastPeak \le \text{tolerance}` (default $3.0\text{ m}$), the dip is absorbed. If `descentSinceLastPeak > \text{tolerance}`, the climb is considered genuinely broken, the candidate is finalized at `currentPeakEnd`, and a restart occurs.

### 3. Kadane Negative-Sum Reset (Invariant I5)
A critical correctness requirement is that tolerance absorption must **never** cause the algorithm to retain a strictly worse starting point than an available better one. Whenever `currentGain < 0` at any point in the route, the algorithm resets immediately (`currentStart = i + 1, currentGain = 0`), regardless of whether `descentSinceLastPeak` has exceeded tolerance.

### 4. Disjoint Segment Logic (Climb Exclusion)
Flat valleys between climbs (such as long plateaus where $\Delta_i = 0$) can be absorbed by both climb and recovery algorithms because zero deltas incur zero penalty. To guarantee mathematical disjointness:
1. The engine detects the primary `maxClimbSegment` over $[ \text{climbStart}, \text{climbEnd} ]$.
2. The recovery search (`negate = true`) evaluates candidate regions **excluding** $[ \text{climbStart}, \text{climbEnd} ]$.
3. The engine evaluates candidate windows on **both sides** of the excluded climb interval (before and after) as well as detecting alternate maxima ties across the disjoint boundary.

---

## 📊 Dual-Metric Philosophy

In endurance sports, confusion often arises between two distinct definitions of elevation gain:
1. **Net Gain**: The topographic displacement from start to peak ($E_{\text{summit}} - E_{\text{base}}$).
2. **Cumulative Ascent**: The sum of all upward micro-steps along the trail ($\sum \max(0, \Delta E_i)$).

If a 120m hill has small rollers adding 1.6m of dips, the Net Gain is **120.0m**, while Cumulative Ascent is **121.6m**.
GradeFinder rejects the practice of silently picking one and hiding the other. Both metrics are computed on the backend, exposed in DTOs, and displayed side-by-side with clarity badges (`⚠️ Non-monotonic (+ minor dips)` vs `✓ Pure Ascent`).

---

## 🔒 Security & Performance

### XXE Injection Prevention
GradeFinder's `GpxParser` configures Java SAX parsers with:
- `http://apache.org/xml/features/disallow-doctype-decl = true`
- `http://xml.org/sax/features/external-general-entities = false`
- `http://xml.org/sax/features/external-parameter-entities = false`
Crafted XML payloads attempting to exfiltrate local files via `<!DOCTYPE ... <!ENTITY ... SYSTEM "file:///...">>` are rejected with `InvalidGpxException` before entity expansion.

### Benchmark & Stress Results
Tested on realistic multi-pass elevation profiles:
- **Realistic Route (2,000 pts / ~60 km)**:
  - **Min**: 6 ms | **P50**: **10 ms** | **P90**: 16 ms | **P99**: **21 ms**
- **Large-File Stress (10,000 pts / ~150 km)**:
  - Parse: 15 ms | Analysis: 3 ms | Total Pipeline: **18 ms**
- **Extreme-Density Stress (50,000 pts)**:
  - Total pipeline: **145 ms** with strict linear memory scaling and zero OOM risk.

---

## ♿ Accessibility & Visual Polish

- **WCAG 2.1 AA Contrast**: High-contrast dark theme. Text elements provide contrast ratios exceeding AA/AAA standards:
  - Primary text (`#f0f4f8`): **14.4:1** on surface cards (`#1a2234`) and **17.6:1** on page background (`#0a0e17`), exceeding AAA (7:1).
  - Secondary text (`#94a3b8`): **6.2:1** on surface cards, exceeding AA (4.5:1).
  - Muted text (`#90a0b7`): **6.0:1** on surface cards, exceeding AA (4.5:1).
  - Positive delta indicators (`#10b981`): **7.4:1**.
- **Visible Keyboard Focus**: Distinct focus rings (`:focus-visible`) with a 2px indigo outline and 4px glow ring across all interactive controls.
- **Prefers-Reduced-Motion**: Automatically disables micro-animations and smooth transitions when the system accessibility setting is detected.

---

## ⚠️ Known Limitations

1. **Sensor & GPS Accuracy**: GradeFinder performs moving-average smoothing (default 5-point window) to reduce altitude jitter, but cannot correct for fundamental GPS multipath errors, tunnel signal loss, or barometric weather drift present in raw GPX recordings.
2. **Single-Route Topography**: The analysis models the geographic sequence of coordinates. It does not account for wind velocity/direction, surface rolling resistance (e.g. tarmac vs gravel), or rider power output.
3. **Sequential Track Assumption**: Splicing detours assumes a linear path between cut points; it does not perform automated road-network routing around obstacles.

---

## 🛠️ Getting Started

### Prerequisites
- **Java**: JDK 21 or JDK 23
- **Node.js**: v20 or v22+
- **npm**: v9+

### Running the Backend
```bash
cd backend
./mvnw clean spring-boot:run
```
The API server starts on `http://localhost:8080`.

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server starts on `http://localhost:5173` (proxies `/api` requests to `:8080`).

### Running Tests
- **Backend Tests (65 tests)**:
  ```bash
  cd backend
  ./mvnw test
  ```
- **Reproduce Latency Benchmark & Stress Test (50k pts / 2k pts P50/P99)**:
  ```bash
  cd backend
  ./mvnw test -Dtest=RoutePerformanceStressTest
  ```
  Runs the 25-iteration statistical benchmark and 10k/50k point stress suite, outputting live millisecond telemetry directly to the console.
- **Frontend Tests (8 tests)**:
  ```bash
  cd frontend
  npm test
  ```
