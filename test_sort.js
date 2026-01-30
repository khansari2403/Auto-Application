
const experiences = [
    { title: "Old Job", endDate: "2018" },
    { title: "Current Job", endDate: "Present" },
    { title: "Recent Job", endDate: "2022" },
    { title: "Older Job", endDate: "2010" }
];

const educations = [
     { degree: "Bachelor", endYear: "2015" },
     { degree: "Master", endYear: "2018" }
];

const sortDesc = (a, b) => {
    const getYear = (d) => {
        if (!d) return 0;
        const m = String(d).match(/\d{4}/);
        return m ? parseInt(m[0], 10) : 0;
    };
    // If "Present" or "Heute", treat as infinity (current year + 2)
    const isPresent = (d) => /present|heute|now|current|bis heute/i.test(String(d || ''));
    
    // Compare end dates first
    const endA = a.endDate || a.end_date || a.to || a.end || a.endYear || a.end_year || '';
    const endB = b.endDate || b.end_date || b.to || b.end || b.endYear || b.end_year || '';
    
    if (isPresent(endA) && !isPresent(endB)) return -1;
    if (!isPresent(endA) && isPresent(endB)) return 1;
    if (isPresent(endA) && isPresent(endB)) return 0;
    
    const yearEndA = getYear(endA);
    const yearEndB = getYear(endB);
    
    if (yearEndA !== yearEndB) return yearEndB - yearEndA; // Descending
    
    // If end years same, compare start years
    const startA = a.startDate || a.start_date || a.from || a.start || a.startYear || a.start_year || '';
    const startB = b.startDate || b.start_date || b.from || b.start || b.startYear || b.start_year || '';
    
    return getYear(startB) - getYear(startA);
};

const sortedExp = [...experiences].sort(sortDesc);
console.log("Sorted Experiences:", sortedExp.map(e => e.title));

const sortedEdu = [...educations].sort(sortDesc);
console.log("Sorted Educations:", sortedEdu.map(e => e.degree));

if (sortedExp[0].title === "Current Job" && sortedExp[1].title === "Recent Job") {
    console.log("SORT PASSED");
} else {
    console.log("SORT FAILED");
    process.exit(1);
}
