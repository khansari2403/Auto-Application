
import { generateCVHTML } from './src/main/features/doc-generator';
import fs from 'fs';
import path from 'path';

// Mock Profile with weird dates
const profile = {
  name: "Date Tester",
  title: "Dev",
  email: "date@test.com",
  location: "Berlin",
  experiences: [
    { title: "Weird Job", startDate: "2024]03", endDate: "2024]10", company: "Test" }
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

console.log(html);

// Check if ] is replaced or kept
if (html.includes("2024-03") && html.includes("2024-10")) {
    console.log("DATE CLEANED: PASSED");
} else {
    console.log("DATE ISSUE DETECTED (brackets preserved)");
    process.exit(1);
}
