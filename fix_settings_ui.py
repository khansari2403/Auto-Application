import sys

file_path = 'src/components/settings/AIModelsSection.tsx'
content = open(file_path).read()

# Add cvPageLimit to formData
content = content.replace("coverLetterWordLimit: '280'", "coverLetterWordLimit: '280', cvPageLimit: '2'")
content = content.replace("coverLetterWordLimit: '280'", "coverLetterWordLimit: '280', cvPageLimit: '2'")

# Add UI for cvPageLimit
ui_insertion = """                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#1b5e20' }}>CV Page Limit</label>
                          <input 
                            type='number' 
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #81c784', background: '#fff' }} 
                            value={formData.cvPageLimit} 
                            onChange={(e) => handleInputChange('cvPageLimit', e.target.value)} 
                            placeholder='1-2 pages'
                          />
                        </div>"""

content = content.replace("placeholder='250-300 words'\\n                          />\\n                        </div>", 
                         "placeholder='250-300 words'\\n                          />\\n                        </div>\\n" + ui_insertion)

# Fix startEdit to include cvPageLimit
content = content.replace("coverLetterWordLimit: model.cover_letter_word_limit || '280'", 
                         "coverLetterWordLimit: model.cover_letter_word_limit || '280', cvPageLimit: model.cv_page_limit || '2'")

with open(file_path, 'w') as f:
    f.write(content)
