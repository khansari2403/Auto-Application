
import { generateCVHTML } from './src/main/features/doc-generator';
import fs from 'fs';
import path from 'path';

// Mock Profile with dates in scrambled order
const profile = {
  name: "Photo Tester",
  title: "Dev",
  email: "photo@test.com",
  location: "Berlin",
  photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  experiences: [
    { title: "Old Job", startDate: "2010", endDate: "2015", company: "Old Corp" },
    { title: "Current Job", startDate: "2020", endDate: "Present", company: "Now Corp" },
    { title: "Mid Job", startDate: "2016", endDate: "2019", company: "Mid Corp" }
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

const outPath = path.resolve('/app/verify_photo_sort.html');
fs.writeFileSync(outPath, html);
console.log("HTML generated at " + outPath);
