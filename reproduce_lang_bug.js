
import { normalizeProfileArrays } from './src/main/features/doc-generator'; // We'll mock this or extract it

// Mock implementation of the buggy function
function normalizeProfileArrays(profile) {
  const parseField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try { return JSON.parse(field); } catch { return []; } // THIS IS THE BUG
    }
    return [];
  };

  return {
    ...profile,
    languages: parseField(profile.languages)
  };
}

const profileOld = { languages: "English, German" };
const normalized = normalizeProfileArrays(profileOld);
console.log("Old Format:", normalized.languages);

if (normalized.languages.length === 0) {
    console.log("BUG CONFIRMED: Legacy string data is lost.");
} else {
    console.log("No bug?");
}
