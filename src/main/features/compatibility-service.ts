import { getAllQuery, runQuery, getDatabase } from '../database';

interface SkillMatch {
  skill: string;
  weight: number;
  matched: boolean;
}

interface CompatibilityResult {
  score: number;
  level: 'red' | 'yellow' | 'green' | 'gold';
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: number;
  educationMatch: number;
  locationMatch: boolean;
  profileSource?: string; // Which profile source was used
  breakdown: {
    skills: number;
    experience: number;
    education: number;
    location: number;
  };
}

/**
 * Get the profile data based on Auditor's source setting
 */
async function getProfileBySource(userId: number): Promise<{ profile: any; source: string }> {
  // Get Auditor settings
  const models = await getAllQuery('SELECT * FROM ai_models');
  const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
  const source = auditor?.auditor_source || 'all';
  
  // Get profiles based on source
  const profiles = await getAllQuery('SELECT * FROM user_profile');
  const linkedinProfile = profiles.find((p: any) => p.source === 'linkedin');
  const manualProfile = profiles.find((p: any) => p.source === 'manual');
  const baseProfile = profiles[0];
  
  // Get uploaded CVs
  const db = getDatabase();
  const documents = db.documents || [];
  const uploadedCvs = documents.filter((d: any) => d.doc_type === 'uploaded_cv');
  
  let selectedProfile = baseProfile;
  let usedSource = 'combined';
  
  switch (source) {
    case 'linkedin':
      if (linkedinProfile) {
        selectedProfile = linkedinProfile;
        usedSource = 'LinkedIn Profile';
      }
      break;
    case 'manual':
      if (manualProfile) {
        selectedProfile = manualProfile;
        usedSource = 'Manual Profile';
      }
      break;
    case 'uploaded_cv':
      // For uploaded CVs, we'd need to extract text - for now use base profile with CV note
      if (uploadedCvs.length > 0) {
        usedSource = 'Uploaded CV: ' + (uploadedCvs[0].file_name || 'CV Document');
      }
      selectedProfile = baseProfile;
      break;
    case 'all':
    default:
      // Combine all sources (default behavior)
      usedSource = 'All Sources (Combined)';
      break;
  }
  
  return { profile: selectedProfile, source: usedSource };
}

/**
 * Calculate compatibility score between user profile and job
 * Score: 0-100
 * - Red: 0-25 (Poor match)
 * - Yellow: 26-50 (Fair match)
 * - Green: 51-75 (Good match)
 * - Gold: 76-100 (Excellent match)
 */
export async function calculateCompatibility(userId: number, jobId: number): Promise<CompatibilityResult> {
  // Get user profile based on Auditor source setting
  const { profile, source } = await getProfileBySource(userId);
  
  // Get job listing
  const jobs = await getAllQuery('SELECT * FROM job_listings');
  const job = jobs.find((j: any) => j.id === jobId);
  
  if (!profile || !job) {
    return createEmptyResult();
  }
  
  // Calculate each component
  const skillsScore = calculateSkillsMatch(profile, job);
  const experienceScore = calculateExperienceMatch(profile, job);
  const educationScore = calculateEducationMatch(profile, job);
  const locationScore = calculateLocationMatch(profile, job);
  
  // Weighted average (skills 40%, experience 30%, education 20%, location 10%)
  const totalScore = Math.round(
    skillsScore.score * 0.4 +
    experienceScore * 0.3 +
    educationScore * 0.2 +
    locationScore * 0.1
  );
  
  // Determine level
  let level: 'red' | 'yellow' | 'green' | 'gold';
  if (totalScore >= 76) level = 'gold';
  else if (totalScore >= 51) level = 'green';
  else if (totalScore >= 26) level = 'yellow';
  else level = 'red';
  
  // Update job with compatibility score and source used
  await runQuery('UPDATE job_listings', {
    id: jobId,
    compatibility_score: totalScore,
    compatibility_source: source
  });
  
  return {
    score: totalScore,
    level,
    matchedSkills: skillsScore.matched,
    missingSkills: skillsScore.missing,
    experienceMatch: experienceScore,
    educationMatch: educationScore,
    locationMatch: locationScore > 50,
    profileSource: source,
    breakdown: {
      skills: skillsScore.score,
      experience: experienceScore,
      education: educationScore,
      location: locationScore
    }
  };
}

/**
 * Calculate skills match score
 */
