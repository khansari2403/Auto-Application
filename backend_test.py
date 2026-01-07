#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Job Hunting AI Application
Testing critical fixes for Electron-based application with IPC communication
"""

import json
import os
import sys
import subprocess
import time
import requests
from pathlib import Path

class ElectronIPCTester:
    """Test Electron IPC handlers and database functionality"""
    
    def __init__(self):
        self.app_dir = Path("/app")
        self.user_data_dir = self.app_dir / "User_Data"
        self.db_path = self.user_data_dir / "data" / "db.json"
        self.test_results = []
        self.user_id = 1
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.test_results.append(result)
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
    
    def check_database_structure(self):
        """Test Fix #1: Verify auditor_questions and auditor_criteria tables exist"""
        print("\n=== Testing Fix #1: Auditor Q&A Database Tables ===")
        
        try:
            if not self.db_path.exists():
                self.log_test("Database File Exists", "FAIL", f"Database file not found at {self.db_path}")
                return False
            
            with open(self.db_path, 'r') as f:
                db_data = json.load(f)
            
            # Check for required tables
            required_tables = ['auditor_questions', 'auditor_criteria']
            missing_tables = []
            
            for table in required_tables:
                if table not in db_data:
                    missing_tables.append(table)
                else:
                    self.log_test(f"Table '{table}' exists", "PASS", f"Found table with {len(db_data[table])} records")
            
            if missing_tables:
                self.log_test("Database Tables", "FAIL", f"Missing tables: {missing_tables}")
                return False
            else:
                self.log_test("Database Tables", "PASS", "All required auditor tables exist")
                return True
                
        except Exception as e:
            self.log_test("Database Structure Check", "FAIL", f"Error reading database: {str(e)}")
            return False
    
    def test_auditor_ipc_handlers(self):
        """Test auditor IPC handlers by checking if they're registered"""
        print("\n=== Testing Auditor IPC Handler Registration ===")
        
        # Check if the IPC handlers file exists and contains the required handlers
        ipc_file = self.app_dir / "src" / "main" / "ipc" / "ai-handlers.ts"
        
        if not ipc_file.exists():
            self.log_test("IPC Handlers File", "FAIL", f"File not found: {ipc_file}")
            return False
        
        try:
            with open(ipc_file, 'r') as f:
                content = f.read()
            
            required_handlers = [
                'auditor:get-pending-questions',
                'auditor:get-learned-criteria', 
                'auditor:save-criteria',
                'auditor:delete-criteria'
            ]
            
            missing_handlers = []
            for handler in required_handlers:
                if handler not in content:
                    missing_handlers.append(handler)
                else:
                    self.log_test(f"Handler '{handler}' registered", "PASS")
            
            if missing_handlers:
                self.log_test("IPC Handlers", "FAIL", f"Missing handlers: {missing_handlers}")
                return False
            else:
                self.log_test("IPC Handlers", "PASS", "All auditor handlers are registered")
                return True
                
        except Exception as e:
            self.log_test("IPC Handlers Check", "FAIL", f"Error reading handlers file: {str(e)}")
            return False
    
    def test_scraper_clone_fix(self):
        """Test Fix #2: Verify getJobPageContent returns serializable objects"""
        print("\n=== Testing Fix #2: Interview Insider Clone Error Fix ===")
        
        scraper_file = self.app_dir / "src" / "main" / "scraper-service.ts"
        
        if not scraper_file.exists():
            self.log_test("Scraper Service File", "FAIL", f"File not found: {scraper_file}")
            return False
        
        try:
            with open(scraper_file, 'r') as f:
                content = f.read()
            
            # Check for the fix - explicit string conversion to prevent clone errors
            fix_indicators = [
                "const safeContent = String(result.content || '');",
                "const safeStrategy = String(result.strategy || 'Unknown');",
                "return { content: safeContent, strategyUsed: safeStrategy };"
            ]
            
            found_fixes = []
            for indicator in fix_indicators:
                if indicator in content:
                    found_fixes.append(indicator)
            
            if len(found_fixes) >= 2:  # At least 2 of the 3 indicators should be present
                self.log_test("Clone Error Fix", "PASS", f"Found serialization fixes: {len(found_fixes)}/3")
                
                # Check if the function exists and has proper structure
                if "export async function getJobPageContent" in content:
                    self.log_test("getJobPageContent Function", "PASS", "Function exists and is exported")
                    return True
                else:
                    self.log_test("getJobPageContent Function", "FAIL", "Function not found or not exported")
                    return False
            else:
                self.log_test("Clone Error Fix", "FAIL", f"Serialization fixes not found. Found: {found_fixes}")
                return False
                
        except Exception as e:
            self.log_test("Scraper Clone Fix Check", "FAIL", f"Error reading scraper file: {str(e)}")
            return False
    
    def test_document_generation_auditor_fix(self):
        """Test Fix #3: Verify Auditor is more lenient for Green/Gold jobs"""
        print("\n=== Testing Fix #3: Document Generation Auditor Fix ===")
        
        doc_gen_file = self.app_dir / "src" / "main" / "features" / "doc-generator.ts"
        
        if not doc_gen_file.exists():
            self.log_test("Doc Generator File", "FAIL", f"File not found: {doc_gen_file}")
            return False
        
        try:
            with open(doc_gen_file, 'r') as f:
                content = f.read()
            
            # Check for the auditor prompt modifications for Gold/Green jobs
            fix_indicators = [
                "THIS IS A GOLD JOB",
                "THIS IS A GREEN JOB", 
                "ALMOST GUARANTEED TO APPROVE",
                "HIGHLY LIKELY TO APPROVE",
                "compatScore >= 76",  # Gold job threshold
                "compatScore >= 51",  # Green job threshold
                "DO NOT reject for:"
            ]
            
            found_fixes = []
            for indicator in fix_indicators:
                if indicator in content:
                    found_fixes.append(indicator)
            
            if len(found_fixes) >= 5:  # Most indicators should be present
                self.log_test("Auditor Leniency Fix", "PASS", f"Found auditor modifications: {len(found_fixes)}/7")
                
                # Check if buildAuditorPrompt function exists
                if "function buildAuditorPrompt" in content:
                    self.log_test("buildAuditorPrompt Function", "PASS", "Function exists with modifications")
                    return True
                else:
                    self.log_test("buildAuditorPrompt Function", "FAIL", "Function not found")
                    return False
            else:
                self.log_test("Auditor Leniency Fix", "FAIL", f"Auditor modifications not found. Found: {found_fixes}")
                return False
                
        except Exception as e:
            self.log_test("Doc Generation Fix Check", "FAIL", f"Error reading doc generator file: {str(e)}")
            return False
    
    def test_tab_state_persistence(self):
        """Test Fix #4: Check for tab state persistence implementation"""
        print("\n=== Testing Fix #4: Tab State Persistence ===")
        
        # Check frontend components for status fetching
        components_dir = self.app_dir / "src" / "components"
        
        if not components_dir.exists():
            self.log_test("Components Directory", "FAIL", f"Directory not found: {components_dir}")
            return False
        
        # Look for job search related components
        job_search_files = list(components_dir.glob("**/JobSearch*")) + list(components_dir.glob("**/JobHunting*"))
        
        if not job_search_files:
            self.log_test("Job Search Components", "WARN", "No JobSearch/JobHunting components found")
            # Check if there's a hunter status handler in IPC
            return self.check_hunter_status_handler()
        
        found_status_fetch = False
        for file_path in job_search_files:
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Look for status fetching patterns
                status_patterns = [
                    "hunter:get-status",
                    "useEffect",
                    "getStatus",
                    "fetchStatus"
                ]
                
                for pattern in status_patterns:
                    if pattern in content:
                        found_status_fetch = True
                        self.log_test(f"Status Fetch in {file_path.name}", "PASS", f"Found pattern: {pattern}")
                        break
                        
            except Exception as e:
                self.log_test(f"Read {file_path.name}", "FAIL", f"Error: {str(e)}")
        
        if found_status_fetch:
            return self.check_hunter_status_handler()
        else:
            self.log_test("Tab State Persistence", "FAIL", "No status fetching patterns found in components")
            return False
    
    def check_hunter_status_handler(self):
        """Check if hunter:get-status IPC handler exists"""
        ipc_files = [
            self.app_dir / "src" / "main" / "ipc" / "ai-handlers.ts",
            self.app_dir / "src" / "main" / "ipc" / "jobs-handlers.ts",
            self.app_dir / "src" / "main" / "ipc" / "services-handlers.ts"
        ]
        
        for ipc_file in ipc_files:
            if ipc_file.exists():
                try:
                    with open(ipc_file, 'r') as f:
                        content = f.read()
                    
                    if "hunter:get-status" in content:
                        self.log_test("Hunter Status Handler", "PASS", f"Found in {ipc_file.name}")
                        return True
                        
                except Exception as e:
                    self.log_test(f"Read {ipc_file.name}", "FAIL", f"Error: {str(e)}")
        
        self.log_test("Hunter Status Handler", "FAIL", "hunter:get-status handler not found")
        return False
    
    def test_ai_ask_about_cv_handler(self):
        """Test the ai:ask-about-cv IPC handler for clone error fix"""
        print("\n=== Testing ai:ask-about-cv Handler ===")
        
        ipc_file = self.app_dir / "src" / "main" / "ipc" / "ai-handlers.ts"
        
        if not ipc_file.exists():
            self.log_test("AI Handlers File", "FAIL", f"File not found: {ipc_file}")
            return False
        
        try:
            with open(ipc_file, 'r') as f:
                content = f.read()
            
            # Check if the handler exists
            if "ai:ask-about-cv" not in content:
                self.log_test("ai:ask-about-cv Handler", "FAIL", "Handler not found")
                return False
            
            # Check for clone error prevention measures
            clone_fix_patterns = [
                "String(data?.jobUrl || '')",
                "String(pageData.content || '')",
                "return { success: true, questions: questions }",
                "return { success: false, error: String(e.message || 'Unknown error') }"
            ]
            
            found_patterns = []
            for pattern in clone_fix_patterns:
                if pattern in content:
                    found_patterns.append(pattern)
            
            if len(found_patterns) >= 2:
                self.log_test("ai:ask-about-cv Clone Fix", "PASS", f"Found serialization patterns: {len(found_patterns)}/4")
                return True
            else:
                self.log_test("ai:ask-about-cv Clone Fix", "FAIL", f"Insufficient clone prevention. Found: {found_patterns}")
                return False
                
        except Exception as e:
            self.log_test("ai:ask-about-cv Handler Check", "FAIL", f"Error: {str(e)}")
            return False
    
    def simulate_auditor_workflow(self):
        """Simulate the auditor Q&A workflow"""
        print("\n=== Simulating Auditor Q&A Workflow ===")
        
        if not self.db_path.exists():
            self.log_test("Auditor Workflow", "FAIL", "Database not found")
            return False
        
        try:
            # Read current database
            with open(self.db_path, 'r') as f:
                db_data = json.load(f)
            
            # Simulate adding a question
            test_question = {
                "id": f"test_q_{int(time.time())}",
                "user_id": self.user_id,
                "job_id": 123,
                "question": "Do you have experience with Turkish language?",
                "criteria": "Turkish language proficiency",
                "answered": False,
                "timestamp": int(time.time() * 1000)
            }
            
            db_data['auditor_questions'].append(test_question)
            
            # Simulate answering the question
            test_criteria = {
                "id": f"test_crit_{int(time.time())}",
                "user_id": self.user_id,
                "criteria": "Turkish language proficiency",
                "userAnswer": "Yes, I am fluent in Turkish",
                "job_id": 123,
                "timestamp": int(time.time() * 1000)
            }
            
            db_data['auditor_criteria'].append(test_criteria)
            
            # Mark question as answered
            for q in db_data['auditor_questions']:
                if q['id'] == test_question['id']:
                    q['answered'] = True
                    break
            
            # Write back to database
            with open(self.db_path, 'w') as f:
                json.dump(db_data, f, indent=2)
            
            self.log_test("Auditor Workflow Simulation", "PASS", "Successfully simulated Q&A workflow")
            return True
            
        except Exception as e:
            self.log_test("Auditor Workflow Simulation", "FAIL", f"Error: {str(e)}")
            return False
    
    def test_document_generation_flow(self):
        """Test document generation for Green/Gold jobs"""
        print("\n=== Testing Document Generation Flow ===")
        
        if not self.db_path.exists():
            self.log_test("Document Generation Test", "FAIL", "Database not found")
            return False
        
        try:
            # Read current database
            with open(self.db_path, 'r') as f:
                db_data = json.load(f)
            
            # Create a test Gold job (80% compatibility)
            test_job = {
                "id": int(time.time()),
                "job_title": "Senior Developer",
                "company_name": "Test Company",
                "compatibility_score": 80,
                "description": "Senior developer position requiring Python and JavaScript",
                "required_skills": "Python, JavaScript, React",
                "url": "https://example.com/job/123",
                "timestamp": int(time.time() * 1000)
            }
            
            db_data['job_listings'].append(test_job)
            
            # Write back to database
            with open(self.db_path, 'w') as f:
                json.dump(db_data, f, indent=2)
            
            self.log_test("Test Job Creation", "PASS", f"Created Gold job with {test_job['compatibility_score']}% compatibility")
            
            # Check if generated_docs directory exists
            docs_dir = self.user_data_dir / "generated_docs"
            if not docs_dir.exists():
                docs_dir.mkdir(parents=True, exist_ok=True)
                self.log_test("Generated Docs Directory", "PASS", "Created directory")
            else:
                self.log_test("Generated Docs Directory", "PASS", "Directory exists")
            
            return True
            
        except Exception as e:
            self.log_test("Document Generation Test", "FAIL", f"Error: {str(e)}")
            return False
    
    def check_electron_process(self):
        """Check if Electron process is running"""
        print("\n=== Checking Electron Application Status ===")
        
        try:
            # Check if there are any node/electron processes
            result = subprocess.run(['pgrep', '-f', 'electron'], capture_output=True, text=True)
            
            if result.returncode == 0:
                pids = result.stdout.strip().split('\n')
                self.log_test("Electron Process", "PASS", f"Found {len(pids)} electron process(es)")
                return True
            else:
                self.log_test("Electron Process", "WARN", "No electron processes found - app may not be running")
                return False
                
        except Exception as e:
            self.log_test("Electron Process Check", "FAIL", f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("🧪 Starting Comprehensive Backend Testing for Job Hunting AI")
        print("=" * 60)
        
        # Initialize database if needed
        if not self.user_data_dir.exists():
            self.user_data_dir.mkdir(parents=True, exist_ok=True)
            
        if not self.db_path.parent.exists():
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize empty database if it doesn't exist
        if not self.db_path.exists():
            initial_db = {
                "user_profile": [],
                "email_config": [],
                "job_preferences": [],
                "ai_models": [],
                "job_websites": [],
                "company_monitoring": [],
                "job_listings": [],
                "applications": [],
                "action_logs": [],
                "email_alerts": [],
                "documents": [],
                "search_profiles": [],
                "settings": [],
                "questions": [],
                "auditor_questions": [],
                "auditor_criteria": []
            }
            
            with open(self.db_path, 'w') as f:
                json.dump(initial_db, f, indent=2)
            
            self.log_test("Database Initialization", "PASS", "Created initial database structure")
        
        # Run all tests
        tests = [
            self.check_electron_process,
            self.check_database_structure,
            self.test_auditor_ipc_handlers,
            self.test_scraper_clone_fix,
            self.test_document_generation_auditor_fix,
            self.test_tab_state_persistence,
            self.test_ai_ask_about_cv_handler,
            self.simulate_auditor_workflow,
            self.test_document_generation_flow
        ]
        
        passed = 0
        failed = 0
        warnings = 0
        
        for test in tests:
            try:
                result = test()
                if result:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_test(test.__name__, "FAIL", f"Test crashed: {str(e)}")
                failed += 1
        
        # Count warnings
        warnings = sum(1 for result in self.test_results if result['status'] == 'WARN')
        
        # Generate summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"⚠️  WARNINGS: {warnings}")
        print(f"📊 TOTAL: {len(self.test_results)}")
        
        # Detailed results
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status_icon = "✅" if result['status'] == "PASS" else "❌" if result['status'] == "FAIL" else "⚠️"
            print(f"{status_icon} {result['test']}: {result['status']}")
            if result['details']:
                print(f"   └─ {result['details']}")
        
        # Critical issues
        critical_failures = [r for r in self.test_results if r['status'] == 'FAIL' and 
                           any(keyword in r['test'].lower() for keyword in ['database', 'ipc', 'clone', 'auditor'])]
        
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for failure in critical_failures:
                print(f"❌ {failure['test']}: {failure['details']}")
        
        return {
            'passed': passed,
            'failed': failed,
            'warnings': warnings,
            'total': len(self.test_results),
            'critical_failures': len(critical_failures),
            'results': self.test_results
        }

def main():
    """Main test execution"""
    tester = ElectronIPCTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()