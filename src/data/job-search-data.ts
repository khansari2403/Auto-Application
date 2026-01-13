/**
 * Job Titles Database - Extensive list of job titles by category
 * Over 500+ job titles covering all major industries
 */
export const JOB_TITLES_DATABASE = [
  // Project Management (30+)
  'Project Manager', 'Assistant Project Manager', 'Senior Project Manager', 'Program Manager',
  'Project Coordinator', 'Project Director', 'Technical Project Manager', 'IT Project Manager',
  'Construction Project Manager', 'Agile Project Manager', 'Scrum Master', 'PMO Manager',
  'Portfolio Manager', 'Delivery Manager', 'Release Manager', 'Change Manager',
  'Implementation Manager', 'Integration Manager', 'Transition Manager', 'PMO Director',
  'Agile Coach', 'Product Delivery Lead', 'Sprint Manager', 'Kanban Lead',
  'Project Controller', 'Project Scheduler', 'Project Analyst', 'Project Administrator',
  'Resource Manager', 'Capacity Planner', 'Project Estimator', 'Planning Manager',
  
  // Software Development (60+)
  'Software Engineer', 'Senior Software Engineer', 'Lead Software Engineer', 'Principal Engineer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer',
  'iOS Developer', 'Android Developer', 'React Developer', 'Angular Developer', 'Vue.js Developer',
  'Node.js Developer', 'Python Developer', 'Java Developer', '.NET Developer', 'PHP Developer',
  'Ruby Developer', 'Go Developer', 'Rust Developer', 'C++ Developer', 'Embedded Developer',
  'Web Developer', 'WordPress Developer', 'Shopify Developer', 'E-commerce Developer',
  'API Developer', 'Microservices Engineer', 'Solutions Architect', 'Technical Lead',
  'Engineering Manager', 'VP of Engineering', 'CTO', 'Software Architect',
  'Staff Engineer', 'Distinguished Engineer', 'Fellow Engineer', 'Chief Architect',
  'Application Developer', 'Systems Developer', 'Integration Developer', 'ETL Developer',
  'Blockchain Developer', 'Smart Contract Developer', 'Web3 Developer', 'DeFi Developer',
  'Game Developer', 'Unity Developer', 'Unreal Developer', 'Graphics Programmer',
  'Firmware Engineer', 'Embedded Systems Engineer', 'IoT Developer', 'Hardware Engineer',
  'Swift Developer', 'Kotlin Developer', 'Flutter Developer', 'React Native Developer',
  'TypeScript Developer', 'JavaScript Developer', 'Scala Developer', 'Clojure Developer',
  'Elixir Developer', 'Haskell Developer', 'F# Developer', 'Groovy Developer',
  'Low-Code Developer', 'No-Code Specialist', 'Salesforce Developer', 'SAP Developer',
  'Oracle Developer', 'PL/SQL Developer', 'COBOL Developer', 'Mainframe Developer',
  
  // Data & AI (50+)
  'Data Scientist', 'Data Analyst', 'Data Engineer', 'Machine Learning Engineer',
  'AI Engineer', 'Business Intelligence Analyst', 'Data Architect', 'Analytics Manager',
  'Deep Learning Engineer', 'NLP Engineer', 'Computer Vision Engineer', 'Research Scientist',
  'MLOps Engineer', 'AI Researcher', 'Data Science Manager', 'Chief Data Officer',
  'Quantitative Analyst', 'Statistical Analyst', 'Predictive Modeler', 'Data Modeler',
  'Big Data Engineer', 'Hadoop Developer', 'Spark Developer', 'Data Pipeline Engineer',
  'Business Analyst', 'BI Developer', 'Tableau Developer', 'Power BI Developer',
  'Looker Developer', 'Analytics Engineer', 'Growth Analyst', 'Product Analyst',
  'Marketing Analyst', 'Financial Analyst', 'Risk Analyst', 'Fraud Analyst',
  'AI Product Manager', 'ML Platform Engineer', 'Feature Engineer', 'Data Ops Engineer',
  'Recommendation Systems Engineer', 'Speech Recognition Engineer', 'Robotics Engineer',
  'Autonomous Systems Engineer', 'Reinforcement Learning Engineer', 'AI Ethics Researcher',
  'Natural Language Understanding Engineer', 'Conversational AI Developer', 'Chatbot Developer',
  'Prompt Engineer', 'LLM Engineer', 'Generative AI Engineer', 'AI Solutions Architect',
  
  // DevOps & Cloud (50+)
  'DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer', 'Cloud Architect',
  'Platform Engineer', 'Infrastructure Engineer', 'Systems Administrator', 'Network Engineer',
  'Security Engineer', 'Cybersecurity Analyst', 'Kubernetes Engineer', 'AWS Architect',
  'Azure Engineer', 'GCP Engineer', 'Linux Administrator', 'Database Administrator',
  'IT Support Specialist', 'Help Desk Technician', 'IT Manager', 'IT Director',
  'SRE Manager', 'Cloud Operations Manager', 'Infrastructure Manager', 'NOC Engineer',
  'Network Administrator', 'Systems Engineer', 'Virtualization Engineer', 'VMware Engineer',
  'Storage Engineer', 'Backup Administrator', 'Disaster Recovery Specialist', 'Cloud Security Engineer',
  'DevSecOps Engineer', 'Release Engineer', 'Build Engineer', 'Configuration Manager',
  'Automation Engineer', 'CI/CD Engineer', 'Jenkins Administrator', 'GitOps Engineer',
  'Container Engineer', 'Docker Specialist', 'OpenShift Engineer', 'Terraform Developer',
  'Ansible Developer', 'Puppet Developer', 'Chef Developer', 'CloudFormation Developer',
  'Monitoring Engineer', 'Observability Engineer', 'Splunk Engineer', 'Datadog Engineer',
  'Incident Response Engineer', 'On-Call Engineer', 'Production Engineer', 'Capacity Engineer',
  
  // Security (30+)
  'Security Analyst', 'Security Engineer', 'Security Architect', 'CISO',
  'Penetration Tester', 'Ethical Hacker', 'Security Consultant', 'Security Auditor',
  'SOC Analyst', 'Threat Hunter', 'Malware Analyst', 'Forensics Analyst',
  'Application Security Engineer', 'Cloud Security Architect', 'Network Security Engineer',
  'Identity Management Specialist', 'IAM Engineer', 'Access Control Administrator',
  'Vulnerability Analyst', 'Security Operations Manager', 'Compliance Analyst',
  'GRC Analyst', 'Privacy Officer', 'Data Protection Officer', 'Security Awareness Trainer',
  'Red Team Operator', 'Blue Team Analyst', 'Purple Team Lead', 'Bug Bounty Hunter',
  'Cryptographer', 'Security Researcher', 'Threat Intelligence Analyst',
  
  // Design (40+)
  'UX Designer', 'UI Designer', 'Product Designer', 'UX Researcher', 'Graphic Designer',
  'Visual Designer', 'Interaction Designer', 'Design Lead', 'Creative Director',
  'Motion Designer', 'Brand Designer', 'Web Designer', '3D Designer', 'Game Designer',
  'Interior Designer', 'Industrial Designer', 'Fashion Designer', 'Design Manager',
  'UX Writer', 'Content Designer', 'Information Architect', 'Design Systems Designer',
  'Service Designer', 'Experience Designer', 'Design Strategist', 'Design Director',
  'Art Director', 'Illustrator', 'Packaging Designer', 'Print Designer',
  'Digital Designer', 'Multimedia Designer', 'Video Designer', 'Animation Designer',
  'UI/UX Designer', 'Mobile Designer', 'App Designer', 'Design Engineer',
  'Design Researcher', 'Usability Specialist', 'Accessibility Designer', 'Design Ops Manager',
  'Head of Design', 'VP of Design', 'Chief Design Officer', 'Design Consultant',
  
  // Product & Business (40+)
  'Product Manager', 'Senior Product Manager', 'Product Owner', 'Product Director',
  'Business Analyst', 'Systems Analyst', 'Requirements Analyst', 'Technical Analyst',
  'Management Consultant', 'Strategy Consultant', 'Business Development Manager',
  'Chief Product Officer', 'VP of Product', 'Growth Product Manager', 'Platform Product Manager',
  'Technical Product Manager', 'Data Product Manager', 'AI Product Manager', 'API Product Manager',
  'Product Marketing Manager', 'Product Operations Manager', 'Product Strategist',
  'Associate Product Manager', 'Group Product Manager', 'Head of Product', 'Product Analyst',
  'Business Process Analyst', 'Process Improvement Specialist', 'Lean Consultant',
  'Change Consultant', 'Organizational Development Specialist', 'Transformation Lead',
  'Innovation Manager', 'R&D Manager', 'New Business Development', 'Partnerships Manager',
  'Strategic Planner', 'Corporate Strategy Analyst', 'M&A Analyst', 'Investment Analyst',
  'Venture Analyst', 'Portfolio Analyst', 'Business Intelligence Manager',
  
  // QA & Testing (25+)
  'QA Engineer', 'QA Analyst', 'Test Engineer', 'Automation Engineer', 'SDET',
  'Quality Manager', 'Test Lead', 'Performance Engineer', 'QA Manager',
  'Quality Assurance Director', 'Test Architect', 'Manual Tester', 'QA Specialist',
  'Test Automation Engineer', 'Selenium Developer', 'Mobile QA Engineer', 'API Tester',
  'Security Tester', 'Penetration Tester', 'Load Testing Engineer', 'Performance Tester',
  'Accessibility Tester', 'Localization Tester', 'Game Tester', 'UAT Coordinator',
  'Test Manager', 'Release QA', 'Integration Tester', 'Regression Tester',
  
  // Marketing & Sales (60+)
  'Marketing Manager', 'Digital Marketing Manager', 'Content Manager', 'SEO Specialist',
  'Social Media Manager', 'Brand Manager', 'Marketing Director', 'Growth Manager',
  'Sales Representative', 'Account Executive', 'Sales Manager', 'Business Development Rep',
  'Customer Success Manager', 'Account Manager', 'Sales Director', 'CMO',
  'Email Marketing Specialist', 'PPC Specialist', 'Content Writer', 'Copywriter',
  'Marketing Coordinator', 'Event Manager', 'PR Manager', 'Communications Manager',
  'Growth Hacker', 'Performance Marketing Manager', 'Demand Generation Manager',
  'Marketing Operations Manager', 'Marketing Automation Specialist', 'CRM Manager',
  'Field Marketing Manager', 'Channel Marketing Manager', 'Partner Marketing Manager',
  'Product Marketing Manager', 'Technical Marketing Manager', 'Content Strategist',
  'SEO Manager', 'SEM Manager', 'Paid Media Manager', 'Affiliate Manager',
  'Influencer Marketing Manager', 'Community Manager', 'Social Media Strategist',
  'Brand Strategist', 'Creative Strategist', 'Marketing Analyst', 'Market Research Analyst',
  'Sales Engineer', 'Solutions Consultant', 'Pre-Sales Engineer', 'Sales Operations Manager',
  'Revenue Operations Manager', 'Sales Enablement Manager', 'Inside Sales Representative',
  'Outside Sales Representative', 'Enterprise Account Executive', 'SMB Account Executive',
  'SDR Manager', 'BDR Manager', 'Territory Manager', 'Regional Sales Manager',
  'VP of Sales', 'Chief Revenue Officer', 'Head of Growth', 'VP of Marketing',
  
  // HR & People (35+)
  'HR Manager', 'HR Business Partner', 'Recruiter', 'Talent Acquisition Specialist',
  'People Operations Manager', 'HR Director', 'Compensation Analyst', 'L&D Manager',
  'HR Coordinator', 'Benefits Administrator', 'Payroll Specialist', 'HR Generalist',
  'Employee Relations Manager', 'CHRO', 'VP of People', 'Culture Manager',
  'Technical Recruiter', 'Executive Recruiter', 'Sourcer', 'Recruitment Manager',
  'Talent Manager', 'Workforce Planning Analyst', 'HRIS Analyst', 'HR Data Analyst',
  'Diversity & Inclusion Manager', 'Employee Experience Manager', 'Internal Communications Manager',
  'Training Coordinator', 'Leadership Development Manager', 'Organizational Development Manager',
  'Performance Management Specialist', 'Onboarding Specialist', 'HR Operations Manager',
  'Total Rewards Manager', 'Global Mobility Manager', 'HR Technology Manager',
  'Chief People Officer', 'Head of HR', 'People Analytics Manager',
  
  // Finance & Accounting (40+)
  'Financial Analyst', 'Accountant', 'Senior Accountant', 'Controller', 'CFO',
  'Tax Accountant', 'Auditor', 'FP&A Analyst', 'Treasury Analyst', 'Investment Analyst',
  'Bookkeeper', 'Accounts Payable Specialist', 'Accounts Receivable Specialist',
  'Financial Controller', 'Finance Manager', 'Credit Analyst', 'Risk Analyst',
  'Cost Accountant', 'Revenue Accountant', 'Staff Accountant', 'Accounting Manager',
  'External Auditor', 'Internal Auditor', 'Forensic Accountant', 'Tax Manager',
  'Tax Director', 'VP of Finance', 'Finance Director', 'Head of Finance',
  'Financial Planning Analyst', 'Budget Analyst', 'Billing Specialist', 'Collections Specialist',
  'Payroll Manager', 'Payroll Administrator', 'Finance Business Partner', 'Commercial Finance Manager',
  'Investment Manager', 'Portfolio Manager', 'Asset Manager', 'Fund Accountant',
  'Actuary', 'Underwriter', 'Claims Analyst', 'Insurance Analyst',
  
  // Operations & Management (35+)
  'Operations Manager', 'Operations Director', 'COO', 'General Manager', 'Office Manager',
  'Facilities Manager', 'Supply Chain Manager', 'Logistics Manager', 'Procurement Manager',
  'Warehouse Manager', 'Inventory Manager', 'Production Manager', 'Plant Manager',
  'Shift Supervisor', 'Team Lead', 'Department Manager', 'Branch Manager',
  'Operations Analyst', 'Business Operations Manager', 'Strategy & Operations Manager',
  'Process Manager', 'Continuous Improvement Manager', 'Lean Manager', 'Six Sigma Black Belt',
  'Vendor Manager', 'Supplier Manager', 'Category Manager', 'Sourcing Manager',
  'Demand Planner', 'Supply Planner', 'Materials Manager', 'Distribution Manager',
  'Fleet Manager', 'Transportation Manager', 'Import/Export Manager', 'Customs Specialist',
  'Store Operations Manager', 'Retail Operations Manager', 'Regional Operations Manager',
  
  // Legal (20+)
  'Legal Counsel', 'Corporate Lawyer', 'Compliance Officer', 'Paralegal', 'Contract Manager',
  'Legal Assistant', 'IP Lawyer', 'Employment Lawyer', 'General Counsel', 'Legal Manager',
  'Litigation Attorney', 'Corporate Attorney', 'Real Estate Attorney', 'Tax Attorney',
  'Privacy Counsel', 'Regulatory Counsel', 'Securities Lawyer', 'M&A Lawyer',
  'Legal Operations Manager', 'Contract Administrator', 'Compliance Manager', 'Ethics Officer',
  'Chief Legal Officer', 'Deputy General Counsel', 'Associate General Counsel',
  
  // Healthcare (40+)
  'Healthcare Administrator', 'Clinical Manager', 'Medical Director', 'Nurse Manager',
  'Health Informatics Specialist', 'Clinical Research Coordinator', 'Registered Nurse',
  'Physician', 'Pharmacist', 'Medical Assistant', 'Healthcare Consultant',
  'Practice Manager', 'Patient Coordinator', 'Health Coach', 'Physical Therapist',
  'Occupational Therapist', 'Speech Therapist', 'Respiratory Therapist', 'Lab Technician',
  'Radiologic Technologist', 'Surgical Technologist', 'Phlebotomist', 'Medical Coder',
  'Medical Biller', 'Health Information Manager', 'Clinical Data Manager', 'Biostatistician',
  'Clinical Trial Manager', 'Regulatory Affairs Specialist', 'Quality Assurance Specialist',
  'Nurse Practitioner', 'Physician Assistant', 'Dentist', 'Dental Hygienist',
  'Optometrist', 'Veterinarian', 'Psychologist', 'Psychiatrist', 'Counselor', 'Social Worker',
  'Care Coordinator', 'Case Manager', 'Patient Navigator', 'Healthcare Data Analyst',
  
  // Education (25+)
  'Teacher', 'Professor', 'Instructor', 'Tutor', 'Training Manager', 'Curriculum Developer',
  'Academic Advisor', 'School Administrator', 'Principal', 'Dean', 'Education Consultant',
  'Instructional Designer', 'E-Learning Developer', 'Learning Experience Designer',
  'Corporate Trainer', 'Technical Trainer', 'Sales Trainer', 'Soft Skills Trainer',
  'Education Program Manager', 'Student Success Manager', 'Admissions Counselor',
  'Career Counselor', 'Guidance Counselor', 'Special Education Teacher', 'ESL Teacher',
  'Online Course Creator', 'Educational Content Writer', 'Assessment Specialist',
  
  // Warehouse & Logistics (20+)
  'Warehouse Worker', 'Warehouse Supervisor', 'Forklift Operator', 'Picker/Packer',
  'Shipping Clerk', 'Receiving Clerk', 'Inventory Clerk', 'Distribution Manager',
  'Logistics Coordinator', 'Supply Chain Analyst', 'Transportation Manager',
  'Delivery Driver', 'Courier', 'Fleet Manager', 'Route Planner',
  'Warehouse Operations Manager', 'Fulfillment Center Manager', 'Last Mile Manager',
  'Import Coordinator', 'Export Coordinator', 'Customs Broker',
  
  // Construction & Trades (30+)
  'Construction Worker', 'Carpenter', 'Electrician', 'Plumber', 'HVAC Technician',
  'Welder', 'Mason', 'Painter', 'Roofer', 'Site Supervisor', 'Site Manager',
  'Construction Manager', 'Civil Engineer', 'Structural Engineer', 'Architect',
  'Project Engineer', 'Field Engineer', 'Estimator', 'Quantity Surveyor',
  'Safety Manager', 'Safety Officer', 'Quality Control Inspector', 'Building Inspector',
  'Mechanical Engineer', 'Electrical Engineer', 'Surveyor', 'CAD Technician',
  'BIM Manager', 'BIM Coordinator', 'Construction Superintendent', 'Foreman',
  'Heavy Equipment Operator', 'Crane Operator', 'Ironworker', 'Pipefitter',
  
  // Retail & Hospitality (30+)
  'Retail Associate', 'Store Manager', 'Cashier', 'Sales Associate', 'Visual Merchandiser',
  'Restaurant Manager', 'Chef', 'Cook', 'Server', 'Bartender', 'Host/Hostess',
  'Hotel Manager', 'Front Desk Agent', 'Concierge', 'Housekeeping Manager',
  'Event Coordinator', 'Catering Manager', 'Banquet Manager', 'Food Service Manager',
  'District Manager', 'Area Manager', 'Loss Prevention Specialist', 'Inventory Specialist',
  'Merchandising Manager', 'Buyer', 'Category Manager', 'Retail Analyst',
  'Guest Services Manager', 'Revenue Manager', 'Reservations Manager', 'Spa Manager',
  
  // Customer Service (20+)
  'Customer Service Representative', 'Support Specialist', 'Call Center Agent',
  'Client Relations Manager', 'Technical Support', 'Customer Experience Manager',
  'Complaints Handler', 'Service Desk Analyst', 'Help Desk Support', 'Support Manager',
  'Customer Success Specialist', 'Implementation Specialist', 'Onboarding Specialist',
  'Escalation Specialist', 'Quality Analyst', 'Training Specialist', 'Knowledge Manager',
  'Community Support Specialist', 'Chat Support Agent', 'Email Support Specialist',
  
  // Media & Entertainment (25+)
  'Video Editor', 'Film Director', 'Producer', 'Photographer', 'Videographer',
  'Sound Engineer', 'Music Producer', 'Journalist', 'Reporter', 'Editor',
  'Content Creator', 'Social Media Influencer', 'Podcast Producer', 'Podcast Host',
  'Broadcast Engineer', 'Audio Engineer', 'Lighting Technician', 'Camera Operator',
  'Post-Production Supervisor', 'Colorist', 'VFX Artist', 'Compositor',
  'Animator', '3D Artist', 'Motion Graphics Artist', 'Storyboard Artist',
  
  // Research & Science (25+)
  'Research Scientist', 'Lab Technician', 'Research Assistant', 'Scientist',
  'Chemist', 'Biologist', 'Physicist', 'Environmental Scientist', 'Research Director',
  'Clinical Researcher', 'Research Associate', 'Principal Investigator', 'Postdoctoral Fellow',
  'Lab Manager', 'Quality Control Analyst', 'Formulation Scientist', 'Process Scientist',
  'Materials Scientist', 'Geologist', 'Hydrologist', 'Ecologist', 'Marine Biologist',
  'Geneticist', 'Microbiologist', 'Biochemist', 'Neuroscientist',
  
  // Other/General (30+)
  'Technical Writer', 'Documentation Specialist', 'Executive Assistant', 'Administrative Assistant',
  'Office Administrator', 'Receptionist', 'Virtual Assistant', 'Personal Assistant',
  'Translator', 'Interpreter', 'Grant Writer', 'Proposal Writer', 'Freelancer', 'Consultant',
  'Executive', 'C-Suite Executive', 'Board Member', 'Advisor', 'Entrepreneur', 'Founder',
  'Chief of Staff', 'Executive Director', 'Managing Director', 'Vice President',
  'Senior Vice President', 'Executive Vice President', 'Partner', 'Associate Partner',
  'Independent Contractor', 'Gig Worker', 'Remote Worker', 'Digital Nomad'
];

