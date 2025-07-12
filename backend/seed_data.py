#!/usr/bin/env python3
"""
Sample data seeding script for BalancEED Learning Platform
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid

# Sample data
SAMPLE_COURSES = [
    {
        "id": str(uuid.uuid4()),
        "title": "JavaScript Fundamentals",
        "description": "Master the basics of JavaScript programming with interactive lessons and hands-on projects.",
        "instructor": "Sarah Johnson",
        "difficulty": "beginner",
        "estimated_duration": 300,  # 5 hours
        "thumbnail_url": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
        "tags": ["javascript", "programming", "web-development"],
        "lessons": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_published": True,
        "enrollment_count": 0,
        "rating": 4.8,
        "xp_reward": 150
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Data Science with Python",
        "description": "Learn data analysis, visualization, and machine learning using Python and popular libraries.",
        "instructor": "Dr. Michael Chen",
        "difficulty": "intermediate",
        "estimated_duration": 480,  # 8 hours
        "thumbnail_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
        "tags": ["python", "data-science", "machine-learning"],
        "lessons": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_published": True,
        "enrollment_count": 0,
        "rating": 4.9,
        "xp_reward": 200
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Digital Marketing Essentials",
        "description": "Comprehensive guide to modern digital marketing strategies and tools.",
        "instructor": "Emma Williams",
        "difficulty": "beginner",
        "estimated_duration": 240,  # 4 hours
        "thumbnail_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
        "tags": ["marketing", "digital", "business"],
        "lessons": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_published": True,
        "enrollment_count": 0,
        "rating": 4.7,
        "xp_reward": 120
    }
]

def create_lessons_for_course(course_id: str, course_title: str):
    """Create sample lessons for a course"""
    if "JavaScript" in course_title:
        return [
            {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "title": "Introduction to JavaScript",
                "description": "Learn what JavaScript is and how it works",
                "content": "JavaScript is a versatile programming language primarily used for web development...",
                "lesson_type": "text",
                "order_index": 1,
                "video_url": None,
                "duration": 900,  # 15 minutes
                "xp_reward": 15,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "title": "Variables and Data Types",
                "description": "Understanding JavaScript variables and data types",
                "content": "In JavaScript, variables are used to store data values...",
                "lesson_type": "interactive",
                "order_index": 2,
                "video_url": None,
                "duration": 1200,  # 20 minutes
                "xp_reward": 20,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "title": "Functions and Control Flow",
                "description": "Master JavaScript functions and control structures",
                "content": "Functions are reusable blocks of code that perform specific tasks...",
                "lesson_type": "video",
                "order_index": 3,
                "video_url": "https://example.com/js-functions",
                "duration": 1800,  # 30 minutes
                "xp_reward": 25,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
    elif "Data Science" in course_title:
        return [
            {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "title": "Python Basics for Data Science",
                "description": "Essential Python concepts for data analysis",
                "content": "Python is a powerful language for data science...",
                "lesson_type": "text",
                "order_index": 1,
                "video_url": None,
                "duration": 1500,  # 25 minutes
                "xp_reward": 20,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "title": "Data Manipulation with Pandas",
                "description": "Learn to work with data using the Pandas library",
                "content": "Pandas is the most popular Python library for data manipulation...",
                "lesson_type": "interactive",
                "order_index": 2,
                "video_url": None,
                "duration": 2400,  # 40 minutes
                "xp_reward": 30,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
    elif "Digital Marketing" in course_title:
        return [
            {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "title": "Introduction to Digital Marketing",
                "description": "Overview of digital marketing landscape",
                "content": "Digital marketing encompasses all marketing efforts that use electronic devices...",
                "lesson_type": "video",
                "order_index": 1,
                "video_url": "https://example.com/digital-marketing-intro",
                "duration": 1200,  # 20 minutes
                "xp_reward": 15,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "title": "Social Media Marketing",
                "description": "Strategies for effective social media marketing",
                "content": "Social media marketing involves creating content for social media platforms...",
                "lesson_type": "text",
                "order_index": 2,
                "video_url": None,
                "duration": 1800,  # 30 minutes
                "xp_reward": 20,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
    return []

def create_questions_for_lesson(lesson_id: str, lesson_title: str):
    """Create sample questions for a lesson"""
    if "Introduction" in lesson_title:
        return [
            {
                "id": str(uuid.uuid4()),
                "lesson_id": lesson_id,
                "question_text": "What is the primary purpose of JavaScript?",
                "question_type": "multiple_choice",
                "options": [
                    "Web development",
                    "Mobile app development",
                    "Desktop applications",
                    "All of the above"
                ],
                "correct_answer": "All of the above",
                "explanation": "JavaScript can be used for web, mobile, and desktop development.",
                "points": 10
            },
            {
                "id": str(uuid.uuid4()),
                "lesson_id": lesson_id,
                "question_text": "JavaScript is a compiled language.",
                "question_type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "False",
                "explanation": "JavaScript is an interpreted language, not compiled.",
                "points": 5
            }
        ]
    return []

async def seed_database():
    """Seed the database with sample data"""
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    await db.courses.delete_many({})
    await db.lessons.delete_many({})
    await db.questions.delete_many({})
    print("✅ Cleared existing data")
    
    # Insert courses
    for course_data in SAMPLE_COURSES:
        course_id = course_data["id"]
        
        # Create lessons for this course
        lessons = create_lessons_for_course(course_id, course_data["title"])
        
        # Insert lessons
        if lessons:
            await db.lessons.insert_many(lessons)
            # Update course with lesson IDs
            course_data["lessons"] = [lesson["id"] for lesson in lessons]
            
            # Create questions for lessons
            for lesson in lessons:
                questions = create_questions_for_lesson(lesson["id"], lesson["title"])
                if questions:
                    await db.questions.insert_many(questions)
        
        # Insert course
        await db.courses.insert_one(course_data)
        print(f"✅ Created course: {course_data['title']}")
    
    print("🎉 Database seeding completed!")
    print(f"📚 Created {len(SAMPLE_COURSES)} courses")
    
    # Count lessons and questions
    lesson_count = await db.lessons.count_documents({})
    question_count = await db.questions.count_documents({})
    print(f"📖 Created {lesson_count} lessons")
    print(f"❓ Created {question_count} questions")
    
    client.close()

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    from pathlib import Path
    
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    
    asyncio.run(seed_database())