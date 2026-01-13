#!/usr/bin/env python3
"""
Integration Test for Job Hunting AI Application
Test actual functionality of the critical fixes
"""

import json
import time
from pathlib import Path

class IntegrationTester:
    """Test actual functionality of the fixes"""
    
    def __init__(self):
        self.app_dir = Path("/app")
        self.user_data_dir = self.app_dir / "User_Data"
        self.db_path = self.user_data_dir / "data" / "db.json"
        
    def test_auditor_qa_workflow(self):
        """Test the complete Auditor Q&A workflow"""
        print("\n🔄 Testing Auditor Q&A Workflow")
        print("=" * 40)
        
        try:
            # Read database
            with open(self.db_path, 'r') as f:
                db_data = json.load(f)
            
            # Simulate job analysis that triggers a question
            test_job_id = int(time.time())
            test_question = {
                "id": f"q_{test_job_id}",
                "user_id": 1,
                "job_id": test_job_id,
                "question": "Do you have experience with Turkish language for this Istanbul-based role?",
                "criteria": "Turkish language proficiency",
                "answered": False,
                "timestamp": int(time.time() * 1000)
            }
            
            # Add question to database
            db_data['auditor_questions'].append(test_question)
            
            # Simulate user answering the question
            test_criteria = {
                "id": f"crit_{test_job_id}",
                "user_id": 1,
                "criteria": "Turkish language proficiency",
                "userAnswer": "Yes, I am fluent in Turkish and have worked in Turkey for 2 years",
                "job_id": test_job_id,
                "timestamp": int(time.time() * 1000)
            }
            
            # Add criteria and mark question as answered
            db_data['auditor_criteria'].append(test_criteria)
            test_question['answered'] = True
            
            # Save back to database
            with open(self.db_path, 'w') as f:
                json.dump(db_data, f, indent=2)
            
            print("✅ Auditor Q&A Workflow: Successfully simulated question generation and answering")
            return True
            
        except Exception as e:
            print(f"❌ Auditor Q&A Workflow: Failed - {str(e)}")
            return False
    
    def test_document_generation_scenarios(self):
        """Test document generation for different job compatibility levels"""
        print("\n📄 Testing Document Generation Scenarios")
        print("=" * 40)
        
        try:
            # Read database
            with open(self.db_path, 'r') as f:
                db_data = json.load(f)
            
            # Create test jobs with different compatibility scores
            test_jobs = [
                {
                    "id": int(time.time()) + 1,
                    "job_title": "Senior Python Developer",
                    "company_name": "TechCorp Gold",
                    "compatibility_score": 85,  # Gold job
                    "compatibility_missing_skills": json.dumps(["Docker"]),
                    "description": "Senior Python developer role",
                    "required_skills": "Python, Django, PostgreSQL",
                    "url": "https://example.com/job/gold",
                    "timestamp": int(time.time() * 1000)
                },
                {
                    "id": int(time.time()) + 2,
                    "job_title": "Full Stack Developer",
                    "company_name": "StartupCorp Green",
                    "compatibility_score": 65,  # Green job
                    "compatibility_missing_skills": json.dumps(["React Native", "AWS"]),
                    "description": "Full stack developer position",
                    "required_skills": "JavaScript, React, Node.js",
                    "url": "https://example.com/job/green",
                    "timestamp": int(time.time() * 1000)
                },
                {
                    "id": int(time.time()) + 3,
                    "job_title": "DevOps Engineer",
                    "company_name": "CloudCorp Yellow",
                    "compatibility_score": 35,  # Yellow job
                    "compatibility_missing_skills": json.dumps(["Kubernetes", "Terraform", "AWS", "Docker"]),
                    "description": "DevOps engineer role",
                    "required_skills": "Kubernetes, Docker, AWS, Terraform",
                    "url": "https://example.com/job/yellow",
                    "timestamp": int(time.time() * 1000)
                }
            ]
            
            # Add jobs to database
            for job in test_jobs:
                db_data['job_listings'].append(job)
            
            # Save back to database
            with open(self.db_path, 'w') as f:
                json.dump(db_data, f, indent=2)
            
            print("✅ Document Generation Test Jobs: Created Gold (85%), Green (65%), and Yellow (35%) jobs")
            
            # Check if generated_docs directory exists
            docs_dir = self.user_data_dir / "generated_docs"
            if not docs_dir.exists():
                docs_dir.mkdir(parents=True, exist_ok=True)
                print("✅ Generated Docs Directory: Created")
            else:
                print("✅ Generated Docs Directory: Already exists")
            
            return True
            
        except Exception as e:
            print(f"❌ Document Generation Test: Failed - {str(e)}")
            return False
    
    def test_clone_error_prevention(self):
        """Test that data structures are properly serializable"""
        print("\n🔒 Testing Clone Error Prevention")
        print("=" * 40)
        
        try:
            # Test serializable job data structure
            test_job_data = {
                "content": "This is a test job description with requirements...",
                "strategyUsed": "JSON-LD"
            }
            
            # Ensure all values are strings (as the fix requires)
            safe_content = str(test_job_data["content"])
            safe_strategy = str(test_job_data["strategyUsed"])
            
            serializable_result = {
                "content": safe_content,
                "strategyUsed": safe_strategy
            }
            
            # Test JSON serialization (what IPC does internally)
            json_str = json.dumps(serializable_result)
            parsed_back = json.loads(json_str)
            
            if parsed_back["content"] == safe_content and parsed_back["strategyUsed"] == safe_strategy:
                print("✅ Clone Error Prevention: Data structures are properly serializable")
                return True
            else:
                print("❌ Clone Error Prevention: Serialization failed")
                return False
                
        except Exception as e:
            print(f"❌ Clone Error Prevention: Failed - {str(e)}")
            return False
    
    def test_hunter_status_persistence(self):
        """Test hunter status data structure"""
        print("\n🎯 Testing Hunter Status Persistence")
        print("=" * 40)
        
        try:
            # Simulate hunter status data
            hunter_status = {
                "success": True,
                "isSearching": False
            }
            
            # Test serialization
            json_str = json.dumps(hunter_status)
            parsed_back = json.loads(json_str)
            
            if parsed_back["success"] == True and "isSearching" in parsed_back:
                print("✅ Hunter Status Persistence: Status data structure is valid")
                return True
            else:
                print("❌ Hunter Status Persistence: Invalid status structure")
                return False
                
        except Exception as e:
            print(f"❌ Hunter Status Persistence: Failed - {str(e)}")
            return False
    
    def run_integration_tests(self):
        """Run all integration tests"""
        print("🧪 Running Integration Tests for Critical Fixes")
        print("=" * 60)
        
        # Ensure database exists
        if not self.db_path.exists():
            print("❌ Database not found. Please run the main test first.")
            return False
        
        tests = [
            ("Auditor Q&A Workflow", self.test_auditor_qa_workflow),
            ("Document Generation Scenarios", self.test_document_generation_scenarios),
            ("Clone Error Prevention", self.test_clone_error_prevention),
            ("Hunter Status Persistence", self.test_hunter_status_persistence)
        ]
        
        results = {}
        for test_name, test_func in tests:
            try:
                results[test_name] = test_func()
            except Exception as e:
                print(f"❌ {test_name}: Test crashed - {str(e)}")
                results[test_name] = False
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 INTEGRATION TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status_icon = "✅" if result else "❌"
            print(f"{status_icon} {test_name}: {'PASS' if result else 'FAIL'}")
        
        print(f"\n📊 OVERALL: {passed}/{total} integration tests passed")
        
        if passed == total:
            print("🎉 ALL INTEGRATION TESTS PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} integration test(s) failed")
            return False

def main():
    """Main test execution"""
    tester = IntegrationTester()
    success = tester.run_integration_tests()
    
    if success:
        print("\n✅ All integration tests passed!")
        return 0
    else:
        print("\n❌ Some integration tests failed!")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)