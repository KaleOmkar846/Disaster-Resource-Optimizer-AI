import Need from "../models/NeedModel.js";
import { logger } from "../utils/appLogger.js";

// Clustering thresholds
const RADIUS_METERS = 1000;
const TIME_WINDOW_MINUTES = 60;
const TEXT_SIMILARITY_THRESHOLD = 0.35;

/**
 * Calculate Haversine distance between two coordinate pairs in meters.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convert a radius in meters to an approximate lat/lng bounding box offset.
 */
function metersToDegreeOffset(meters) {
  return meters / 111320;
}

/**
 * Extract significant keywords from text (locations, disaster terms).
 * Filters out common stop words to focus on meaningful tokens.
 */
function extractKeywords(text) {
  if (!text) return new Set();
  const stopWords = new Set([
    "i",
    "we",
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "at",
    "in",
    "on",
    "to",
    "for",
    "of",
    "and",
    "or",
    "but",
    "it",
    "my",
    "our",
    "please",
    "help",
    "need",
    "send",
    "there",
    "has",
    "have",
    "been",
    "can",
    "very",
    "so",
    "with",
    "from",
    "into",
    "that",
    "this",
    "people",
    "us",
    "me",
    "they",
    "them",
    "some",
    "out",
    "up",
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w)),
  );
}

/**
 * Compute Jaccard similarity between two keyword sets (0..1).
 */
function keywordSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Find an existing cluster via geographic proximity.
 * No longer requires exact needType match — geo + time is sufficient.
 */
async function findByLocation(coordinates) {
  if (!coordinates?.lat || !coordinates?.lng) return null;

  const cutoff = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000);
  const offset = metersToDegreeOffset(RADIUS_METERS);

  const candidates = await Need.find({
    isDuplicate: { $ne: true },
    "coordinates.lat": {
      $gte: coordinates.lat - offset,
      $lte: coordinates.lat + offset,
    },
    "coordinates.lng": {
      $gte: coordinates.lng - offset,
      $lte: coordinates.lng + offset,
    },
    createdAt: { $gte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

  for (const candidate of candidates) {
    const dist = haversineDistance(
      coordinates.lat,
      coordinates.lng,
      candidate.coordinates.lat,
      candidate.coordinates.lng,
    );
    if (dist <= RADIUS_METERS) {
      logger.info(
        `Geo duplicate: ${dist.toFixed(0)}m from need ${candidate._id}`,
      );
      return candidate;
    }
  }
  return null;
}

/**
 * Fallback: find an existing cluster via text/keyword similarity.
 * Used when coordinates are NULL (geocoding failed).
 * Compares extracted location text AND raw message keywords.
 */
async function findByText(rawMessage, triageLocation) {
  const cutoff = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000);

  const candidates = await Need.find({
    isDuplicate: { $ne: true },
    createdAt: { $gte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  if (candidates.length === 0) return null;

  const incomingKeywords = extractKeywords(rawMessage);
  const incomingLocKeywords = extractKeywords(triageLocation);

  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    // Compare location strings first (higher weight)
    const candLocKeywords = extractKeywords(candidate.triageData?.location);
    const locSim = keywordSimilarity(incomingLocKeywords, candLocKeywords);

    // Compare full message keywords
    const candMsgKeywords = extractKeywords(candidate.rawMessage);
    const msgSim = keywordSimilarity(incomingKeywords, candMsgKeywords);

    // Weighted score: location match matters more
    const score = locSim * 0.6 + msgSim * 0.4;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  if (bestScore >= TEXT_SIMILARITY_THRESHOLD && bestMatch) {
    logger.info(
      `Text duplicate (score=${bestScore.toFixed(2)}) matched with need ${bestMatch._id}`,
    );
    return bestMatch;
  }

  return null;
}

/**
 * Main entry point: find an existing cluster for deduplication.
 * Tries geo-based first, falls back to text-based.
 */
export async function findDuplicateCluster(
  coordinates,
  needType,
  rawMessage,
  triageLocation,
) {
  // Try geo-based clustering first
  const geoMatch = await findByLocation(coordinates);
  if (geoMatch) return geoMatch;

  // Fallback to text-based clustering (handles NULL coords)
  const textMatch = await findByText(rawMessage, triageLocation);
  return textMatch;
}

/**
 * Link a newly saved Need to an existing cluster's primary Need.
 * Increments the duplicateCount on the primary record.
 */
export async function linkToCluster(newNeed, primaryNeed) {
  newNeed.clusterId = primaryNeed.clusterId || primaryNeed._id;
  newNeed.isDuplicate = true;
  await newNeed.save();

  await Need.findByIdAndUpdate(primaryNeed._id, {
    $inc: { duplicateCount: 1 },
  });

  logger.info(`Need ${newNeed._id} linked to cluster ${newNeed.clusterId}`);
}
