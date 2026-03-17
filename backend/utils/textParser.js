const LOCATION_HINT_PATTERNS = [
  /at\s+([^.,;!?]+)/i,
  /near\s+([^.,;!?]+)/i,
  /in\s+([^.,;!?]+)/i,
  /(?:@|location:?)\s*([^.,;!?]+)/i,
];

const NEED_TYPE_PATTERNS = [
  { pattern: /water/i, type: "Water" },
  { pattern: /food|hungry|meal/i, type: "Food" },
  // Medical pattern checked BEFORE the generic rescue/emergency catch-all.
  // "ambulance" is explicitly included so messages like "Need ambulance urgently"
  // are not mis-classified as Rescue just because they contain "urgently"/"emergency".
  {
    pattern:
      /ambulance|medical|medicine|doctor|injured|sick|health|bleeding|unconscious|cardiac|paramedic/i,
    type: "Medical",
  },
  // "emergency" alone is intentionally excluded here — it appears in nearly every
  // distress message and should not override a more-specific Medical classification.
  { pattern: /rescue|trapped|stuck|help/i, type: "Rescue" },
];

const URGENCY_PATTERNS = [
  { pattern: /urgent|emergency|immediately|asap|critical/i, level: "High" },
  { pattern: /soon|important/i, level: "Medium" },
];

export function extractLocationHint(text = "") {
  for (const pattern of LOCATION_HINT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function extractNeedType(text = "") {
  for (const { pattern, type } of NEED_TYPE_PATTERNS) {
    if (pattern.test(text)) {
      return type;
    }
  }
  return "Other";
}

function extractUrgency(text = "") {
  for (const { pattern, level } of URGENCY_PATTERNS) {
    if (pattern.test(text)) {
      return level;
    }
  }
  return "Medium";
}

export function fallbackTriage(rawMessage) {
  const location = extractLocationHint(rawMessage);
  return {
    needType: extractNeedType(rawMessage),
    location: location || "Unknown",
    details: rawMessage,
    urgency: extractUrgency(rawMessage),
  };
}
