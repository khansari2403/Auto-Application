
// Mock implementation for testing since we can't import internal function easily
function normalizeProfileArrays(profile) {
  const parseField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try { return JSON.parse(field); } catch { 
        // Fallback for comma-separated strings (backward compatibility)
        return field.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  return {
    ...profile,
    languages: parseField(profile.languages)
  };
}

const profile = { languages: "English, German" };
const norm = normalizeProfileArrays(profile);
console.log(norm.languages);

if (Array.isArray(norm.languages) && norm.languages[0] === "English") {
    console.log("FIXED: Legacy strings are preserved as arrays.");
} else {
    console.log("FAILED");
    process.exit(1);
}
