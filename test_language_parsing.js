
// Mock data
const mockProfile = {
  languages: '[{"language":"English","level":"Native"},{"language":"German","level":"B2"}]'
};

const mockProfileOld = {
  languages: 'English (Native), German (B2)'
};

// Test parsing logic (simulated from SettingsPanel)
const parseLanguages = (str) => {
    if (!str) return [];
    try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed;
    } catch {}
    
    return str.split(',').map(s => {
      if (!s.trim()) return null;
      const match = s.trim().match(/^(.*?)\s*\((.*?)\)$/);
      if (match) return { language: match[1], level: match[2] };
      return { language: s.trim(), level: 'Fluent' };
    }).filter(x => x);
};

console.log("New Format:", parseLanguages(mockProfile.languages));
console.log("Old Format:", parseLanguages(mockProfileOld.languages));

if (parseLanguages(mockProfile.languages)[0].level === "Native" && parseLanguages(mockProfileOld.languages)[1].level === "B2") {
    console.log("PARSING PASSED");
} else {
    console.log("PARSING FAILED");
    process.exit(1);
}
