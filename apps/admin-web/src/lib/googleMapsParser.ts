/**
 * Comprehensive Google Maps Link, Plus Code, and Geographic Coordinate Parser
 * Supports:
 * 1. Short links (maps.app.goo.gl/xxx, goo.gl/maps/xxx)
 * 2. Standard Google Maps URLs (@lat,lng, ?q=lat,lng, !3dlat!4dlng)
 * 3. Open Location Code / Plus Codes (FH23+G88, 6JXVFH23+G88)
 * 4. Raw Coordinates ("9.4475, 77.5450")
 * 5. Degree Minute Seconds (9°26'51.0"N 77°32'42.0"E)
 * 6. Place Search Queries via OpenStreetMap / Photon geocoding
 */

export interface ParsedLocation {
  latitude: number;
  longitude: number;
  label?: string;
  isExtracted: boolean;
}

export interface ParsedRouteEndpoints {
  start?: ParsedLocation;
  end?: ParsedLocation;
  isExtracted: boolean;
}

const PLUS_CODE_CHARS = '23456789CFGHJMPQRVWX';
const DEFAULT_REF_LAT = 9.4533; // College Region Reference
const DEFAULT_REF_LNG = 77.5562;

/**
 * Decode an Open Location Code (Plus Code)
 */
export function decodePlusCode(code: string, refLat = DEFAULT_REF_LAT, refLng = DEFAULT_REF_LNG): ParsedLocation | null {
  if (!code || typeof code !== 'string') return null;
  const match = code.toUpperCase().match(/([23456789CFGHJMPQRVWX]{2,8})\+([23456789CFGHJMPQRVWX]{2,4})/);
  if (!match) return null;

  const prefix = match[1];
  const suffix = match[2];

  let fullCode = '';
  if (prefix.length >= 8) {
    fullCode = prefix + suffix;
  } else {
    const areaPrefix = getAreaPrefix(refLat, refLng);
    if (prefix.length === 4) {
      fullCode = areaPrefix + prefix + suffix;
    } else if (prefix.length === 6) {
      fullCode = areaPrefix.substring(0, 2) + prefix + suffix;
    } else {
      fullCode = areaPrefix + prefix + suffix;
    }
  }

  let lat = -90, lng = -180;
  let latRes = 20, lngRes = 20;
  for (let i = 0; i < Math.min(fullCode.length, 10); i += 2) {
    const latIdx = PLUS_CODE_CHARS.indexOf(fullCode[i]);
    const lngIdx = PLUS_CODE_CHARS.indexOf(fullCode[i + 1]);
    if (latIdx === -1 || lngIdx === -1) return null;
    lat += latIdx * latRes;
    lng += lngIdx * lngRes;
    latRes /= 20;
    lngRes /= 20;
  }

  const latitude = parseFloat((lat + (latRes * 10)).toFixed(6));
  const longitude = parseFloat((lng + (lngRes * 10)).toFixed(6));

  if (isValidLatLng(latitude, longitude)) {
    return { latitude, longitude, label: `Plus Code (${code})`, isExtracted: true };
  }
  return null;
}

function getAreaPrefix(lat: number, lng: number): string {
  let latVal = lat + 90;
  let lngVal = lng + 180;
  let code = '';
  let latRes = 20, lngRes = 20;
  for (let i = 0; i < 2; i++) {
    const latIdx = Math.floor(latVal / latRes);
    const lngIdx = Math.floor(lngVal / lngRes);
    code += PLUS_CODE_CHARS[latIdx] + PLUS_CODE_CHARS[lngIdx];
    latVal -= latIdx * latRes;
    lngVal -= lngIdx * lngRes;
    latRes /= 20;
    lngRes /= 20;
  }
  return code;
}

/**
 * Synchronous parser for direct coordinates, decoded URLs, and Plus Codes
 */
