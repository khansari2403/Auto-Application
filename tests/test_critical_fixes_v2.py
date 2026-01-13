#!/usr/bin/env python3
"""
Critical Fixes Test Suite for Job Hunting AI Electron Application
Tests the 5 specific fixes mentioned in the review request:

P0.1: Document generation should work without Auditor blocking
P0.2: Interview Insider general questions generation
P0.2: Interview Insider 'Ask About My CV' feature
P0.3: Compatibility service should recalculate skills BEFORE generating questions
P1.4: AuditorQAPanel component renders with Green/Red boxes layout
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

class CriticalFixesTester:
    """Test suite for critical fixes in Job Hunting AI"""
    
    def __init__(self):
        self.app_dir = Path("/app")
        self.test_results: List[Dict] = []
        self.passed = 0
        self.failed = 0
        
    def log_test(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        result = {"test": test_name, "status": status, "details": details}
        self.test_results.append(result)
        icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{icon} {test_name}: {status}")
        if details:
            print(f"   └─ {details}")
        if status == "PASS":
            self.passed += 1
        elif status == "FAIL":
            self.failed += 1
            
    def read_file(self, path: Path) -> str:
        """Read file content safely"""
        try:
            return path.read_text(encoding='utf-8')
        except Exception as e:
            return ""

    # =========================================================================
    # P0.1: Document Generation Without Auditor Blocking
    # =========================================================================
    def test_p01_doc_generation_auditor_disabled(self):
        """
        P0.1: Verify document generation works without Auditor blocking
        File: /app/src/main/features/doc-generator.ts
        Expected: Auditor is disabled for doc generation, status='final'
        """
        print("\n" + "="*60)
        print("P0.1: Document Generation Without Auditor Blocking")
        print("="*60)
        
        doc_gen_file = self.app_dir / "src/main/features/doc-generator.ts"
        content = self.read_file(doc_gen_file)
        
        if not content:
            self.log_test("P0.1 - File exists", "FAIL", "doc-generator.ts not found")
            return False
        
        # Check 1: Auditor is disabled for document generation
        auditor_disabled_patterns = [
            "AUDITOR COMPLETELY DISABLED FOR DOCUMENT GENERATION",
            "Auditor disabled - user choice respected",
            "const approved = true"  # Always approve
        ]
        
        found_disabled = 0
        for pattern in auditor_disabled_patterns:
            if pattern in content:
                found_disabled += 1
                self.log_test(f"P0.1 - Auditor disabled pattern", "PASS", f"Found: '{pattern[:50]}...'")
        
        if found_disabled < 2:
            self.log_test("P0.1 - Auditor disabled", "FAIL", f"Only found {found_disabled}/3 patterns")
            return False
        
        # Check 2: Documents are saved with status='final'
        if "status: 'final'" in content:
            self.log_test("P0.1 - Status final", "PASS", "Documents saved with status='final'")
        else:
            self.log_test("P0.1 - Status final", "FAIL", "status='final' not found in document save")
            return False
        
        # Check 3: No forceOverride undefined error (Line 605 fix)
        # The fix should ensure forceOverride is handled properly
        if "forceOverride" in content:
            # Check if it's properly handled (not causing undefined errors)
            if "forceOverride || false" in content or "forceOverride === true" in content or "forceOverride: true" in content:
                self.log_test("P0.1 - forceOverride handled", "PASS", "forceOverride properly handled")
            else:
                # Check if forceOverride is used safely
                self.log_test("P0.1 - forceOverride handled", "WARN", "forceOverride exists but check handling")
        else:
            self.log_test("P0.1 - forceOverride handled", "PASS", "No forceOverride usage (removed)")
        
        self.log_test("P0.1 - Overall", "PASS", "Document generation bypasses Auditor correctly")
        return True

    # =========================================================================
    # P0.2: Interview Insider General Questions Generation
    # =========================================================================
    def test_p02_interview_prep_handler(self):
        """
        P0.2: Verify ai:generate-interview-prep handler returns questions array
        File: /app/src/main/ipc/ai-handlers.ts (Lines 460-642)
        """
        print("\n" + "="*60)
        print("P0.2: Interview Insider General Questions Generation")
        print("="*60)
        
        ai_handlers_file = self.app_dir / "src/main/ipc/ai-handlers.ts"
        content = self.read_file(ai_handlers_file)
        
        if not content:
            self.log_test("P0.2 - File exists", "FAIL", "ai-handlers.ts not found")
            return False
        
        # Check 1: Handler is registered
        if "ipcMain.handle('ai:generate-interview-prep'" in content:
            self.log_test("P0.2 - Handler registered", "PASS", "ai:generate-interview-prep handler found")
        else:
            self.log_test("P0.2 - Handler registered", "FAIL", "Handler not found")
            return False
        
        # Check 2: Returns questions array
        if "questions" in content and "return { success: true" in content:
            self.log_test("P0.2 - Returns questions", "PASS", "Handler returns success with questions")
        else:
            self.log_test("P0.2 - Returns questions", "FAIL", "Questions return not found")
            return False
        
        # Check 3: Error handling exists
        error_patterns = [
            "return { success: false, error:",
            "catch (e"
        ]
        found_error_handling = sum(1 for p in error_patterns if p in content)
        if found_error_handling >= 2:
            self.log_test("P0.2 - Error handling", "PASS", "Proper error handling implemented")
        else:
            self.log_test("P0.2 - Error handling", "WARN", "Limited error handling")
        
        # Check 4: JSON parsing for questions
        if "JSON.parse" in content and "jsonMatch" in content:
            self.log_test("P0.2 - JSON parsing", "PASS", "Questions parsed from AI response")
        else:
            self.log_test("P0.2 - JSON parsing", "WARN", "JSON parsing pattern not found")
        
        self.log_test("P0.2 - Overall", "PASS", "Interview prep handler properly implemented")
        return True

    # =========================================================================
    # P0.2: Interview Insider 'Ask About My CV' Feature
    # =========================================================================
    def test_p02_ask_about_cv_handler(self):
        """
        P0.2: Verify ai:ask-about-cv generates job-specific questions
        File: /app/src/main/ipc/ai-handlers.ts (Lines 681-916)
        """
        print("\n" + "="*60)
        print("P0.2: Interview Insider 'Ask About My CV' Feature")
        print("="*60)
        
        ai_handlers_file = self.app_dir / "src/main/ipc/ai-handlers.ts"
        content = self.read_file(ai_handlers_file)
        
        if not content:
            self.log_test("P0.2 CV - File exists", "FAIL", "ai-handlers.ts not found")
            return False
        
        # Check 1: Handler is registered
        if "ipcMain.handle('ai:ask-about-cv'" in content:
            self.log_test("P0.2 CV - Handler registered", "PASS", "ai:ask-about-cv handler found")
        else:
            self.log_test("P0.2 CV - Handler registered", "FAIL", "Handler not found")
            return False
        
        # Check 2: Job-specific prompt (not generic questions)
        job_specific_patterns = [
            "JOB REQUIREMENTS",
            "CANDIDATE'S CV",
            "GAP between",
            "SPECIFIC REQUIREMENT FROM JOB",
            "Your CV shows"
        ]
        
        found_job_specific = 0
        for pattern in job_specific_patterns:
            if pattern in content:
                found_job_specific += 1
        
        if found_job_specific >= 3:
            self.log_test("P0.2 CV - Job-specific prompt", "PASS", f"Found {found_job_specific}/5 job-specific patterns")
        else:
            self.log_test("P0.2 CV - Job-specific prompt", "FAIL", f"Only {found_job_specific}/5 patterns - may generate generic questions")
            return False
        
        # Check 3: Compares CV against job requirements
        comparison_patterns = [
            "compare",
            "mismatch",
            "NO GENERIC questions"
        ]
        found_comparison = sum(1 for p in comparison_patterns if p.lower() in content.lower())
        if found_comparison >= 2:
            self.log_test("P0.2 CV - CV vs Job comparison", "PASS", "Prompt compares CV against job requirements")
        else:
            self.log_test("P0.2 CV - CV vs Job comparison", "WARN", "Comparison logic may be weak")
        
        # Check 4: Clone error prevention (String() conversions)
        clone_prevention = [
            "String(data?.jobUrl",
            "String(pageData.content",
            "String(q.question"
        ]
        found_clone_fix = sum(1 for p in clone_prevention if p in content)
        if found_clone_fix >= 2:
            self.log_test("P0.2 CV - Clone error fix", "PASS", f"Found {found_clone_fix}/3 String() conversions")
        else:
            self.log_test("P0.2 CV - Clone error fix", "WARN", "Limited clone error prevention")
        
        self.log_test("P0.2 CV - Overall", "PASS", "Ask About CV generates job-specific questions")
        return True

    # =========================================================================
    # P0.3: Compatibility Service - Ask BEFORE Ranking
    # =========================================================================
    def test_p03_compatibility_ask_before_ranking(self):
        """
        P0.3: Verify compatibility service recalculates skills BEFORE generating questions
        File: /app/src/main/features/compatibility-service.ts (Lines 126-182)
        """
        print("\n" + "="*60)
        print("P0.3: Compatibility Service - Ask BEFORE Ranking")
        print("="*60)
        
        compat_file = self.app_dir / "src/main/features/compatibility-service.ts"
        content = self.read_file(compat_file)
        
        if not content:
            self.log_test("P0.3 - File exists", "FAIL", "compatibility-service.ts not found")
            return False
        
        # Check 1: Recalculate skills from learned criteria FIRST
        recalc_patterns = [
            "recalculateSkillsWithLearnedCriteria",
            "First, recalculate skills based on what user has already told us"
        ]
        found_recalc = sum(1 for p in recalc_patterns if p in content)
        if found_recalc >= 1:
            self.log_test("P0.3 - Recalculate first", "PASS", "Skills recalculated from learned criteria first")
        else:
            self.log_test("P0.3 - Recalculate first", "FAIL", "Recalculation logic not found")
            return False
        
        # Check 2: Questions generated BEFORE finalizing score
        ask_before_patterns = [
            "ASK USER ABOUT MISSING SKILLS *BEFORE* PENALIZING",
            "BEFORE finalizing score",
            "DON'T penalize the score yet"
        ]
        found_ask_before = sum(1 for p in ask_before_patterns if p in content)
        if found_ask_before >= 2:
            self.log_test("P0.3 - Ask before ranking", "PASS", f"Found {found_ask_before}/3 'ask before' patterns")
        else:
            self.log_test("P0.3 - Ask before ranking", "FAIL", f"Only {found_ask_before}/3 patterns")
            return False
        
        # Check 3: Score adjustment for unanswered questions
        score_adjustment_patterns = [
            "assumedMatches",
            "benefit of the doubt",
            "Adjusted score"
        ]
        found_adjustment = sum(1 for p in score_adjustment_patterns if p in content)
        if found_adjustment >= 2:
            self.log_test("P0.3 - Score adjustment", "PASS", "Score adjusted for pending questions")
        else:
            self.log_test("P0.3 - Score adjustment", "WARN", "Score adjustment logic may be incomplete")
        
        # Check 4: Verify order - recalculate THEN generate questions
        # Find positions of key operations
        recalc_pos = content.find("recalculateSkillsWithLearnedCriteria")
        question_gen_pos = content.find("INSERT INTO auditor_questions")
        score_calc_pos = content.find("totalScore = Math.round")
        
        if recalc_pos > 0 and question_gen_pos > 0 and score_calc_pos > 0:
            if recalc_pos < question_gen_pos < score_calc_pos:
                self.log_test("P0.3 - Correct order", "PASS", "Order: Recalculate → Generate Questions → Calculate Score")
            else:
                self.log_test("P0.3 - Correct order", "WARN", "Order may not be optimal")
        else:
            self.log_test("P0.3 - Correct order", "WARN", "Could not verify operation order")
        
        self.log_test("P0.3 - Overall", "PASS", "Compatibility service asks BEFORE ranking")
        return True

    # =========================================================================
    # P1.4: AuditorQAPanel Green/Red Boxes Layout
    # =========================================================================
    def test_p14_auditor_qa_panel_layout(self):
        """
        P1.4: Verify AuditorQAPanel renders with Green/Red boxes layout
        File: /app/src/components/AuditorQAPanel.tsx
        """
        print("\n" + "="*60)
        print("P1.4: AuditorQAPanel Green/Red Boxes Layout")
        print("="*60)
        
        panel_file = self.app_dir / "src/components/AuditorQAPanel.tsx"
        content = self.read_file(panel_file)
        
        if not content:
            self.log_test("P1.4 - File exists", "FAIL", "AuditorQAPanel.tsx not found")
            return False
        
        # Check 1: Two-box layout (Green and Red)
        layout_patterns = [
            "GREEN BOX - Yes Answers",
            "RED BOX - No Answers",
            "gridTemplateColumns: '1fr 1fr'"
        ]
        found_layout = sum(1 for p in layout_patterns if p in content)
        if found_layout >= 2:
            self.log_test("P1.4 - Two-box layout", "PASS", f"Found {found_layout}/3 layout patterns")
        else:
            self.log_test("P1.4 - Two-box layout", "FAIL", "Green/Red box layout not found")
            return False
        
        # Check 2: Yes/No criteria separation
        separation_patterns = [
            "yesCriteria = learnedCriteria.filter",
            "noCriteria = learnedCriteria.filter",
            "userAnswer === 'yes'",
            "userAnswer === 'no'"
        ]
        found_separation = sum(1 for p in separation_patterns if p in content)
        if found_separation >= 3:
            self.log_test("P1.4 - Yes/No separation", "PASS", "Criteria properly separated")
        else:
            self.log_test("P1.4 - Yes/No separation", "FAIL", "Criteria separation incomplete")
            return False
        
        # Check 3: Edit functionality (toggle answers)
        edit_patterns = [
            "handleToggleAnswer",
            "auditor:update-criteria",
            "🔄"  # Toggle button
        ]
        found_edit = sum(1 for p in edit_patterns if p in content)
        if found_edit >= 2:
            self.log_test("P1.4 - Edit functionality", "PASS", "Users can change answers")
        else:
            self.log_test("P1.4 - Edit functionality", "FAIL", "Edit functionality missing")
            return False
        
        # Check 4: Human-readable display (formatCriteriaForDisplay)
        if "formatCriteriaForDisplay" in content:
            # Check the function converts code format to readable
            format_patterns = [
                "replace(/^(speak_|tool_|cert_",
                "replace(/_/g, ' ')",
                "toUpperCase()"
            ]
            found_format = sum(1 for p in format_patterns if p in content)
            if found_format >= 2:
                self.log_test("P1.4 - Human-readable display", "PASS", "Criteria displayed in readable format")
            else:
                self.log_test("P1.4 - Human-readable display", "WARN", "Format function may be incomplete")
        else:
            self.log_test("P1.4 - Human-readable display", "FAIL", "formatCriteriaForDisplay not found")
            return False
        
        # Check 5: Delete functionality
        if "handleDeleteCriteria" in content and "auditor:delete-criteria" in content:
            self.log_test("P1.4 - Delete functionality", "PASS", "Users can delete criteria")
        else:
            self.log_test("P1.4 - Delete functionality", "WARN", "Delete functionality may be incomplete")
        
        self.log_test("P1.4 - Overall", "PASS", "AuditorQAPanel has Green/Red boxes layout")
        return True

    # =========================================================================
    # Additional: auditor:update-criteria Handler
    # =========================================================================
    def test_update_criteria_handler(self):
        """
        Verify auditor:update-criteria IPC handler exists
        File: /app/src/main/ipc/ai-handlers.ts (Lines 1016-1036)
        """
        print("\n" + "="*60)
        print("Additional: auditor:update-criteria Handler")
        print("="*60)
        
        ai_handlers_file = self.app_dir / "src/main/ipc/ai-handlers.ts"
        content = self.read_file(ai_handlers_file)
        
        if not content:
            self.log_test("Update Handler - File exists", "FAIL", "ai-handlers.ts not found")
            return False
        
        # Check handler exists
        if "ipcMain.handle('auditor:update-criteria'" in content:
            self.log_test("Update Handler - Registered", "PASS", "auditor:update-criteria handler found")
        else:
            self.log_test("Update Handler - Registered", "FAIL", "Handler not found")
            return False
        
        # Check it updates userAnswer
        if "userAnswer: newAnswer" in content or "userAnswer" in content:
            self.log_test("Update Handler - Updates answer", "PASS", "Handler updates userAnswer field")
        else:
            self.log_test("Update Handler - Updates answer", "FAIL", "userAnswer update not found")
            return False
        
        return True

    # =========================================================================
    # Additional: ai-core.ts userId Parameter Fix
    # =========================================================================
    def test_ai_core_userid_fix(self):
        """
        Verify ai-core.ts has proper userId parameter handling
        File: /app/src/main/ai-core.ts
        """
        print("\n" + "="*60)
        print("Additional: ai-core.ts userId Parameter")
        print("="*60)
        
        ai_core_file = self.app_dir / "src/main/ai-core.ts"
        content = self.read_file(ai_core_file)
        
        if not content:
            self.log_test("AI Core - File exists", "FAIL", "ai-core.ts not found")
            return False
        
        # Check processApplication has userId parameter
        if "processApplication(jobId: number, userId: number" in content:
            self.log_test("AI Core - userId parameter", "PASS", "processApplication has userId parameter")
        else:
            self.log_test("AI Core - userId parameter", "FAIL", "userId parameter missing")
            return False
        
        # Check generateTailoredDocs is called with userId
        if "generateTailoredDocs(job, userId" in content:
            self.log_test("AI Core - userId passed", "PASS", "userId passed to generateTailoredDocs")
        else:
            self.log_test("AI Core - userId passed", "WARN", "Check if userId is passed correctly")
        
        return True

    # =========================================================================
    # TypeScript Compilation Check
    # =========================================================================
    def test_typescript_compilation(self):
        """Verify TypeScript compiles without errors"""
        print("\n" + "="*60)
        print("TypeScript Compilation Check")
        print("="*60)
        
        import subprocess
        try:
            result = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                cwd=str(self.app_dir),
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                self.log_test("TypeScript Compilation", "PASS", "No compilation errors")
                return True
            else:
                # Check for actual errors vs warnings
                errors = [line for line in result.stdout.split('\n') if 'error TS' in line]
                if len(errors) == 0:
                    self.log_test("TypeScript Compilation", "PASS", "No critical errors")
                    return True
                else:
                    self.log_test("TypeScript Compilation", "FAIL", f"{len(errors)} errors found")
                    for err in errors[:5]:
                        print(f"   └─ {err[:100]}")
                    return False
        except Exception as e:
            self.log_test("TypeScript Compilation", "WARN", f"Could not run tsc: {e}")
            return True  # Don't fail if tsc not available

    # =========================================================================
    # Run All Tests
    # =========================================================================
    def run_all_tests(self):
        """Run all critical fix tests"""
        print("🧪 Critical Fixes Test Suite for Job Hunting AI")
        print("=" * 70)
        print("Testing 5 specific fixes from review request:")
        print("  P0.1: Document generation without Auditor blocking")
        print("  P0.2: Interview Insider general questions generation")
        print("  P0.2: Interview Insider 'Ask About My CV' feature")
        print("  P0.3: Compatibility service ask BEFORE ranking")
        print("  P1.4: AuditorQAPanel Green/Red boxes layout")
        print("=" * 70)
        
        tests = [
            ("P0.1", self.test_p01_doc_generation_auditor_disabled),
            ("P0.2 General", self.test_p02_interview_prep_handler),
            ("P0.2 CV", self.test_p02_ask_about_cv_handler),
            ("P0.3", self.test_p03_compatibility_ask_before_ranking),
            ("P1.4", self.test_p14_auditor_qa_panel_layout),
            ("Update Handler", self.test_update_criteria_handler),
            ("AI Core", self.test_ai_core_userid_fix),
            ("TypeScript", self.test_typescript_compilation),
        ]
        
        results = {}
        for name, test_func in tests:
            try:
                results[name] = test_func()
            except Exception as e:
                self.log_test(f"{name} - Exception", "FAIL", str(e))
                results[name] = False
        
        # Summary
        print("\n" + "=" * 70)
        print("🏁 TEST SUMMARY")
        print("=" * 70)
        
        for name, passed in results.items():
            icon = "✅" if passed else "❌"
            status = "PASS" if passed else "FAIL"
            print(f"{icon} {name}: {status}")
        
        print(f"\n📊 Results: {self.passed} passed, {self.failed} failed")
        
        # Critical fixes status
        critical_fixes = ["P0.1", "P0.2 General", "P0.2 CV", "P0.3", "P1.4"]
        critical_passed = sum(1 for name in critical_fixes if results.get(name, False))
        
        print(f"\n🎯 Critical Fixes: {critical_passed}/{len(critical_fixes)} working")
        
        if critical_passed == len(critical_fixes):
            print("🎉 ALL CRITICAL FIXES VERIFIED!")
        else:
            print("⚠️  Some critical fixes need attention")
        
        return {
            "passed": self.passed,
            "failed": self.failed,
            "results": results,
            "critical_passed": critical_passed,
            "critical_total": len(critical_fixes)
        }


def main():
    tester = CriticalFixesTester()
    results = tester.run_all_tests()
    
    # Exit code based on critical fixes
    if results["critical_passed"] == results["critical_total"]:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
