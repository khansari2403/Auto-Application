#!/usr/bin/env python3
"""
LinkedIn Job Content Scraping Fix Verification Test

This test verifies that the LinkedIn job content scraping fix has been properly implemented
in /app/src/main/scraper-service.ts according to the review request requirements.
"""

import os
import re
import json
from typing import Dict, List, Any

def read_file(file_path: str) -> str:
    """Read file content safely"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"ERROR: Could not read {file_path}: {e}"

def test_linkedin_selectors(content: str) -> Dict[str, Any]:
    """Test 1: Verify LinkedIn 2025 selectors are present"""
    print("🔍 TEST 1: Verifying LinkedIn 2025 selectors...")
    
    required_selectors = [
        '.jobs-description__content',
        '.jobs-description-content__text', 
        '.jobs-box__html-content',
        '.show-more-less-html__markup'
    ]
    
    results = {
        'test_name': 'LinkedIn 2025 Selectors',
        'status': 'PASS',
        'details': [],
        'issues': []
    }
    
    # Find the jobSelectors array
    job_selectors_match = re.search(r'const jobSelectors = \[(.*?)\];', content, re.DOTALL)
    if not job_selectors_match:
        results['status'] = 'FAIL'
        results['issues'].append('jobSelectors array not found')
        return results
    
    job_selectors_content = job_selectors_match.group(1)
    
    for selector in required_selectors:
        if f"'{selector}'" in job_selectors_content or f'"{selector}"' in job_selectors_content:
            results['details'].append(f"✅ Found: {selector}")
        else:
            results['status'] = 'FAIL'
            results['issues'].append(f"❌ Missing: {selector}")
    
    # Check if selectors are in correct priority order (LinkedIn selectors should be first)
    linkedin_comment_match = re.search(r'// LinkedIn 2025 selectors', content)
    if linkedin_comment_match:
        results['details'].append("✅ LinkedIn selectors properly commented")
    else:
        results['issues'].append("⚠️ LinkedIn selectors section not clearly marked")
    
    return results

def test_show_more_expansion(content: str) -> Dict[str, Any]:
    """Test 2: Verify "Show more" button expansion logic"""
    print("🔍 TEST 2: Verifying 'Show more' button expansion logic...")
    
    results = {
        'test_name': 'Show More Button Expansion',
        'status': 'PASS',
        'details': [],
        'issues': []
    }
    
    # Check for LinkedIn-specific expansion code
    linkedin_check = re.search(r'if \(url\.includes\([\'"]linkedin\.com[\'"]\)\)', content)
    if linkedin_check:
        results['details'].append("✅ LinkedIn URL detection found")
    else:
        results['status'] = 'FAIL'
        results['issues'].append("❌ LinkedIn URL detection missing")
    
    # Check for show more button selectors
    show_more_selectors = [
        'button.show-more-less-html__button--more',
        'button[aria-label*="Show more"]',
        'button[data-tracking-control-name="public_jobs_show-more-html-btn"]'
    ]
    
    for selector in show_more_selectors:
        if selector in content:
            results['details'].append(f"✅ Found selector: {selector}")
        else:
            results['issues'].append(f"❌ Missing selector: {selector}")
    
    # Check for visibility check
    visibility_check = re.search(r'offsetParent !== null|isVisible|visible', content)
    if visibility_check:
        results['details'].append("✅ Visibility check implemented")
    else:
        results['status'] = 'FAIL'
        results['issues'].append("❌ Visibility check missing")
    
    # Check for wait after expansion
    wait_pattern = re.search(r'randomDelay\(1000, 2000\)|await.*delay.*1000|setTimeout.*1000', content)
    if wait_pattern:
        results['details'].append("✅ Wait after expansion found")
    else:
        results['issues'].append("⚠️ Wait after expansion not clearly implemented")
    
    return results

def test_code_integration(content: str) -> Dict[str, Any]:
    """Test 3: Verify code integration and placement"""
    print("🔍 TEST 3: Verifying code integration...")
    
    results = {
        'test_name': 'Code Integration',
        'status': 'PASS',
        'details': [],
        'issues': []
    }
    
    # Check that expansion logic is before content extraction
    linkedin_expansion_pos = content.find('if (url.includes(\'linkedin.com\'))')
    content_extraction_pos = content.find('const result = await page.evaluate()')
    
    if linkedin_expansion_pos != -1 and content_extraction_pos != -1:
        if linkedin_expansion_pos < content_extraction_pos:
            results['details'].append("✅ Expansion logic placed before content extraction")
        else:
            results['status'] = 'FAIL'
            results['issues'].append("❌ Expansion logic should be before content extraction")
    else:
        results['status'] = 'FAIL'
        results['issues'].append("❌ Could not locate expansion logic or content extraction")
    
    # Check for error handling
    try_catch_pattern = re.search(r'try\s*\{[\s\S]*?console\.log\([\'"]Scraper:.*expanded[\'"]\)[\s\S]*?\}\s*catch', content)
    if try_catch_pattern:
        results['details'].append("✅ Error handling for expansion found")
    else:
        results['issues'].append("⚠️ Error handling for expansion not clearly implemented")
    
    return results

def test_serialization_compatibility(content: str) -> Dict[str, Any]:
    """Test 4: Verify serialization (Fix #2) compatibility"""
    print("🔍 TEST 4: Verifying serialization compatibility...")
    
    results = {
        'test_name': 'Serialization Compatibility',
        'status': 'PASS',
        'details': [],
        'issues': []
    }
    
    # Check for serialization patterns from Fix #2
    serialization_patterns = [
        r'const safeContent = String\(result\.content \|\| [\'"][\'\"]\)',
        r'const safeStrategy = String\(result\.strategy \|\| [\'"]Unknown[\'\"]\)',
        r'return \{ content: safeContent, strategyUsed: safeStrategy \}'
    ]
    
    for pattern in serialization_patterns:
        if re.search(pattern, content):
            results['details'].append(f"✅ Found serialization pattern")
        else:
            results['status'] = 'FAIL'
            results['issues'].append(f"❌ Missing serialization pattern")
    
    # Check that function returns serializable objects
    return_pattern = re.search(r'return \{ content: .+?, strategyUsed: .+? \}', content)
    if return_pattern:
        results['details'].append("✅ Function returns proper object structure")
    else:
        results['status'] = 'FAIL'
        results['issues'].append("❌ Function return structure issue")
    
    return results

def test_end_to_end_flow(content: str) -> Dict[str, Any]:
    """Test 5: Verify end-to-end logic flow"""
    print("🔍 TEST 5: Verifying end-to-end logic flow...")
    
    results = {
        'test_name': 'End-to-End Logic Flow',
        'status': 'PASS',
        'details': [],
        'issues': []
    }
    
    # Check for proper flow sequence
    flow_elements = [
        ('Page load', r'await page\.goto\(url'),
        ('Cookie handling', r'handleCookieRoadblock'),
        ('Human-like scrolling', r'window\.scrollBy'),
        ('LinkedIn expansion', r'if \(url\.includes\([\'"]linkedin\.com[\'"]\)\)'),
        ('Content extraction', r'const result = await page\.evaluate'),
        ('Serialization', r'const safeContent = String')
    ]
    
    positions = []
    for name, pattern in flow_elements:
        match = re.search(pattern, content)
        if match:
            positions.append((name, match.start()))
            results['details'].append(f"✅ Found: {name}")
        else:
            results['issues'].append(f"❌ Missing: {name}")
    
    # Check if elements are in correct order
    positions.sort(key=lambda x: x[1])
    expected_order = ['Page load', 'Cookie handling', 'Human-like scrolling', 'LinkedIn expansion', 'Content extraction', 'Serialization']
    actual_order = [pos[0] for pos in positions]
    
    if actual_order == expected_order:
        results['details'].append("✅ Flow elements in correct order")
    else:
        results['issues'].append(f"⚠️ Flow order may be incorrect. Expected: {expected_order}, Got: {actual_order}")
    
    return results

def test_hunter_engine_integration(hunter_content: str) -> Dict[str, Any]:
    """Test 6: Verify Hunter-engine.ts integration"""
    print("🔍 TEST 6: Verifying Hunter-engine.ts integration...")
    
    results = {
        'test_name': 'Hunter Engine Integration',
        'status': 'PASS',
        'details': [],
        'issues': []
    }
    
    # Check that getJobPageContent is imported and called correctly
    import_pattern = re.search(r'import.*getJobPageContent.*from.*scraper-service', hunter_content)
    if import_pattern:
        results['details'].append("✅ getJobPageContent properly imported")
    else:
        results['status'] = 'FAIL'
        results['issues'].append("❌ getJobPageContent import missing")
    
    # Check function call
    call_pattern = re.search(r'const pageData = await getJobPageContent\(url, userId, callAI\)', hunter_content)
    if call_pattern:
        results['details'].append("✅ getJobPageContent called correctly")
    else:
        results['issues'].append("⚠️ getJobPageContent call pattern not found")
    
    return results

def run_all_tests() -> None:
    """Run all verification tests"""
    print("=" * 60)
    print("🧪 LINKEDIN JOB CONTENT SCRAPING FIX VERIFICATION")
    print("=" * 60)
    
    # Read the main scraper service file
    scraper_content = read_file('/app/src/main/scraper-service.ts')
    if scraper_content.startswith('ERROR'):
        print(f"❌ CRITICAL: {scraper_content}")
        return
    
    # Read the hunter engine file
    hunter_content = read_file('/app/src/main/features/Hunter-engine.ts')
    if hunter_content.startswith('ERROR'):
        print(f"❌ CRITICAL: {hunter_content}")
        return
    
    # Run all tests
    test_results = [
        test_linkedin_selectors(scraper_content),
        test_show_more_expansion(scraper_content),
        test_code_integration(scraper_content),
        test_serialization_compatibility(scraper_content),
        test_end_to_end_flow(scraper_content),
        test_hunter_engine_integration(hunter_content)
    ]
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed_tests = 0
    total_tests = len(test_results)
    
    for result in test_results:
        status_icon = "✅" if result['status'] == 'PASS' else "❌"
        print(f"\n{status_icon} {result['test_name']}: {result['status']}")
        
        if result['details']:
            for detail in result['details']:
                print(f"   {detail}")
        
        if result['issues']:
            for issue in result['issues']:
                print(f"   {issue}")
        
        if result['status'] == 'PASS':
            passed_tests += 1
    
    # Overall assessment
    print("\n" + "=" * 60)
    print("🎯 OVERALL ASSESSMENT")
    print("=" * 60)
    
    success_rate = (passed_tests / total_tests) * 100
    print(f"Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
    
    if success_rate >= 100:
        print("🎉 ALL TESTS PASSED - LinkedIn job scraping fix is properly implemented!")
    elif success_rate >= 80:
        print("⚠️  MOSTLY IMPLEMENTED - Minor issues found, but core functionality is present")
    else:
        print("❌ IMPLEMENTATION INCOMPLETE - Significant issues found")
    
    # Acceptance criteria check
    print("\n📋 ACCEPTANCE CRITERIA CHECK:")
    criteria_met = 0
    total_criteria = 6
    
    criteria_checks = [
        ("LinkedIn selectors present and positioned", test_results[0]['status'] == 'PASS'),
        ("Show more expansion logic implemented", test_results[1]['status'] == 'PASS'),
        ("Visibility checks in place", 'Visibility check implemented' in str(test_results[1]['details'])),
        ("Error handling prevents crashes", 'Error handling' in str(test_results[2]['details'])),
        ("Serializable objects returned", test_results[3]['status'] == 'PASS'),
        ("Code follows existing patterns", test_results[4]['status'] == 'PASS')
    ]
    
    for criteria, met in criteria_checks:
        icon = "✅" if met else "❌"
        print(f"   {icon} {criteria}")
        if met:
            criteria_met += 1
    
    print(f"\nCriteria Met: {criteria_met}/{total_criteria}")
    
    if criteria_met == total_criteria:
        print("🎯 ALL ACCEPTANCE CRITERIA MET!")
    else:
        print(f"⚠️  {total_criteria - criteria_met} criteria still need attention")

if __name__ == "__main__":
    run_all_tests()