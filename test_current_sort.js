
// Mock data
const mockExperiences = [
  { title: "Old Job", startDate: "2015", endDate: "2018", current: false },
  { title: "Current Job A", startDate: "2020", endDate: "Present", current: true },
  { title: "Recent Job", startDate: "2018", endDate: "2020", current: false },
  { title: "Current Job B", startDate: "2021", endDate: "", current: true } // should be above Current Job A if sorted by start date, or equal priority
];

// Enhanced sorting logic
const sortDesc = (a, b) => {
    // 1. Priority: Currently Working Here (boolean)
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    
    // 2. Fallback: Parse dates
    const getYear = (d) => {
      if (!d) return 0;
      const m = String(d).match(/(?:19|20)\d{2}/);
      return m ? parseInt(m[0], 10) : 0;
    };
    const isPresentString = (d) => /present|heute|now|current|bis heute|seit|since|ongoing|laufend/i.test(String(d || ''));
    
    const endA = a.endDate || '';
    const endB = b.endDate || '';
    
    const presentA = isPresentString(endA);
    const presentB = isPresentString(endB);

    // If bools are equal, check string dates for "present"
    if (presentA && !presentB) return -1;
    if (!presentA && presentB) return 1;

    // Both present or both past: sort by Year End (if not present) or Year Start
    if ((a.current && b.current) || (presentA && presentB)) {
        // Both current: Sort by Start Date Descending (Newest start first)
        return getYear(b.startDate) - getYear(a.startDate);
    }
    
    const yearEndA = getYear(endA);
    const yearEndB = getYear(endB);
    
    if (yearEndA !== yearEndB) return yearEndB - yearEndA;
    
    return getYear(b.startDate) - getYear(a.startDate);
};

const sorted = [...mockExperiences].sort(sortDesc);
console.log(sorted.map(e => `${e.title} (Current: ${e.current})`));

// Validation
if (sorted[0].current && sorted[1].current && !sorted[2].current) {
    console.log("SORT PASSED: Current jobs are at the top.");
} else {
    console.log("SORT FAILED");
    process.exit(1);
}
