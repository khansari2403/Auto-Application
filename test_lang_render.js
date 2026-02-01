
// Mock logic from doc-generator.ts (current implementation)
const getVal = (x) => typeof x === 'string' ? x : (x.name || x.title || JSON.stringify(x));

const languages = JSON.stringify([
      { language: "English", level: "Native" },
      { language: "German", level: "C1" }
]);

// Parse languages if stringified JSON
let parsedLangs = [];
try {
    parsedLangs = JSON.parse(languages);
} catch {
    parsedLangs = languages.split(','); // fallback
}

// Current rendering logic
const rendered = parsedLangs.map(ln => `<li>${getVal(ln)}</li>`).join('');
console.log(rendered);

// New Desired Logic
const getLangVal = (x) => {
    if (typeof x === 'string') return x;
    if (x.language && x.level) return `${x.language} (${x.level})`;
    return x.name || x.title || JSON.stringify(x);
};

const renderedNew = parsedLangs.map(ln => `<li>${getLangVal(ln)}</li>`).join('');
console.log(renderedNew);
