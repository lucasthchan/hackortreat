// Solar position maths (low-precision almanac formulas, accurate to well under a degree).
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Point on Earth where the sun is directly overhead at `date`. */
export function subsolarPoint(date) {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000; // days since J2000
  const g = (357.529 + 0.98560028 * d) * RAD; // mean anomaly
  const q = 280.459 + 0.98564736 * d; // mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD; // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * RAD; // obliquity
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) * DEG; // right ascension (deg)
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) * DEG;
  const gmst = (18.697374558 + 24.06570982441908 * d) * 15; // sidereal time (deg)
  let lon = (ra - gmst) % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat: dec, lon };
}

/** Sun altitude above the horizon in degrees. */
export function sunAltitude(lat, lon, date) {
  const s = subsolarPoint(date);
  const sinAlt =
    Math.sin(lat * RAD) * Math.sin(s.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(s.lat * RAD) * Math.cos((lon - s.lon) * RAD);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG;
}

/** Night = sun's upper limb below the horizon (standard sunset definition). */
export function isNight(lat, lon, date) {
  return sunAltitude(lat, lon, date) < -0.833;
}

/**
 * Next moment the place switches state (night→day or day→night), searched forward
 * in 5-minute steps then refined. Returns null if no change within `maxHours` (polar day/night).
 */
export function nextTransition(lat, lon, from, maxHours = 48) {
  const start = isNight(lat, lon, from);
  const step = 5 * 60000;
  const t0 = from.getTime();
  for (let t = t0 + step; t <= t0 + maxHours * 3600000; t += step) {
    if (isNight(lat, lon, new Date(t)) !== start) {
      let lo = t - step;
      let hi = t;
      while (hi - lo > 15000) {
        const mid = (lo + hi) / 2;
        if (isNight(lat, lon, new Date(mid)) !== start) hi = mid;
        else lo = mid;
      }
      return new Date(hi);
    }
  }
  return null;
}
