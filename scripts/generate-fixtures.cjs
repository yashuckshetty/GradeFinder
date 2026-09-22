const fs = require('fs');
const path = require('path');

function makeGPX(name, points) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="GradeFinder">\n  <trk>\n    <name>${name}</name>\n    <trkseg>\n`;
  for (const p of points) {
    xml += `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><ele>${p.ele.toFixed(2)}</ele></trkpt>\n`;
  }
  xml += `    </trkseg>\n  </trk>\n</gpx>\n`;
  return xml;
}

const dir = path.join(__dirname, '..', 'fixtures');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// 1. Tie Route (Climb 1: 100->200, Drop: 200->100, Climb 2: 100->200, Drop: 200->100)
// To ensure exact tie after rolling-average smoothing (window size 5), provide flat buffers at summits and troughs
const ptsTie = [];
let lat = 37.7749;
let lon = -122.4194;
const stepDist = 0.001; // ~111m

// Baseline flat
for (let i = 0; i < 5; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 100 });
// Climb 1
for (let i = 1; i <= 10; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 100 + i * 10 });
// Summit 1 flat
for (let i = 0; i < 5; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 200 });
// Drop 1
for (let i = 1; i <= 10; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 200 - i * 10 });
// Trough flat
for (let i = 0; i < 5; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 100 });
// Climb 2 (exact duplicate)
for (let i = 1; i <= 10; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 100 + i * 10 });
// Summit 2 flat
for (let i = 0; i < 5; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 200 });
// Drop 2
for (let i = 1; i <= 10; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 200 - i * 10 });
// End flat
for (let i = 0; i < 5; i++) ptsTie.push({ lat: lat + ptsTie.length * stepDist, lon, ele: 100 });

fs.writeFileSync(path.join(dir, 'tie-route.gpx'), makeGPX('Twin Peaks Tie Route', ptsTie));

// 2. Custom Upload Route (for comparison testing: e.g. Coastal Climb)
const ptsCustom = [];
for (let i = 0; i < 30; i++) {
  // Steady 5% climb over 3.3km: 50m to 215m
  ptsCustom.push({
    lat: lat + i * stepDist,
    lon: lon + i * 0.0005,
    ele: 50 + i * 5.5
  });
}
fs.writeFileSync(path.join(dir, 'custom-route.gpx'), makeGPX('Coastal Headland Ascent', ptsCustom));

console.log('Fixtures generated successfully in', dir);
