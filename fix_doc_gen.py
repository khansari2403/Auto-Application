import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Change 'completed' to 'auditor_done' for document status
content = content.replace("status: 'completed',", "status: 'auditor_done',")
content = content.replace("`${type.key}_status`]: 'completed',", "`${type.key}_status`]: 'auditor_done',")

# 2. Add robust profile parsing in generateTailoredDocs
old_profile_parsing = """  // Get profile based on Thinker's source settings
  const userProfile = await getProfileByThinkerSource(userId, thinker);
  
  if (!userProfile) {
    await logAction(userId, 'ai_thinker', '❌ No user profile found. Please create your profile first.', 'failed', false);
    return;
  }"""

new_profile_parsing = """  // Get profile based on Thinker's source settings
  let userProfile = await getProfileByThinkerSource(userId, thinker);
  
  if (!userProfile) {
    await logAction(userId, 'ai_thinker', '❌ No user profile found. Please create your profile first.', 'failed', false);
    return;
  }

  // Robust parsing of profile fields (handle both JSON strings and objects)
  const parseField = (field: any) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try { return JSON.parse(field); } catch (e) { return []; }
    }
    return [];
  };

  userProfile = {
    ...userProfile,
    experiences: parseField(userProfile.experiences),
    educations: parseField(userProfile.educations),
    skills: parseField(userProfile.skills),
    licenses: parseField(userProfile.licenses),
    languages: parseField(userProfile.languages)
  };"""

content = content.replace(old_profile_parsing, new_profile_parsing)

# 3. Fix generateCVHTML to handle parsed profile correctly
# (It already expects arrays, so the parsing above fixes it)

# 4. Ensure job.id matching is robust in generateSingleDocument
content = content.replace("const job = db.job_listings?.find((j: any) => j.id === jobId);", 
                         "const job = db.job_listings?.find((j: any) => String(j.id) === String(jobId));")

with open(file_path, 'w') as f:
    f.write(content)
