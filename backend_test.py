#!/usr/bin/env python3
"""
BalancEDD Tech Platform Backend API Testing
Tests all core backend functionality including authentication, dashboard, and data management.
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Get backend URL from frontend .env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("❌ Could not get backend URL from frontend/.env")
    sys.exit(1)

API_URL = f"{BASE_URL}/api"
print(f"🔗 Testing backend at: {API_URL}")

# Test results tracking
test_results = {
    "demo_setup": False,
    "auth_register": False,
    "auth_login": False,
    "dashboard": False,
    "progress_tracking": False,
    "journal_entry": False,
    "nutrition_logging": False,
    "life_skills": False,
    "life_skills_complete": False
}

# Global variables for test data
auth_token = None
demo_user_data = None

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"🧪 TESTING: {test_name}")
    print(f"{'='*60}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def test_demo_setup():
    """Test demo data setup endpoint"""
    print_test_header("Demo Data Setup")
    
    try:
        response = requests.post(f"{API_URL}/demo/setup", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            global demo_user_data
            demo_user_data = data.get("demo_user")
            print_success("Demo data setup successful")
            print_info(f"Demo user created: {demo_user_data.get('email')}")
            test_results["demo_setup"] = True
            return True
        else:
            print_error(f"Demo setup failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Demo setup error: {str(e)}")
        return False

def test_auth_register():
    """Test user registration"""
    print_test_header("User Registration")
    
    # Create a unique test user
    test_email = f"test_student_{uuid.uuid4().hex[:8]}@balancedd.com"
    user_data = {
        "email": test_email,
        "password": "securepass123",
        "name": "Emma Rodriguez",
        "role": "student",
        "institution_id": "balancedd_academy"
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=user_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            global auth_token
            auth_token = data.get("access_token")
            print_success("User registration successful")
            print_info(f"User: {data.get('user', {}).get('name')}")
            print_info(f"Token received: {auth_token[:20]}...")
            test_results["auth_register"] = True
            return True
        else:
            print_error(f"Registration failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return False

def test_auth_login():
    """Test user login with demo credentials"""
    print_test_header("User Login")
    
    login_data = {
        "email": "student@demo.com",
        "password": "demo123"
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            global auth_token
            auth_token = data.get("access_token")
            print_success("Login successful")
            print_info(f"User: {data.get('user', {}).get('name')}")
            print_info(f"Token received: {auth_token[:20]}...")
            test_results["auth_login"] = True
            return True
        else:
            print_error(f"Login failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return False

def get_auth_headers():
    """Get authorization headers with JWT token"""
    if not auth_token:
        return {}
    return {"Authorization": f"Bearer {auth_token}"}

def test_student_dashboard():
    """Test student dashboard API"""
    print_test_header("Student Dashboard")
    
    try:
        headers = get_auth_headers()
        response = requests.get(f"{API_URL}/student/dashboard", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Dashboard data retrieved successfully")
            
            # Verify dashboard structure
            required_keys = ["user", "stats", "recent_progress", "recent_journals", "recent_nutrition", "life_skills"]
            for key in required_keys:
                if key in data:
                    print_info(f"✓ {key} data present")
                else:
                    print_error(f"✗ {key} data missing")
                    
            # Display stats
            stats = data.get("stats", {})
            print_info(f"Progress stats: {stats}")
            
            test_results["dashboard"] = True
            return True
        else:
            print_error(f"Dashboard failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Dashboard error: {str(e)}")
        return False

def test_progress_tracking():
    """Test progress entry creation"""
    print_test_header("Progress Tracking")
    
    progress_data = {
        "category": "academic",
        "type": "module_completion",
        "title": "Advanced Mathematics Module",
        "description": "Completed calculus fundamentals with excellent understanding",
        "value": {"score": 92, "time_spent": 180, "difficulty": "advanced"}
    }
    
    try:
        headers = get_auth_headers()
        response = requests.post(f"{API_URL}/student/progress", json=progress_data, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Progress entry created successfully")
            print_info(f"Entry: {data.get('title')}")
            print_info(f"Category: {data.get('category')}")
            test_results["progress_tracking"] = True
            return True
        else:
            print_error(f"Progress tracking failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Progress tracking error: {str(e)}")
        return False

def test_journal_entry():
    """Test journal entry creation"""
    print_test_header("Journal Entry System")
    
    journal_data = {
        "mood_rating": 8,
        "content": "Today was incredibly productive! I completed my advanced math module and felt a real sense of accomplishment. The calculus concepts are starting to click, and I'm excited to tackle more challenging problems. I also had a great conversation with my mentor about future academic goals.",
        "tags": ["productive", "academic_success", "motivation", "mentorship"]
    }
    
    try:
        headers = get_auth_headers()
        response = requests.post(f"{API_URL}/student/journal", json=journal_data, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Journal entry created successfully")
            print_info(f"Mood rating: {data.get('mood_rating')}/10")
            print_info(f"Tags: {data.get('tags')}")
            test_results["journal_entry"] = True
            return True
        else:
            print_error(f"Journal entry failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Journal entry error: {str(e)}")
        return False

def test_nutrition_logging():
    """Test nutrition log creation"""
    print_test_header("Nutrition Logging System")
    
    nutrition_data = {
        "meal_type": "lunch",
        "foods": ["grilled chicken breast", "quinoa salad", "steamed broccoli", "mixed berries", "sparkling water"],
        "calories": 650,
        "notes": "Balanced meal with lean protein, complex carbs, and plenty of vegetables. Feeling energized and satisfied."
    }
    
    try:
        headers = get_auth_headers()
        response = requests.post(f"{API_URL}/student/nutrition", json=nutrition_data, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Nutrition log created successfully")
            print_info(f"Meal: {data.get('meal_type')}")
            print_info(f"Foods: {len(data.get('foods', []))} items")
            print_info(f"Calories: {data.get('calories')}")
            test_results["nutrition_logging"] = True
            return True
        else:
            print_error(f"Nutrition logging failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Nutrition logging error: {str(e)}")
        return False

def test_life_skills():
    """Test life skills task creation"""
    print_test_header("Life Skills Task Management")
    
    life_skill_data = {
        "skill_category": "home_economics",
        "task_name": "Meal Planning and Budgeting",
        "description": "Create a weekly meal plan with grocery budget under $75 for nutritious, balanced meals",
        "notes": "Focus on seasonal ingredients and batch cooking techniques"
    }
    
    try:
        headers = get_auth_headers()
        response = requests.post(f"{API_URL}/student/life-skills", json=life_skill_data, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            global life_skill_task_id
            life_skill_task_id = data.get('id')
            print_success("Life skills task created successfully")
            print_info(f"Task: {data.get('task_name')}")
            print_info(f"Category: {data.get('skill_category')}")
            print_info(f"Task ID: {life_skill_task_id}")
            test_results["life_skills"] = True
            return True
        else:
            print_error(f"Life skills task creation failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Life skills task error: {str(e)}")
        return False

def test_life_skills_completion():
    """Test life skills task completion"""
    print_test_header("Life Skills Task Completion")
    
    if not test_results.get("life_skills"):
        print_error("Skipping completion test - task creation failed")
        return False
    
    try:
        headers = get_auth_headers()
        # Use the task ID from the previous test
        task_id = life_skill_task_id if 'life_skill_task_id' in globals() else "test_task_id"
        response = requests.put(f"{API_URL}/student/life-skills/{task_id}/complete", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Life skills task completed successfully")
            print_info(f"Message: {data.get('message')}")
            test_results["life_skills_complete"] = True
            return True
        else:
            print_error(f"Task completion failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            # This might fail if task ID doesn't exist, which is acceptable
            return False
            
    except Exception as e:
        print_error(f"Task completion error: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests in sequence"""
    print(f"\n🚀 Starting BalancEDD Backend API Tests")
    print(f"📅 Test run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test sequence based on dependencies
    tests = [
        ("Demo Data Setup", test_demo_setup),
        ("User Registration", test_auth_register),
        ("User Login", test_auth_login),
        ("Student Dashboard", test_student_dashboard),
        ("Progress Tracking", test_progress_tracking),
        ("Journal Entry System", test_journal_entry),
        ("Nutrition Logging", test_nutrition_logging),
        ("Life Skills Management", test_life_skills),
        ("Life Skills Completion", test_life_skills_completion)
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print_error(f"Unexpected error in {test_name}: {str(e)}")
    
    # Print final results
    print_test_header("TEST RESULTS SUMMARY")
    
    passed = sum(test_results.values())
    total = len(test_results)
    
    print(f"\n📊 Overall Results: {passed}/{total} tests passed")
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {test_name.replace('_', ' ').title()}")
    
    if passed == total:
        print(f"\n🎉 All tests passed! Backend API is working correctly.")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Backend needs attention.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)