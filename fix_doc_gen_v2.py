import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Reset status and clear rejection reason at the start of generation
old_reset = "await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'generating' });"
new_reset = "await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'generating', [`${type.key}_rejection_reason`]: null });"
content = content.replace(old_reset, new_reset)

# 2. Fix field names in generateCVHTML (handle both snake_case and camelCase)
old_exp_map = """            <span class="item-title">${exp.title || exp}</span>
            ${exp.company ? `<span class="item-company"> at ${exp.company}</span>` : ''}
          </div>
          <span class="item-date">${exp.startDate || ''} - ${exp.endDate || 'Present'}</span>
        </div>
        ${exp.location ? `<div style="color: #666; font-size: 13px;">${exp.location}</div>` : ''}
        ${exp.description ? `<div class="item-description">${exp.description}</div>` : ''}"""

new_exp_map = """            <span class="item-title">${exp.title || exp.job_title || exp}</span>
            ${(exp.company || exp.company_name) ? `<span class="item-company"> at ${exp.company || exp.company_name}</span>` : ''}
          </div>
          <span class="item-date">${exp.startDate || exp.start_date || ''} - ${exp.endDate || exp.end_date || 'Present'}</span>
        </div>
        ${(exp.location || exp.city) ? `<div style="color: #666; font-size: 13px;">${exp.location || exp.city}</div>` : ''}
        ${(exp.description || exp.summary) ? `<div class="item-description">${exp.description || exp.summary}</div>` : ''}"""

content = content.replace(old_exp_map, new_exp_map)

# 3. Fix education field names too
old_edu_map = """            <span class="item-title">${edu.degree || edu}</span>
            ${edu.field ? `<span class="item-company"> in ${edu.field}</span>` : ''}
          </div>
          <span class="item-date">${edu.startYear || ''} - ${edu.endYear || ''}</span>
        </div>
        ${edu.school ? `<div style="color: #666; font-size: 13px;">${edu.school}</div>` : ''}"""

new_edu_map = """            <span class="item-title">${edu.degree || edu.qualification || edu}</span>
            ${(edu.field || edu.major) ? `<span class="item-company"> in ${edu.field || edu.major}</span>` : ''}
          </div>
          <span class="item-date">${edu.startYear || edu.start_year || edu.startDate || ''} - ${edu.endYear || edu.end_year || edu.endDate || ''}</span>
        </div>
        ${(edu.school || edu.university || edu.institution) ? `<div style="color: #666; font-size: 13px;">${edu.school || edu.university || edu.institution}</div>` : ''}"""

content = content.replace(old_edu_map, new_edu_map)

with open(file_path, 'w') as f:
    f.write(content)
