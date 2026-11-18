// Cell-sector geometry and color helpers shared by the GIS Engine (TelecomMap.jsx) and the Dashboard
// Builder's Map chart — moved here verbatim from TelecomMap.jsx so both draw sectors identically.
// The latitude correction (longitude offsets ÷ cos(lat), CLAUDE.md's map geometry rule) lives in
// generateCoordinates AND getSectorTip — change both together.

// Smooth exponential zoomBoost — anchored at zoom 12, capped at 8 to prevent sector blowup
// at zoom 9-11: z9-11→8, z12→6, z13→3, z15+→1. Sectors appear starting at zoom 9.
export const computeZoomBoost = (zoom) => Math.min(8, Math.max(1, 6 * Math.pow(0.5, zoom - 12)));

// Arc tip at center azimuth — explicit mirror of generateCoordinates formula.
// generateCoordinates(lng, lat, az, radius_m, radius_m*zoomBoost, mapScale*20) uses:
//   factor = c_length / (69.093*9000) * (scale/20)  → *20 and /20 cancel
//   → factor = radius_m * zoomBoost * mapScale / (69.093*9000)
export const getSectorTip = (lat, lng, azimuth, radius_m, mapScale = 1, zoomBoost = 1) => {
  const c_length = radius_m * zoomBoost;
  const scale    = mapScale * 20;
  const factor   = c_length / (69.093 * 9000) * (scale / 20);
  const azRad    = azimuth * Math.PI / 180;
  // Longitude offset divided by cos(lat) — must stay identical to generateCoordinates
  // (see note there) so link endpoints land on the corrected sector tips.
  const lngScale = Math.cos(lat * Math.PI / 180);
  // OLD (no latitude correction — skewed sectors away from the equator):
  // return [lng + Math.sin(azRad) * factor, lat + Math.cos(azRad) * factor];
  return [lng + Math.sin(azRad) * factor / lngScale, lat + Math.cos(azRad) * factor];
};

export const hexToRgba = (hex, opacity = 1) => {

  if (!hex) return [0,150,255,255];

  const bigint = parseInt(hex.replace("#", ""), 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const a = Math.round(opacity * 255);

  return [r,g,b,a];

};

// Sector polygon: centre → arc of 10 points → centre. TelecomMap passes radius_m as `antBW` on purpose
// (see its sectorLayer's getPolygon note); a caller with a real beamwidth passes that instead.
export const generateCoordinates = (x, y, Dir, antBW, c_length, scale = 20) => {
    const coords = [];
    coords.push([x, y]);

    // original denominator (110 - scale) * 100 inverts at scale > 110 (mapScale > 5.5)
    // replaced with linear growth: same output at mapScale=1, keeps growing beyond 5.5
    const factor = c_length / (69.093 * 9000) * (scale / 20);

    // Latitude (skew) correction: 1° of longitude spans only cos(lat) × the distance of 1° of
    // latitude, so the east-west offset is divided by cos(lat). Without it sectors look fine near
    // the equator (Malawi, cos≈0.97) but are squashed/rotated at higher latitudes (Canada ~46°N,
    // cos≈0.69 → ~30% narrower, azimuths off by up to ~10°). Sizing (factor) is unchanged.
    // getSectorTip mirrors this — change both together.
    const lngScale = Math.cos(y * Math.PI / 180);
    

    for (let j = 10; j >= 1; j--) {
        const angle = (Dir - antBW / 2 + (antBW / 10) * j) * 0.01745329252;

        // OLD (no latitude correction — skewed sectors away from the equator):
        // const x1 = x + Math.sin(angle) * factor;
        const x1 = x + Math.sin(angle) * factor / lngScale;
        const y1 = y + Math.cos(angle) * factor;

        coords.push([x1, y1]);
    }

    coords.push([x, y]);
    return coords;
};

// ── Alternate sector, for testing (not used by the GIS Engine) ─────────────────────────────────────
// generateCoordinates above is what the GIS Engine draws, called with arc_setting's `length` as BOTH
// the opening and the reach (TelecomMap sectorLayer). Its quirks: the opening is L degrees from
// `length`, not the cell's beamwidth; the loop stops at j = 1, so the arc covers only 0.9 × L and
// sits L/20 clockwise of the azimuth; the reach is a drawing size
// (L × zoomBoost × mapScale / (69.093 × 9000) degrees), not metres.
// This one takes the "correct" parameters: the real beamwidth, centred on the azimuth (both arc ends
// included), and a reach in metres on the ground. The Dashboard Builder's Map chart can draw with it
// (Data → Location → "Sector geometry") to compare the two.
export const METERS_PER_DEGREE_LAT = 111320;

export const generateTrueSector = (x, y, azimuth, beamwidth, reachMeters, steps = 10) => {
  const coords = [[x, y]];
  const reachDeg = reachMeters / METERS_PER_DEGREE_LAT;
  // Same latitude correction as generateCoordinates (longitude offsets ÷ cos(lat)).
  const lngScale = Math.cos(y * Math.PI / 180);
  for (let j = 0; j <= steps; j++) {
    const angle = (azimuth - beamwidth / 2 + (beamwidth / steps) * j) * Math.PI / 180;
    coords.push([x + Math.sin(angle) * reachDeg / lngScale, y + Math.cos(angle) * reachDeg]);
  }
  coords.push([x, y]);
  return coords;
};

// The reach generateCoordinates draws, in metres — to keep the GIS size while fixing only the opening.
export const legacyReachMeters = (length, zoomBoost = 1, mapScale = 1) =>
  (length * zoomBoost * mapScale / (69.093 * 9000)) * METERS_PER_DEGREE_LAT;
