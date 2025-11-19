import fetch from "node-fetch";
import config from "../config/index.js";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_REGION = config.geocode.defaultRegion;
const USER_AGENT = "DisasterResponseOptimizer/1.0";

/**
 * Geocode a human readable location into latitude/longitude using OSM Nominatim.
 * @param {string} location
 * @returns {Promise<{lat:number, lon:number, formattedAddress:string} | null>}
 */
export async function geocodeLocation(location) {
  if (!location) {
    return null;
  }

  const query = DEFAULT_REGION ? `${location}, ${DEFAULT_REGION}` : location;
  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocode request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`No geocode results for: "${query}"`);
      return null;
    }

    const result = data[0];
    console.log(`✓ Geocoded "${location}" → ${result.lat}, ${result.lon}`);

    return {
      lat: Number(result.lat),
      lon: Number(result.lon),
      formattedAddress: result.display_name,
    };
  } catch (error) {
    console.error("Error geocoding location:", error.message);
    return null;
  }
}