/**
 * Industries Database
 */
export const INDUSTRIES = [
  'Technology/IT',
  'Healthcare/Medical',
  'Finance/Banking',
  'Insurance',
  'Education',
  'Manufacturing',
  'Retail/E-commerce',
  'Telecommunications',
  'Energy/Utilities',
  'Real Estate',
  'Construction',
  'Transportation/Logistics',
  'Media/Entertainment',
  'Hospitality/Tourism',
  'Legal Services',
  'Consulting',
  'Government/Public Sector',
  'Non-Profit/NGO',
  'Automotive',
  'Aerospace/Defense',
  'Pharmaceutical',
  'Agriculture',
  'Food & Beverage',
  'Gaming',
  'Sports',
  'Fashion/Apparel',
  'Consumer Goods',
  'Chemicals',
  'Mining/Metals',
  'Environmental Services'
];

/**
 * Certifications Database by job category
 */
export const CERTIFICATIONS_DATABASE: Record<string, string[]> = {
  'project': ['PMP', 'PRINCE2', 'CAPM', 'CSM', 'PMI-ACP', 'Agile Certified Practitioner', 'Six Sigma Green Belt', 'Six Sigma Black Belt', 'Lean Six Sigma', 'SAFe Agilist', 'ICAgile', 'Certified ScrumMaster'],
  'software': ['AWS Certified Developer', 'AWS Solutions Architect', 'Azure Developer', 'Google Cloud Professional', 'Kubernetes Administrator (CKA)', 'Docker Certified Associate', 'Oracle Certified Professional', 'Salesforce Certified Developer', 'Microsoft Certified: Azure Developer'],
  'data': ['AWS Machine Learning', 'Google Data Engineer', 'Azure Data Scientist', 'Databricks Certified', 'Tableau Desktop Specialist', 'Power BI Certification', 'Google Analytics Certified', 'Certified Analytics Professional', 'SAS Certified Data Scientist'],
  'security': ['CISSP', 'CISM', 'CEH', 'CompTIA Security+', 'OSCP', 'CISA', 'GSEC', 'CCSP', 'CRISC', 'GIAC Certifications'],
  'network': ['CCNA', 'CCNP', 'CompTIA Network+', 'JNCIA', 'AWS Networking', 'CCIE', 'JNCIS', 'CompTIA A+'],
  'design': ['Google UX Design', 'Adobe Certified Expert', 'HFI CUA', 'Nielsen Norman Group UX', 'Interaction Design Foundation', 'UX Certification'],
  'hr': ['SHRM-CP', 'SHRM-SCP', 'PHR', 'SPHR', 'CIPD', 'GPHR', 'Talent Management Practitioner'],
  'finance': ['CPA', 'CFA', 'CMA', 'FRM', 'CIA', 'CFP', 'CAIA', 'Series 7', 'Series 63', 'EA'],
  'marketing': ['Google Ads Certification', 'HubSpot Certification', 'Facebook Blueprint', 'Google Analytics', 'Content Marketing Certification', 'SEMrush Certification'],
  'sales': ['Salesforce Certified', 'HubSpot Sales', 'Sandler Training', 'SPIN Selling', 'Challenger Sale Certified'],
  'cloud': ['AWS Certified Solutions Architect', 'Azure Administrator', 'Google Cloud Architect', 'Terraform Associate', 'Kubernetes CKA/CKAD'],
  'general': ['ITIL Foundation', 'Scrum Master', 'Product Owner', 'Change Management', 'Lean Six Sigma Yellow Belt', 'TOGAF']
};

/**
 * Languages Database
 */
export const LANGUAGES = [
  'English', 'German', 'Spanish', 'French', 'Mandarin Chinese', 'Japanese', 
  'Russian', 'Italian', 'Portuguese', 'Arabic', 'Dutch', 'Korean', 
  'Polish', 'Turkish', 'Swedish', 'Hindi', 'Vietnamese', 'Thai',
  'Indonesian', 'Malay', 'Hebrew', 'Greek', 'Czech', 'Romanian',
  'Hungarian', 'Finnish', 'Norwegian', 'Danish', 'Ukrainian', 'Bengali'
];

/**
 * Experience Levels
 */
export const EXPERIENCE_LEVELS = [
  'Internship',
  'Entry-Level/Junior',
  'Mid-Level',
  'Senior',
  'Lead',
  'Staff',
  'Principal',
  'Manager',
  'Director',
  'VP',
  'Executive/C-Level'
];
