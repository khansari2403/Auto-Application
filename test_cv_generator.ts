
import { expect } from 'expect';

// Mock data
const mockProfile = {
  name: "John Doe",
  title: "Software Engineer",
  email: "john@example.com",
  location: "Berlin, Germany",
  experiences: [
    {
      title: "Senior Dev",
      company: "Tech Corp",
      location: "Berlin",
      startDate: "2020-01",
      endDate: "Present",
      description: "Original description 1"
    },
    {
      title: "Junior Dev",
      company: "Startup Inc",
      location: "Munich",
      startDate: "2018-01",
      endDate: "2019-12",
      description: "Original description 2"
    }
  ],
  educations: [
    {
      degree: "BSc CS",
      school: "TU Berlin",
      location: "Berlin",
      startYear: "2014",
      endYear: "2017",
      details: "Original edu details"
    }
  ],
  skills: ["React", "TypeScript"],
  languages: ["English", "German"]
};

const mockRewrittenDescriptions = {
  "0": "<ul><li>Rewritten point 1</li><li>Rewritten point 2</li></ul>",
  "1": "Rewritten description for Junior role."
};

const mockJob = {
  title: "Frontend Developer"
};

// Proposed New Logic for generateCVHTML (simplified for testing)
function generateNewCVHTML(
  rewrittenContentJson: string, 
  userProfile: any, 
  isGerman: boolean
): string {
  
  let rewrittenMap: Record<string, string> = {};
  try {
    rewrittenMap = JSON.parse(rewrittenContentJson);
  } catch (e) {
    console.error("Failed to parse JSON content, falling back to empty map", e);
  }

  const l = isGerman ? {
    exp: "BERUFSERFAHRUNG",
    edu: "AUSBILDUNG"
  } : {
    exp: "WORK EXPERIENCE",
    edu: "EDUCATION"
  };

  // Helper to render experience list
  const renderExperiences = () => {
    if (!userProfile.experiences || userProfile.experiences.length === 0) return "";
    
    return userProfile.experiences.map((exp: any, idx: number) => {
      // Use rewritten description if available, else fallback to original
      const description = rewrittenMap[String(idx)] || exp.description || "";
      
      return `
      <div class="exp-entry">
        <div class="exp-meta">
          <span class="exp-dates">${exp.startDate} - ${exp.endDate || (isGerman ? 'Heute' : 'Present')}</span>
          <span class="exp-company">${exp.company}</span>, <span class="exp-location">${exp.location}</span>
        </div>
        <div class="exp-role">${exp.title}</div>
        <div class="exp-description">${description}</div>
      </div>`;
    }).join("\n");
  };

  return `
    <html>
      <body>
        <h1>${userProfile.name}</h1>
        <h2>${l.exp}</h2>
        ${renderExperiences()}
      </body>
    </html>
  `;
}

// Test execution
const jsonInput = JSON.stringify(mockRewrittenDescriptions);
const html = generateNewCVHTML(jsonInput, mockProfile, false);

console.log(html);

if (html.includes("Rewritten point 1") && html.includes("Tech Corp")) {
  console.log("TEST PASSED: generated HTML contains structured data and rewritten content.");
} else {
  console.error("TEST FAILED");
  process.exit(1);
}
