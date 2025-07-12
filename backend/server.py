from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import bcrypt
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="BalancEED Learning Platform API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = "balanceed_learning_secret_key_2025"
JWT_ALGORITHM = "HS256"

# Enums
class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class LessonType(str, Enum):
    VIDEO = "video"
    TEXT = "text"
    INTERACTIVE = "interactive"
    QUIZ = "quiz"
    ASSESSMENT = "assessment"

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    FILL_BLANK = "fill_blank"
    ESSAY = "essay"

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    password_hash: str
    first_name: str
    last_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True
    total_xp: int = 0
    current_level: int = 1
    current_streak: int = 0
    longest_streak: int = 0
    last_activity_date: Optional[datetime] = None
    completed_courses: List[str] = []
    achievements: List[str] = []

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    total_xp: int
    current_level: int
    current_streak: int
    longest_streak: int
    completed_courses: List[str]
    achievements: List[str]

# Course Models
class Course(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    instructor: str
    difficulty: DifficultyLevel
    estimated_duration: int  # in minutes
    thumbnail_url: Optional[str] = None
    tags: List[str] = []
    lessons: List[str] = []  # lesson IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_published: bool = False
    enrollment_count: int = 0
    rating: float = 0.0
    xp_reward: int = 100

class CourseCreate(BaseModel):
    title: str
    description: str
    instructor: str
    difficulty: DifficultyLevel
    estimated_duration: int
    thumbnail_url: Optional[str] = None
    tags: List[str] = []

# Lesson Models
class Lesson(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    title: str
    description: str
    content: str
    lesson_type: LessonType
    order_index: int
    video_url: Optional[str] = None
    duration: int  # in seconds
    xp_reward: int = 10
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LessonCreate(BaseModel):
    course_id: str
    title: str
    description: str
    content: str
    lesson_type: LessonType
    order_index: int
    video_url: Optional[str] = None
    duration: int
    xp_reward: int = 10

# Progress Models
class UserProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    course_id: str
    lesson_id: Optional[str] = None
    progress_percentage: float = 0.0
    completed_lessons: List[str] = []
    current_lesson_id: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    time_spent: int = 0  # in seconds

class ProgressUpdate(BaseModel):
    lesson_id: str
    progress_percentage: float
    time_spent: int

# Quiz Models
class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lesson_id: str
    question_text: str
    question_type: QuestionType
    options: List[str] = []  # for multiple choice
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 10

class QuestionCreate(BaseModel):
    lesson_id: str
    question_text: str
    question_type: QuestionType
    options: List[str] = []
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 10

class QuizAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    lesson_id: str
    answers: Dict[str, str]  # question_id: user_answer
    score: float
    total_points: int
    attempted_at: datetime = Field(default_factory=datetime.utcnow)
    time_taken: int  # in seconds

class QuizSubmission(BaseModel):
    lesson_id: str
    answers: Dict[str, str]
    time_taken: int

# Gamification Models
class Achievement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    icon: str
    condition: str  # e.g., "complete_5_courses", "maintain_7_day_streak"
    xp_reward: int
    badge_color: str

class DailyGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: datetime
    target_xp: int = 50
    achieved_xp: int = 0
    completed: bool = False

# Utility Functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_jwt_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Welcome to BalancEED Learning Platform API"}

# Authentication Routes
@api_router.post("/auth/register", response_model=Dict[str, Any])
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    password_hash = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash,
        first_name=user_data.first_name,
        last_name=user_data.last_name
    )
    
    await db.users.insert_one(user.dict())
    token = create_jwt_token(user.id)
    
    return {
        "message": "User registered successfully",
        "token": token,
        "user": UserProfile(**user.dict())
    }

@api_router.post("/auth/login", response_model=Dict[str, Any])
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    token = create_jwt_token(user["id"])
    return {
        "message": "Login successful",
        "token": token,
        "user": UserProfile(**user)
    }

@api_router.get("/auth/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserProfile(**current_user.dict())

# Course Routes
@api_router.get("/courses", response_model=List[Course])
async def get_courses(skip: int = 0, limit: int = 10):
    courses = await db.courses.find({"is_published": True}).skip(skip).limit(limit).to_list(limit)
    return [Course(**course) for course in courses]

@api_router.get("/courses/{course_id}", response_model=Course)
async def get_course(course_id: str):
    course = await db.courses.find_one({"id": course_id, "is_published": True})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return Course(**course)

@api_router.post("/courses", response_model=Course)
async def create_course(course_data: CourseCreate, current_user: User = Depends(get_current_user)):
    course = Course(**course_data.dict())
    await db.courses.insert_one(course.dict())
    return course

@api_router.post("/courses/{course_id}/enroll")
async def enroll_in_course(course_id: str, current_user: User = Depends(get_current_user)):
    course = await db.courses.find_one({"id": course_id, "is_published": True})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if already enrolled
    existing_progress = await db.user_progress.find_one({
        "user_id": current_user.id,
        "course_id": course_id
    })
    if existing_progress:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    # Create progress entry
    progress = UserProgress(
        user_id=current_user.id,
        course_id=course_id
    )
    await db.user_progress.insert_one(progress.dict())
    
    # Update enrollment count
    await db.courses.update_one(
        {"id": course_id},
        {"$inc": {"enrollment_count": 1}}
    )
    
    return {"message": "Successfully enrolled in course"}

# Lesson Routes
@api_router.get("/courses/{course_id}/lessons", response_model=List[Lesson])
async def get_course_lessons(course_id: str):
    lessons = await db.lessons.find({"course_id": course_id}).sort("order_index", 1).to_list(100)
    return [Lesson(**lesson) for lesson in lessons]

@api_router.get("/lessons/{lesson_id}", response_model=Lesson)
async def get_lesson(lesson_id: str, current_user: User = Depends(get_current_user)):
    lesson = await db.lessons.find_one({"id": lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Check if user is enrolled in the course
    progress = await db.user_progress.find_one({
        "user_id": current_user.id,
        "course_id": lesson["course_id"]
    })
    if not progress:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    return Lesson(**lesson)

@api_router.post("/lessons", response_model=Lesson)
async def create_lesson(lesson_data: LessonCreate):
    lesson = Lesson(**lesson_data.dict())
    await db.lessons.insert_one(lesson.dict())
    
    # Add lesson to course
    await db.courses.update_one(
        {"id": lesson_data.course_id},
        {"$push": {"lessons": lesson.id}}
    )
    
    return lesson

# Progress Routes
@api_router.get("/progress", response_model=List[UserProgress])
async def get_user_progress(current_user: User = Depends(get_current_user)):
    progress_list = await db.user_progress.find({"user_id": current_user.id}).to_list(100)
    return [UserProgress(**progress) for progress in progress_list]

@api_router.get("/progress/{course_id}", response_model=UserProgress)
async def get_course_progress(course_id: str, current_user: User = Depends(get_current_user)):
    progress = await db.user_progress.find_one({
        "user_id": current_user.id,
        "course_id": course_id
    })
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    return UserProgress(**progress)

@api_router.post("/progress/update")
async def update_progress(progress_data: ProgressUpdate, current_user: User = Depends(get_current_user)):
    lesson = await db.lessons.find_one({"id": progress_data.lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Update progress
    await db.user_progress.update_one(
        {
            "user_id": current_user.id,
            "course_id": lesson["course_id"]
        },
        {
            "$set": {
                "current_lesson_id": progress_data.lesson_id,
                "last_accessed": datetime.utcnow()
            },
            "$addToSet": {"completed_lessons": progress_data.lesson_id},
            "$inc": {"time_spent": progress_data.time_spent}
        }
    )
    
    # Award XP for lesson completion
    if progress_data.progress_percentage >= 100:
        xp_reward = lesson.get("xp_reward", 10)
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"total_xp": xp_reward}}
        )
        
        # Update streak
        today = datetime.utcnow().date()
        user = await db.users.find_one({"id": current_user.id})
        last_activity = user.get("last_activity_date")
        
        if last_activity:
            if last_activity.date() == today - timedelta(days=1):
                # Consecutive day
                new_streak = user.get("current_streak", 0) + 1
                await db.users.update_one(
                    {"id": current_user.id},
                    {
                        "$set": {
                            "current_streak": new_streak,
                            "last_activity_date": datetime.utcnow()
                        },
                        "$max": {"longest_streak": new_streak}
                    }
                )
            elif last_activity.date() != today:
                # Streak broken
                await db.users.update_one(
                    {"id": current_user.id},
                    {
                        "$set": {
                            "current_streak": 1,
                            "last_activity_date": datetime.utcnow()
                        }
                    }
                )
        else:
            # First activity
            await db.users.update_one(
                {"id": current_user.id},
                {
                    "$set": {
                        "current_streak": 1,
                        "last_activity_date": datetime.utcnow()
                    }
                }
            )
    
    return {"message": "Progress updated successfully"}

# Quiz Routes
@api_router.get("/lessons/{lesson_id}/questions", response_model=List[Question])
async def get_lesson_questions(lesson_id: str, current_user: User = Depends(get_current_user)):
    questions = await db.questions.find({"lesson_id": lesson_id}).to_list(100)
    return [Question(**question) for question in questions]

@api_router.post("/quiz/submit", response_model=Dict[str, Any])
async def submit_quiz(quiz_data: QuizSubmission, current_user: User = Depends(get_current_user)):
    # Get questions for the lesson
    questions = await db.questions.find({"lesson_id": quiz_data.lesson_id}).to_list(100)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this lesson")
    
    # Calculate score
    total_points = sum(q.get("points", 10) for q in questions)
    scored_points = 0
    
    for question in questions:
        question_id = question["id"]
        if question_id in quiz_data.answers:
            user_answer = quiz_data.answers[question_id]
            if user_answer.lower().strip() == question["correct_answer"].lower().strip():
                scored_points += question.get("points", 10)
    
    score_percentage = (scored_points / total_points) * 100 if total_points > 0 else 0
    
    # Save quiz attempt
    quiz_attempt = QuizAttempt(
        user_id=current_user.id,
        lesson_id=quiz_data.lesson_id,
        answers=quiz_data.answers,
        score=score_percentage,
        total_points=total_points,
        time_taken=quiz_data.time_taken
    )
    
    await db.quiz_attempts.insert_one(quiz_attempt.dict())
    
    # Award XP if passed (score >= 70%)
    if score_percentage >= 70:
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"total_xp": scored_points}}
        )
    
    return {
        "score": score_percentage,
        "scored_points": scored_points,
        "total_points": total_points,
        "passed": score_percentage >= 70,
        "xp_earned": scored_points if score_percentage >= 70 else 0
    }

# Dashboard Routes
@api_router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(current_user: User = Depends(get_current_user)):
    # Get user's enrolled courses
    progress_list = await db.user_progress.find({"user_id": current_user.id}).to_list(100)
    
    # Get course details
    enrolled_courses = []
    for progress in progress_list:
        course = await db.courses.find_one({"id": progress["course_id"]})
        if course:
            enrolled_courses.append({
                "course": Course(**course),
                "progress": UserProgress(**progress)
            })
    
    # Get recent achievements
    recent_attempts = await db.quiz_attempts.find(
        {"user_id": current_user.id}
    ).sort("attempted_at", -1).limit(5).to_list(5)
    
    # Calculate level (100 XP per level)
    current_level = (current_user.total_xp // 100) + 1
    xp_for_next_level = (current_level * 100) - current_user.total_xp
    
    return {
        "user": UserProfile(**current_user.dict()),
        "enrolled_courses": enrolled_courses,
        "recent_quiz_attempts": recent_attempts,
        "current_level": current_level,
        "xp_for_next_level": xp_for_next_level,
        "total_courses": len(enrolled_courses),
        "completed_courses": len([c for c in progress_list if c.get("completed_at")])
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
