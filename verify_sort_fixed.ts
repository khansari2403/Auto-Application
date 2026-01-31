
import { generateCVHTML } from './src/main/features/doc-generator';
import fs from 'fs';
import path from 'path';

const profile = {
  name: "German Tester",
  title: "Dev",
  email: "test@de.com",
  location: "Berlin",
  experiences: [
    { title: "Old Job", startDate: "2010", endDate: "2015", company: "Old" },
    { title: "Current Job", startDate: "2020", endDate: "Seit 2020", company: "Now" }, 
    { title: "Recent Job", startDate: "2016", endDate: "2019", company: "Mid" }
  ],
  educations: []
};

const html = generateCVHTML(
  "{}",
  profile,
  { company_name: "Test" },
  true,
  "GERMAN",
  "Mimic my CV"
);

const nowIdx = html.indexOf("Current Job");
const midIdx = html.indexOf("Recent Job");
const oldIdx = html.indexOf("Old Job");

console.log(`Indices: Now=${nowIdx}, Mid=${midIdx}, Old=${oldIdx}`);

if (nowIdx > -1 && midIdx > -1 && oldIdx > -1 && nowIdx < midIdx && midIdx < oldIdx) {
    console.log("SORT PASSED");
} else {
    console.log("SORT FAILED");
    console.log(html);
}