export function parseGoogleMapsLink(input: string): ParsedLocation | null {
  if (!input || typeof input !== 'string') return null;
  let text = input.trim();
  try {
    text = decodeURIComponent(text.replace(/%2B/gi, '+'));
  } catch {
    // Keep original
  }

  // 1. Raw Coordinates: "9.4475, 77.5450" or "9.4475,77.5450" or "9.4475 77.5450"
  const rawCoordRegex = /^([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)$/;
  const rawMatch = text.match(rawCoordRegex);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng, isExtracted: true };
    }
  }

  // 2. Plus Code in text or URL e.g. "FH23+G88" or "place/FH23+G88+Rajapalayam"
  const plusCodeMatch = text.match(/([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})/i);
  if (plusCodeMatch) {
    const plusResult = decodePlusCode(plusCodeMatch[1]);
    if (plusResult) {
      // Extract place name if present e.g. "place/FH23+G88+Rajapalayam+Market,..."
      const placeMatch = text.match(/place\/[^/]*?(?:[A-Z0-9+]+\+[^/]+?[,+])([^,/]+)/i) || text.match(/place\/([^,/]+)/);
      if (placeMatch && placeMatch[1]) {
        plusResult.label = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
      }
      return plusResult;
    }
  }

  // 3. Google Maps URL with @lat,lng e.g. /@9.447500,77.545000,15z
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng, isExtracted: true };
    }
  }

  // 4. Query param q=lat,lng or ll=lat,lng e.g. ?q=9.4475,77.5450 or ?ll=9.4475,77.5450
  const queryMatch = text.match(/[?&](?:q|ll|query|center)=(-?\d+\.\d+)[,%20]+(-?\d+\.\d+)/i);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng, isExtracted: true };
    }
  }

  // 5. Place URL with !3dlat!4dlng (Google Maps Embeds / Share Links)
  const embedMatch = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (embedMatch) {
    const lat = parseFloat(embedMatch[1]);
    const lng = parseFloat(embedMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng, isExtracted: true };
    }
  }

  // 6. Degree Minute Second format e.g. 9°26'51.0"N 77°32'42.0"E
  const dmsMatch = text.match(/(\d+)°(\d+)'([\d.]+)"([NSEW])[,\s]+(\d+)°(\d+)'([\d.]+)"([NSEW])/i);
  if (dmsMatch) {
    const lat = dmsToDecimal(
      parseFloat(dmsMatch[1]),
      parseFloat(dmsMatch[2]),
      parseFloat(dmsMatch[3]),
      dmsMatch[4]
    );
    const lng = dmsToDecimal(
      parseFloat(dmsMatch[5]),
      parseFloat(dmsMatch[6]),
      parseFloat(dmsMatch[7]),
      dmsMatch[8]
    );
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng, isExtracted: true };
    }
  }

  // 7. Generic decimal number pair inside any URL string
  const genericMatch = text.match(/(-?\d{1,2}\.\d{3,})[^\d.-]+(-?\d{1,3}\.\d{3,})/);
  if (genericMatch) {
    const lat = parseFloat(genericMatch[1]);
    const lng = parseFloat(genericMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng, isExtracted: true };
    }
  }

  return null;
}

/**
 * Asynchronous location resolver that supports short links (maps.app.goo.gl),
 * Plus Codes, redirects, and place name geocoding.
 */
export async function resolveLocationInput(input: string): Promise<ParsedLocation | null> {
  if (!input || typeof input !== 'string') return null;
  const text = input.trim();

  // 1. First attempt synchronous direct extraction
  const direct = parseGoogleMapsLink(text);
  if (direct) return direct;

  // 2. Short Link Resolver (e.g. maps.app.goo.gl or goo.gl/maps)
  if (text.includes('maps.app.goo.gl') || text.includes('goo.gl/maps') || text.includes('maps.google.com')) {
    // A. Local Vite server unshortener endpoint (Instant & 100% CORS-free)
    try {
      const res = await fetch(`/api/unshorten?url=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        const targetUrl = json.redirectUrl || '';
        if (targetUrl) {
          const parsed = parseGoogleMapsLink(targetUrl);
          if (parsed) return parsed;
        }
      }
    } catch {
      // Fallback below
    }

    // B. Secondary unshorten proxy fallback
    try {
      const unshortenRes = await fetch(`https://unshorten.me/json/${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(4000) });
      if (unshortenRes.ok) {
        const json = await unshortenRes.json();
        if (json.resolved_url) {
          const parsed = parseGoogleMapsLink(json.resolved_url);
          if (parsed) return parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Fallback: Try geocoding as a landmark/place name (e.g. "Rajapalayam Market")
  if (text.length > 2 && !text.startsWith('http')) {
    const placeResult = await geocodePlaceName(text);
    if (placeResult) return placeResult;
  }

  return null;
}

/**
 * Free geocoding using OpenStreetMap Nominatim
 */
export async function geocodePlaceName(query: string): Promise<ParsedLocation | null> {
  try {
    const cleanQuery = query.trim();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (isValidLatLng(lat, lng)) {
          return {
            latitude: lat,
            longitude: lng,
            label: data[0].display_name ? data[0].display_name.split(',')[0] : cleanQuery,
            isExtracted: true,
          };
        }
      }
    }
  } catch {
    // Return null on failure
  }
  return null;
}

/**
 * Parse Google Maps Directions link containing both Start & Destination points.
 */
export function parseGoogleMapsDirections(input: string): ParsedRouteEndpoints {
  if (!input) return { isExtracted: false };

  const dirMatch = input.match(
    /\/dir\/(-?\d+\.\d+)[,%20]+(-?\d+\.\d+)\/(-?\d+\.\d+)[,%20]+(-?\d+\.\d+)/
  );

  if (dirMatch) {
    const startLat = parseFloat(dirMatch[1]);
    const startLng = parseFloat(dirMatch[2]);
    const endLat = parseFloat(dirMatch[3]);
    const endLng = parseFloat(dirMatch[4]);

    return {
      start: isValidLatLng(startLat, startLng) ? { latitude: startLat, longitude: startLng, isExtracted: true } : undefined,
      end: isValidLatLng(endLat, endLng) ? { latitude: endLat, longitude: endLng, isExtracted: true } : undefined,
      isExtracted: true,
    };
  }

  // Single point fallback
  const single = parseGoogleMapsLink(input);
  if (single) {
    return {
      start: single,
      isExtracted: true,
    };
  }

  return { isExtracted: false };
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let dd = degrees + minutes / 60 + seconds / (60 * 60);
  if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
    dd = dd * -1;
  }
  return parseFloat(dd.toFixed(6));
}