function calculateSkillsMatch(profile: any, job: any): { score: number; matched: string[]; missing: string[] } {
  const userSkills = extractSkills(profile);
  const requiredSkills = extractJobSkills(job);
  
  if (requiredSkills.length === 0) {
    return { score: 50, matched: [], missing: [] }; // Neutral if no requirements
  }
  
  const matched: string[] = [];
  const missing: string[] = [];
  
  for (const required of requiredSkills) {
    const found = userSkills.some(skill => 
      skill.toLowerCase().includes(required.toLowerCase()) ||
      required.toLowerCase().includes(skill.toLowerCase()) ||
      areSimilarSkills(skill, required)
    );
    
    if (found) {
      matched.push(required);
    } else {
      missing.push(required);
    }
  }
  
  const score = Math.round((matched.length / requiredSkills.length) * 100);
  
  return { score, matched, missing };
}

/**
 * Extract skills from user profile
 */
function extractSkills(profile: any): string[] {
  const skills: string[] = [];
  
  // From skills field
  if (profile.skills) {
    if (typeof profile.skills === 'string') {
      skills.push(...profile.skills.split(',').map((s: string) => s.trim()));
    } else if (Array.isArray(profile.skills)) {
      skills.push(...profile.skills);
    }
  }
  
  // From certifications
  if (profile.certifications) {
    if (typeof profile.certifications === 'string') {
      skills.push(...profile.certifications.split(',').map((s: string) => s.trim()));
    } else if (Array.isArray(profile.certifications)) {
      skills.push(...profile.certifications);
    }
  }
  
  // From summary/headline
  if (profile.summary) {
    const technicalTerms = extractTechnicalTerms(profile.summary);
    skills.push(...technicalTerms);
  }
  
  return [...new Set(skills.filter(s => s.length > 1))];
}

/**
 * Extract required skills from job listing
 */
function extractJobSkills(job: any): string[] {
  const skills: string[] = [];
  
  // From required_skills field
  if (job.required_skills) {
    if (typeof job.required_skills === 'string') {
      skills.push(...job.required_skills.split(',').map((s: string) => s.trim()));
    } else if (Array.isArray(job.required_skills)) {
      skills.push(...job.required_skills);
    }
  }
  
  // From description
  if (job.description) {
    const technicalTerms = extractTechnicalTerms(job.description);
    skills.push(...technicalTerms);
  }
  
  return [...new Set(skills.filter(s => s.length > 1))].slice(0, 20); // Limit to top 20
}

/**
 * Extract technical terms from text
 */
function extractTechnicalTerms(text: string): string[] {
  const technicalPatterns = [
    // Programming languages
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|PHP|Swift|Kotlin|Scala)\b/gi,
    // Frameworks
    /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|\.NET|Laravel|Rails)\b/gi,
    // Tools & Technologies
    /\b(AWS|Azure|GCP|Docker|Kubernetes|Git|Jenkins|CI\/CD|Terraform|Ansible)\b/gi,
    // Databases
    /\b(SQL|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Oracle|DynamoDB)\b/gi,
    // Methodologies
    /\b(Agile|Scrum|Kanban|PMP|Six Sigma|Lean|DevOps|ITIL)\b/gi,
    // Soft skills (common in job postings)
    /\b(Leadership|Communication|Problem.solving|Team.?work|Project Management)\b/gi,
  ];
  
  const terms: string[] = [];
  
  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms.push(...matches.map(m => m.trim()));
    }
  }
  
  return [...new Set(terms)];
}

/**
 * Check if two skills are similar (accounting for variations)
 */
