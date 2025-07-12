#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for BalancEED Learning Platform
Tests all authentication, course management, progress tracking, and gamification features
"""

import requests
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

class BalancEEDTester:
    def __init__(self):
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        self.course_id = None
        self.lesson_id = None
        
    def log_test(self, test_name, success, message="", details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{API_BASE}{endpoint}"
        default_headers = {"Content-Type": "application/json"}
        
        if self.auth_token:
            default_headers["Authorization"] = f"Bearer {self.auth_token}"
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=default_headers, timeout=10)
            
            return response
        except requests.exceptions.RequestException as e:
            return None
    
    def test_api_health(self):
        """Test if API is accessible"""
        print("\n=== Testing API Health ===")
        response = self.make_request("GET", "/")
        
        if response and response.status_code == 200:
            self.log_test("API Health Check", True, "API is accessible")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("API Health Check", False, "API not accessible", error_msg)
            return False
    
    def test_user_registration(self):
        """Test user registration"""
        print("\n=== Testing User Registration ===")
        
        # Generate unique test data
        timestamp = int(time.time())
        test_user = {
            "email": f"sarah.johnson{timestamp}@balanceed.com",
            "username": f"sarah_j_{timestamp}",
            "password": "SecurePass123!",
            "first_name": "Sarah",
            "last_name": "Johnson"
        }
        
        response = self.make_request("POST", "/auth/register", test_user)
        
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.auth_token = data["token"]
                self.user_id = data["user"]["id"]
                self.log_test("User Registration", True, f"User {test_user['username']} registered successfully")
                return True
            else:
                self.log_test("User Registration", False, "Missing token or user in response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Registration", False, f"Registration failed: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n=== Testing User Login ===")
        
        # First register a user for login test
        timestamp = int(time.time()) + 1
        test_user = {
            "email": f"mike.davis{timestamp}@balanceed.com",
            "username": f"mike_d_{timestamp}",
            "password": "LoginTest456!",
            "first_name": "Mike",
            "last_name": "Davis"
        }
        
        # Register user
        reg_response = self.make_request("POST", "/auth/register", test_user)
        if not reg_response or reg_response.status_code != 200:
            self.log_test("User Login Setup", False, "Failed to create test user for login")
            return False
        
        # Now test login
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.log_test("User Login", True, f"Login successful for {test_user['email']}")
                return True
            else:
                self.log_test("User Login", False, "Missing token or user in response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Login", False, f"Login failed: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_current_user(self):
        """Test getting current user profile"""
        print("\n=== Testing Get Current User ===")
        
        if not self.auth_token:
            self.log_test("Get Current User", False, "No auth token available")
            return False
        
        response = self.make_request("GET", "/auth/me")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "email" in data:
                self.log_test("Get Current User", True, f"Retrieved user profile for ID: {data['id']}")
                return True
            else:
                self.log_test("Get Current User", False, "Invalid user profile structure", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Current User", False, f"Failed to get user profile: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_courses(self):
        """Test getting available courses"""
        print("\n=== Testing Get Courses ===")
        
        response = self.make_request("GET", "/courses")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Courses", True, f"Retrieved {len(data)} courses")
                if len(data) > 0:
                    self.course_id = data[0]["id"]  # Store first course ID for later tests
                return True
            else:
                self.log_test("Get Courses", False, "Response is not a list", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Courses", False, f"Failed to get courses: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_specific_course(self):
        """Test getting specific course details"""
        print("\n=== Testing Get Specific Course ===")
        
        if not self.course_id:
            self.log_test("Get Specific Course", False, "No course ID available")
            return False
        
        response = self.make_request("GET", f"/courses/{self.course_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "title" in data:
                self.log_test("Get Specific Course", True, f"Retrieved course: {data['title']}")
                return True
            else:
                self.log_test("Get Specific Course", False, "Invalid course structure", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Specific Course", False, f"Failed to get course: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_course_enrollment(self):
        """Test enrolling in a course"""
        print("\n=== Testing Course Enrollment ===")
        
        if not self.auth_token or not self.course_id:
            self.log_test("Course Enrollment", False, "Missing auth token or course ID")
            return False
        
        response = self.make_request("POST", f"/courses/{self.course_id}/enroll")
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_test("Course Enrollment", True, f"Successfully enrolled in course {self.course_id}")
                return True
            else:
                self.log_test("Course Enrollment", False, "Invalid enrollment response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Course Enrollment", False, f"Enrollment failed: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_course_lessons(self):
        """Test getting lessons for a course"""
        print("\n=== Testing Get Course Lessons ===")
        
        if not self.course_id:
            self.log_test("Get Course Lessons", False, "No course ID available")
            return False
        
        response = self.make_request("GET", f"/courses/{self.course_id}/lessons")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Course Lessons", True, f"Retrieved {len(data)} lessons for course")
                if len(data) > 0:
                    self.lesson_id = data[0]["id"]  # Store first lesson ID for later tests
                return True
            else:
                self.log_test("Get Course Lessons", False, "Response is not a list", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Course Lessons", False, f"Failed to get lessons: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_specific_lesson(self):
        """Test getting specific lesson details"""
        print("\n=== Testing Get Specific Lesson ===")
        
        if not self.auth_token or not self.lesson_id:
            self.log_test("Get Specific Lesson", False, "Missing auth token or lesson ID")
            return False
        
        response = self.make_request("GET", f"/lessons/{self.lesson_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "title" in data:
                self.log_test("Get Specific Lesson", True, f"Retrieved lesson: {data['title']}")
                return True
            else:
                self.log_test("Get Specific Lesson", False, "Invalid lesson structure", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Specific Lesson", False, f"Failed to get lesson: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_user_progress(self):
        """Test getting user's progress across all courses"""
        print("\n=== Testing Get User Progress ===")
        
        if not self.auth_token:
            self.log_test("Get User Progress", False, "No auth token available")
            return False
        
        response = self.make_request("GET", "/progress")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get User Progress", True, f"Retrieved progress for {len(data)} courses")
                return True
            else:
                self.log_test("Get User Progress", False, "Response is not a list", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get User Progress", False, f"Failed to get progress: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_course_progress(self):
        """Test getting progress for specific course"""
        print("\n=== Testing Get Course Progress ===")
        
        if not self.auth_token or not self.course_id:
            self.log_test("Get Course Progress", False, "Missing auth token or course ID")
            return False
        
        response = self.make_request("GET", f"/progress/{self.course_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "user_id" in data and "course_id" in data:
                self.log_test("Get Course Progress", True, f"Retrieved progress for course {self.course_id}")
                return True
            else:
                self.log_test("Get Course Progress", False, "Invalid progress structure", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Course Progress", False, f"Failed to get course progress: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_update_progress(self):
        """Test updating lesson progress"""
        print("\n=== Testing Update Progress ===")
        
        if not self.auth_token or not self.lesson_id:
            self.log_test("Update Progress", False, "Missing auth token or lesson ID")
            return False
        
        progress_data = {
            "lesson_id": self.lesson_id,
            "progress_percentage": 100.0,
            "time_spent": 300  # 5 minutes
        }
        
        response = self.make_request("POST", "/progress/update", progress_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_test("Update Progress", True, "Progress updated successfully with XP reward")
                return True
            else:
                self.log_test("Update Progress", False, "Invalid progress update response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Update Progress", False, f"Failed to update progress: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_get_lesson_questions(self):
        """Test getting questions for a lesson"""
        print("\n=== Testing Get Lesson Questions ===")
        
        if not self.auth_token or not self.lesson_id:
            self.log_test("Get Lesson Questions", False, "Missing auth token or lesson ID")
            return False
        
        response = self.make_request("GET", f"/lessons/{self.lesson_id}/questions")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Lesson Questions", True, f"Retrieved {len(data)} questions for lesson")
                return True
            else:
                self.log_test("Get Lesson Questions", False, "Response is not a list", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Lesson Questions", False, f"Failed to get questions: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_submit_quiz(self):
        """Test submitting quiz answers"""
        print("\n=== Testing Submit Quiz ===")
        
        if not self.auth_token or not self.lesson_id:
            self.log_test("Submit Quiz", False, "Missing auth token or lesson ID")
            return False
        
        # First get questions to submit answers
        questions_response = self.make_request("GET", f"/lessons/{self.lesson_id}/questions")
        
        if not questions_response or questions_response.status_code != 200:
            self.log_test("Submit Quiz", False, "Could not retrieve questions for quiz")
            return False
        
        questions = questions_response.json()
        if not questions:
            self.log_test("Submit Quiz", True, "No questions available for this lesson (expected for some lessons)")
            return True
        
        # Create sample answers
        answers = {}
        for question in questions:
            answers[question["id"]] = question["correct_answer"]  # Submit correct answers
        
        quiz_data = {
            "lesson_id": self.lesson_id,
            "answers": answers,
            "time_taken": 120  # 2 minutes
        }
        
        response = self.make_request("POST", "/quiz/submit", quiz_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "score" in data and "passed" in data:
                self.log_test("Submit Quiz", True, f"Quiz submitted successfully - Score: {data['score']}%, XP: {data.get('xp_earned', 0)}")
                return True
            else:
                self.log_test("Submit Quiz", False, "Invalid quiz submission response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Submit Quiz", False, f"Failed to submit quiz: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_dashboard_data(self):
        """Test getting comprehensive dashboard data"""
        print("\n=== Testing Dashboard Data ===")
        
        if not self.auth_token:
            self.log_test("Dashboard Data", False, "No auth token available")
            return False
        
        response = self.make_request("GET", "/dashboard")
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["user", "enrolled_courses", "current_level", "total_courses"]
            
            if all(field in data for field in required_fields):
                user_data = data["user"]
                self.log_test("Dashboard Data", True, 
                    f"Dashboard retrieved - Level: {data['current_level']}, "
                    f"XP: {user_data.get('total_xp', 0)}, "
                    f"Streak: {user_data.get('current_streak', 0)}, "
                    f"Courses: {data['total_courses']}")
                return True
            else:
                self.log_test("Dashboard Data", False, "Missing required dashboard fields", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Dashboard Data", False, f"Failed to get dashboard: {response.status_code if response else 'No response'}", error_msg)
            return False
    
    def test_duplicate_enrollment(self):
        """Test that duplicate enrollment is prevented"""
        print("\n=== Testing Duplicate Enrollment Prevention ===")
        
        if not self.auth_token or not self.course_id:
            self.log_test("Duplicate Enrollment Prevention", False, "Missing auth token or course ID")
            return False
        
        # Try to enroll again in the same course
        response = self.make_request("POST", f"/courses/{self.course_id}/enroll")
        
        if response and response.status_code == 400:
            self.log_test("Duplicate Enrollment Prevention", True, "Duplicate enrollment correctly prevented")
            return True
        else:
            self.log_test("Duplicate Enrollment Prevention", False, f"Expected 400 status, got {response.status_code if response else 'No response'}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting BalancEED Backend API Testing")
        print(f"Testing against: {API_BASE}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_api_health,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_current_user,
            self.test_get_courses,
            self.test_get_specific_course,
            self.test_course_enrollment,
            self.test_get_course_lessons,
            self.test_get_specific_lesson,
            self.test_get_user_progress,
            self.test_get_course_progress,
            self.test_update_progress,
            self.test_get_lesson_questions,
            self.test_submit_quiz,
            self.test_dashboard_data,
            self.test_duplicate_enrollment
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_test(test.__name__, False, f"Test threw exception: {str(e)}")
                failed += 1
            
            time.sleep(0.5)  # Small delay between tests
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        print(f"📈 Success Rate: {(passed / (passed + failed) * 100):.1f}%")
        
        # Print failed tests
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "FAIL" in result["status"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        return passed, failed

if __name__ == "__main__":
    tester = BalancEEDTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1)