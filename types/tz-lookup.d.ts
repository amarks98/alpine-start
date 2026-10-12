declare module 'tz-lookup' {
  /**
   * Coordinates to an IANA timezone, synchronously and offline.
   * Throws on NaN or out-of-range input — validate before calling.
   */
  export default function tzlookup(lat: number, lng: number): string
}