function areSimilarSkills(skill1: string, skill2: string): boolean {
  const s1 = skill1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = skill2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exact match after normalization
  if (s1 === s2) return true;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Common skill variations
  const variations: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript'],
    'typescript': ['ts'],
    'python': ['py'],
    'kubernetes': ['k8s'],
    'postgresql': ['postgres', 'psql'],
    'mongodb': ['mongo'],
    'nodejs': ['node', 'expressjs'],
    'reactjs': ['react', 'reactnative'],
    'projectmanagement': ['pm', 'projectmanager'],
    'machinelearning': ['ml', 'ai', 'deeplearning'],
  };
  
  for (const [base, alts] of Object.entries(variations)) {
    if ((s1 === base || alts.includes(s1)) && (s2 === base || alts.includes(s2))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate experience match score
 */
function calculateExperienceMatch(profile: any, job: any): number {
  // Get user's total years of experience
  let userYears = 0;
  
  if (profile.experiences && Array.isArray(profile.experiences)) {
    for (const exp of profile.experiences) {
      if (exp.start_date && exp.end_date) {
        const start = new Date(exp.start_date);
        const end = exp.end_date === 'Present' ? new Date() : new Date(exp.end_date);
        userYears += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      }
    }
  }
  
  // Parse required experience from job
  let requiredYears = 0;
  const description = (job.description || '').toLowerCase();
  const experienceLevel = (job.experience_level || '').toLowerCase();
  
  // Check experience level field
  if (experienceLevel.includes('entry') || experienceLevel.includes('junior')) {
    requiredYears = 1;
  } else if (experienceLevel.includes('mid') || experienceLevel.includes('intermediate')) {
    requiredYears = 3;
  } else if (experienceLevel.includes('senior')) {
    requiredYears = 5;
  } else if (experienceLevel.includes('lead') || experienceLevel.includes('principal')) {
    requiredYears = 7;
  }
  
  // Parse from description
  const yearsMatch = description.match(/(\d+)\+?\s*years?\s*(of)?\s*(experience|exp)/i);
  if (yearsMatch) {
    requiredYears = Math.max(requiredYears, parseInt(yearsMatch[1]));
  }
  
  // Calculate score
  if (requiredYears === 0) return 70; // Neutral if not specified
  
  if (userYears >= requiredYears) {
    // Full score if meets requirements, bonus for exceeding
    const bonus = Math.min((userYears - requiredYears) * 5, 20);
    return Math.min(80 + bonus, 100);
  } else {
    // Partial score based on how close
    const ratio = userYears / requiredYears;
    return Math.round(ratio * 70);
  }
}

/**
 * Calculate education match score
 */
function calculateEducationMatch(profile: any, job: any): number {
  const description = (job.description || '').toLowerCase();
  const userEducation = profile.education || [];
  
  // Education level hierarchy
  const levels: Record<string, number> = {
    'high school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5,
    'doctorate': 5
  };
  
  // Determine required level from job
  let requiredLevel = 0;
  if (description.includes('phd') || description.includes('doctorate')) requiredLevel = 5;
  else if (description.includes('master') || description.includes('mba') || description.includes('m.sc')) requiredLevel = 4;
  else if (description.includes('bachelor') || description.includes('b.sc') || description.includes('degree')) requiredLevel = 3;
  else if (description.includes('associate')) requiredLevel = 2;
  
  if (requiredLevel === 0) return 70; // Neutral if not specified
  
  // Get user's highest education level
  let userLevel = 0;
  if (Array.isArray(userEducation)) {
    for (const edu of userEducation) {
      const degree = (edu.degree || '').toLowerCase();
      for (const [key, value] of Object.entries(levels)) {
        if (degree.includes(key)) {
          userLevel = Math.max(userLevel, value);
        }
      }
    }
  }
  
  // Calculate score
  if (userLevel >= requiredLevel) {
    return 100;
  } else if (userLevel === requiredLevel - 1) {
    return 70; // One level below is acceptable
  } else {
    return Math.max(30, userLevel * 15);
  }
}

/**
 * Calculate location match score
 */
function calculateLocationMatch(profile: any, job: any): number {
  const userLocation = (profile.location || '').toLowerCase();
  const jobLocation = (job.location || '').toLowerCase();
  const jobType = (job.job_type || '').toLowerCase();
  
  // Remote jobs are always a match
  if (jobType.includes('remote') || jobLocation.includes('remote')) {
    return 100;
  }
  
  // If no locations specified
  if (!userLocation || !jobLocation) {
    return 50; // Neutral
  }
  
  // Extract city and country
  const userParts = userLocation.split(',').map(p => p.trim());
  const jobParts = jobLocation.split(',').map(p => p.trim());
  
  // Check for city match
  for (const userPart of userParts) {
    for (const jobPart of jobParts) {
      if (userPart.includes(jobPart) || jobPart.includes(userPart)) {
        return 100;
      }
    }
  }
  
  // Check for country/region match (partial score)
  const userCountry = userParts[userParts.length - 1];
  const jobCountry = jobParts[jobParts.length - 1];
  
  if (userCountry === jobCountry) {
    return 70; // Same country
  }
  
  return 30; // Different location
}

/**
 * Create empty result for missing data
 */
function createEmptyResult(): CompatibilityResult {
  return {
    score: 0,
    level: 'red',
    matchedSkills: [],
    missingSkills: [],
    experienceMatch: 0,
    educationMatch: 0,
    locationMatch: false,
    breakdown: {
      skills: 0,
      experience: 0,
      education: 0,
      location: 0
    }
  };
}

/**
 * Calculate compatibility for all jobs
 */
export async function calculateAllCompatibility(userId: number): Promise<void> {
  const jobs = await getAllQuery('SELECT * FROM job_listings');
  
  for (const job of jobs) {
    if (!job.compatibility_score || job.compatibility_score === 0) {
      await calculateCompatibility(userId, job.id);
    }
  }
}

/**
 * Get jobs filtered by minimum compatibility
 */
export async function getJobsByCompatibility(userId: number, minLevel: 'red' | 'yellow' | 'green' | 'gold'): Promise<any[]> {
  const jobs = await getAllQuery('SELECT * FROM job_listings');
  
  const minScore = {
    'red': 0,
    'yellow': 26,
    'green': 51,
    'gold': 76
  }[minLevel];
  
  return jobs.filter((job: any) => (job.compatibility_score || 0) >= minScore);
}
