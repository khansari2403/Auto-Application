
import { generateCVHTML } from './src/main/features/doc-generator';
import fs from 'fs';
import path from 'path';

// Mock Profile
const profile = {
  name: "Max Mustermann",
  title: "Software Architect",
  email: "max@example.com",
  location: "Berlin, DE",
  experiences: [
    {
      startDate: "2022-01",
      endDate: "Present",
      company: "Tech Giant GmbH",
      location: "Berlin",
      title: "Senior Architect",
      description: "Original description... will be ignored by new engine if JSON provided."
    },
    {
      startDate: "2018-05",
      endDate: "2021-12",
      company: "StartUp Inc",
      location: "Hamburg",
      title: "Lead Developer",
      description: "Old desc."
    }
  ],
  educations: [
    {
      startYear: "2014",
      endYear: "2018",
      school: "TU Munich",
      location: "Munich",
      degree: "MSc Computer Science",
      details: "Focus on AI"
    }
  ],
  skills: ["TypeScript", "Node.js", "React"],
  languages: ["German (Native)", "English (Fluent)"]
};

// Mock AI Output (JSON)
const aiOutput = JSON.stringify({
  summary: "Experienced Software Architect with a focus on scalable systems.",
  experiences: {
    "0": "<ul><li>Led migration to microservices.</li><li>Managed team of 10.</li></ul>",
    "1": "<ul><li>Built MVP from scratch.</li><li>Secured Series A funding.</li></ul>"
  },
  educations: {
    "0": "Specialized in distributed systems."
  }
});

const html = generateCVHTML(
  aiOutput,
  profile,
  { company_name: "Target Corp" }, // job
  true, // isGerman
  "GERMAN",
  "Mimic my CV" // persona
);

const outPath = path.resolve('/app/verification.html');
fs.writeFileSync(outPath, html);
console.log("HTML generated at " + outPath);
