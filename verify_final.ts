
import { generateCVHTML } from './src/main/features/doc-generator';
import fs from 'fs';
import path from 'path';

// Mock Profile for Final Verification
const profile = {
  name: "Feature Tester",
  title: "Dev",
  email: "test@feature.com",
  location: "Berlin",
  languages: JSON.stringify([
      { language: "English", level: "Native" },
      { language: "German", level: "C1" }
  ]),
  experiences: [
    { title: "Old Job", startDate: "2015", endDate: "2018", current: false, company: "Old Corp" },
    { title: "Current Job", startDate: "2020", endDate: "Present", current: true, company: "New Corp" },
    { title: "Recent Job", startDate: "2018", endDate: "2020", current: false, company: "Mid Corp" }
  ],
  educations: []
};

const html = generateCVHTML(
  "{}",
  profile,
  { company_name: "Test" },
  false,
  "ENGLISH",
  "Mimic my CV"
);

// Check Sort Order
const nowIdx = html.indexOf("Current Job");
const midIdx = html.indexOf("Recent Job");
const oldIdx = html.indexOf("Old Job");

// Check Languages
const langCheck = html.includes("English (Native)") && html.includes("German (C1)");

console.log(`Indices: Now=${nowIdx}, Mid=${midIdx}, Old=${oldIdx}`);
console.log(`Language Check: ${langCheck}`);

if (nowIdx > -1 && midIdx > -1 && oldIdx > -1 && nowIdx < midIdx && midIdx < oldIdx && langCheck) {
    console.log("ALL CHECKS PASSED");
} else {
    console.log("FAILED");
    process.exit(1);
}
