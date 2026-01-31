
import { generateCVHTML } from './src/main/features/doc-generator';
import fs from 'fs';
import path from 'path';

// Profile with German date format "Seit YYYY"
const profile = {
  name: "German Tester",
  title: "Dev",
  email: "test@de.com",
  location: "Berlin",
  experiences: [
    { title: "Old Job", startDate: "2010", endDate: "2015", company: "Old" },
    { title: "Current Job", startDate: "2020", endDate: "Seit 2020", company: "Now" }, // Should be first
    { title: "Recent Job", startDate: "2016", endDate: "2019", company: "Mid" }
  ],
  educations: []
};

// Test generateCVHTML date sorting logic by creating a dummy file
// We cannot easily unit test internal functions, so we check the HTML output order.

const html = generateCVHTML(
  "{}",
  profile,
  { company_name: "Test" },
  true, // isGerman
  "GERMAN",
  "Mimic my CV"
);

// We expect "Now" (Current Job) to be first, then "Mid", then "Old".
// If "Seit 2020" is not parsed as "Present", it might be parsed as "2020".
// 2020 > 2019 > 2015.
// So order should be correct even if not parsed as Present, AS LONG AS the year is extracted.
// But if "Seit 2020" -> 2020.
// If "Present" -> Infinity.
// If "Seit" is treated as Infinity, it is safer.

const nowIdx = html.indexOf("Current Job");
const midIdx = html.indexOf("Mid Job");
const oldIdx = html.indexOf("Old Job");

console.log(`Indices: Now=${nowIdx}, Mid=${midIdx}, Old=${oldIdx}`);

if (nowIdx < midIdx && midIdx < oldIdx) {
    console.log("SORT PASSED");
} else {
    console.log("SORT FAILED");
    console.log(html); // Print to debug
}
