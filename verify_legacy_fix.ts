
import { normalizeProfileArrays } from './src/main/features/doc-generator';

const profile = { languages: "English, German" };
const norm = normalizeProfileArrays(profile);
console.log(norm.languages);

if (Array.isArray(norm.languages) && norm.languages[0] === "English") {
    console.log("FIXED: Legacy strings are preserved as arrays.");
} else {
    console.log("FAILED");
    process.exit(1);
}
