import sys

file_path = 'src/components/settings/AIModelsSection.tsx'
content = open(file_path).read()

# 1. Fix formData initialization
content = content.replace("coverLetterWordLimit: '280', cvPageLimit: '2', cvPageLimit: '2'", "coverLetterWordLimit: '280', cvPageLimit: '2'")

# 2. Add UI for cvPageLimit
# We'll use a more robust search for the insertion point
marker = "placeholder='250-300 words'"
if marker in content:
    # Find the closing tag of the input and its parent div
    insertion_point = content.find("</div>", content.find(marker)) + 6
    
    ui_code = """
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#1b5e20' }}>CV Page Limit</label>
                          <input 
                            type='number' 
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #81c784', background: '#fff' }} 
                            value={formData.cvPageLimit} 
                            onChange={(e) => handleInputChange('cvPageLimit', e.target.value)} 
                            placeholder='1-2 pages'
                          />
                        </div>"""
    
    if "CV Page Limit" not in content:
        content = content[:insertion_point] + ui_code + content[insertion_point:]

# 3. Fix handleSave
content = content.replace("motivationLetterWordLimit: '450', coverLetterWordLimit: '280', cvPageLimit: '2', cvPageLimit: '2'", 
                         "motivationLetterWordLimit: '450', coverLetterWordLimit: '280', cvPageLimit: '2'")

with open(file_path, 'w') as f:
    f.write(content)
