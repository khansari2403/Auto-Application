import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Update generateDocumentHTML signature to accept isGerman
content = content.replace("function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any): string {",
                         "function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any, isGerman: boolean): string {")

# 2. Update calls to generateDocumentHTML
content = content.replace("htmlContent = generateDocumentHTML(content, type.label, userProfile, job);",
                         "htmlContent = generateDocumentHTML(content, type.label, userProfile, job, isGerman);")

# 3. Update generateCVHTML signature to accept isGerman
content = content.replace("function generateCVHTML(content: string, userProfile: any, job: any): string {",
                         "function generateCVHTML(content: string, userProfile: any, job: any, isGerman: boolean): string {")

# 4. Update calls to generateCVHTML
content = content.replace("htmlContent = generateCVHTML(content, userProfile, job);",
                         "htmlContent = generateCVHTML(content, userProfile, job, isGerman);")

# 5. Fix the ReferenceError in generateDocumentHTML
# I'll remove the local detection and use the passed parameter
old_html_func = """function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any, isGerman: boolean): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  const isLetter = docType.toLowerCase().includes('letter');
  
  // Detect language for salutation and closing
  const jobText = (job?.description + ' ' + job?.job_title).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));

  const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });"""

new_html_func = """function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any, isGerman: boolean): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  const isLetter = docType.toLowerCase().includes('letter');
  
  const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });"""

content = content.replace(old_html_func, new_html_func)

# 6. Fix generateCVHTML to use isGerman for section titles
old_cv_html = """    <div class="left-column">
      ${userProfile?.summary ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <div class="summary">${userProfile.summary}</div>
        </div>
      ` : ''}
      
      ${experiencesHTML ? `
        <div class="section">
          <div class="section-title">Work Experience</div>
          ${experiencesHTML}
        </div>\n      ` : ''}
      
      ${educationsHTML ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${educationsHTML}
        </div>
      ` : ''}
    </div>
    
    <div class="right-column">
      ${skillsHTML ? `
        <div class="section">
          <div class="section-title">Skills</div>
          ${skillsHTML}
        </div>
      ` : ''}
      
      ${certsHTML ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${certsHTML}
        </div>
      ` : ''}
      
      ${userProfile?.languages?.length > 0 ? `
        <div class="section">
          <div class="section-title">Languages</div>"""

new_cv_html = """    <div class="left-column">
      ${userProfile?.summary ? `
        <div class="section">
          <div class="section-title">${isGerman ? 'Beruflicher Werdegang' : 'Professional Summary'}</div>
          <div class="summary">${userProfile.summary}</div>
        </div>
      ` : ''}
      
      ${experiencesHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? 'Berufserfahrung' : 'Work Experience'}</div>
          ${experiencesHTML}
        </div>
      ` : ''}
      
      ${educationsHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? 'Ausbildung' : 'Education'}</div>
          ${educationsHTML}
        </div>
      ` : ''}
    </div>
    
    <div class="right-column">
      ${skillsHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? 'Kenntnisse' : 'Skills'}</div>
          ${skillsHTML}
        </div>
      ` : ''}
      
      ${certsHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? 'Zertifizierungen' : 'Certifications'}</div>
          ${certsHTML}
        </div>
      ` : ''}
      
      ${userProfile?.languages?.length > 0 ? `
        <div class="section">
          <div class="section-title">${isGerman ? 'Sprachen' : 'Languages'}</div>"""

content = content.replace(old_cv_html, new_cv_html)

with open(file_path, 'w') as f:
    f.write(content)
