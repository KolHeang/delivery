/**
 * គណនាចម្ងាយរវាងកូអរដោនេពីរតាមរូបមន្ត Haversine Formula (គិតជាម៉ែត្រ)
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // កាំផែនដីគិតជាម៉ែត្រ
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // ចម្ងាយគិតជាម៉ែត្រ
}

export function calculateDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return calculateDistanceInMeters(lat1, lon1, lat2, lon2) / 1000;
}

/**
 * វិភាគទាញយក Lat/Lng ពី Google Maps Link, URL ឬកូអរដោនេផ្ទាល់
 */
export function parseMapLinkOrCoords(
  input: string,
): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  const text = input.trim();

  // 1. Coordinates: "11.5564, 104.9282" or "11.55640 104.92820"
  const coordRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;

  // 2. Google Maps URL with @lat,lng
  const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;

  // 3. Google Maps URL with ?q=lat,lng or &q=lat,lng or ?ll=lat,lng
  const qRegex = /[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/;

  // 4. Google Maps place data with !3dlat!4dlng
  const dataRegex = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;

  // 5. geo:lat,lng
  const geoRegex = /geo:(-?\d+\.\d+),(-?\d+\.\d+)/;

  const m =
    text.match(atRegex) ||
    text.match(qRegex) ||
    text.match(dataRegex) ||
    text.match(geoRegex) ||
    text.match(coordRegex);

  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * ពិនិត្យមើលថាតើជា Shortened Google Maps URL ឬទេ
 */
export function isShortGoogleMapsUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const s = input.trim().toLowerCase();
  return (
    s.includes('maps.app.goo.gl') ||
    s.includes('goo.gl/maps') ||
    s.includes('bit.ly') ||
    s.includes('tinyurl.com')
  );
}

/**
 * បង្កើត Google Maps Web Link ពី Lat/Lng
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
