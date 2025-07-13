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
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio
import httpx


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

# AI Configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY')

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
    AI_GENERATED = "ai_generated"

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    FILL_BLANK = "fill_blank"
    ESSAY = "essay"

class SubjectArea(str, Enum):
    ASVAB_MATH = "asvab_math"
    ASVAB_READING = "asvab_reading"
    ASVAB_SCIENCE = "asvab_science"
    ASVAB_MECHANICAL = "asvab_mechanical"
    GENERAL_MATH = "general_math"
    ENGLISH = "english"
    SCIENCE = "science"
    HISTORY = "history"
    COMPUTER_SCIENCE = "computer_science"
    BUSINESS = "business"
    LIFE_SKILLS = "life_skills"

class PrizeType(str, Enum):
    HOMEWORK_PASS = "homework_pass"
    EARLY_DISMISSAL = "early_dismissal"
    PREMIUM_MEAL = "premium_meal"
    AMUSEMENT_PARK = "amusement_park"
    CUSTOM = "custom"

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
    # Social features
    friends: List[str] = []
    study_groups: List[str] = []
    # Personalization
    preferred_subjects: List[SubjectArea] = []
    learning_style: Optional[str] = None
    music_preferences: List[str] = []
    motivational_content: List[str] = []

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
    friends: List[str]
    study_groups: List[str]
    preferred_subjects: List[SubjectArea]
    learning_style: Optional[str]

# Course Models
class Course(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    instructor: str
    difficulty: DifficultyLevel
    subject_area: SubjectArea
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
    # AI-generated content flag
    is_ai_generated: bool = False

class CourseCreate(BaseModel):
    title: str
    description: str
    instructor: str
    difficulty: DifficultyLevel
    subject_area: SubjectArea
    estimated_duration: int
    thumbnail_url: Optional[str] = None
    tags: List[str] = []

# AI Content Generation Models
class AIContentRequest(BaseModel):
    subject_area: SubjectArea
    difficulty: DifficultyLevel
    topic: str
    learning_objectives: List[str]
    duration_minutes: int = 30

class AIAssessmentRequest(BaseModel):
    lesson_id: str
    question_count: int = 10
    difficulty: DifficultyLevel
    question_types: List[QuestionType] = [QuestionType.MULTIPLE_CHOICE]

# Social Models
class StudyGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    creator_id: str
    members: List[str] = []
    course_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_private: bool = False

class StudyGroupCreate(BaseModel):
    name: str
    description: str
    course_id: Optional[str] = None
    is_private: bool = False

class Journal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content: str
    mood: Optional[str] = None
    study_session_rating: Optional[int] = None
    goals: List[str] = []
    achievements_today: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []

class JournalCreate(BaseModel):
    title: str
    content: str
    mood: Optional[str] = None
    study_session_rating: Optional[int] = None
    goals: List[str] = []
    achievements_today: List[str] = []
    tags: List[str] = []

class MusicPlaylist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    frequency_type: str  # e.g., "focus", "relaxation", "motivation"
    tracks: List[Dict[str, Any]] = []  # YouTube links and metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False

class PlaylistCreate(BaseModel):
    name: str
    description: str
    frequency_type: str
    tracks: List[Dict[str, Any]] = []
    is_public: bool = False

# Gamification Models
class Prize(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    prize_type: PrizeType
    cost_coins: int
    instructor_id: str
    available_quantity: int = -1  # -1 for unlimited
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class PrizeCreate(BaseModel):
    name: str
    description: str
    prize_type: PrizeType
    cost_coins: int
    available_quantity: int = -1

class PrizeRedemption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    prize_id: str
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, approved, used
    instructor_notes: Optional[str] = None

class CoinTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: int  # positive for earning, negative for spending
    transaction_type: str  # "lesson_completion", "quiz_pass", "streak_bonus", "prize_redemption"
    description: str
    related_id: Optional[str] = None  # lesson_id, quiz_id, prize_id, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Lesson Models (Extended)
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
    coin_reward: int = 5  # gambling-style coin system
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # AI-generated content
    is_ai_generated: bool = False
    ai_generated_metadata: Optional[Dict[str, Any]] = None

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
    coin_reward: int = 5

# Progress Models (Extended)
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
    # Performance analytics
    average_score: float = 0.0
    best_score: float = 0.0
    total_attempts: int = 0

class ProgressUpdate(BaseModel):
    lesson_id: str
    progress_percentage: float
    time_spent: int

# Quiz Models (Extended)
class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lesson_id: str
    question_text: str
    question_type: QuestionType
    options: List[str] = []  # for multiple choice
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 10
    difficulty: DifficultyLevel = DifficultyLevel.BEGINNER
    # AI-generated content
    is_ai_generated: bool = False

class QuestionCreate(BaseModel):
    lesson_id: str
    question_text: str
    question_type: QuestionType
    options: List[str] = []
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 10
    difficulty: DifficultyLevel = DifficultyLevel.BEGINNER

class QuizAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    lesson_id: str
    answers: Dict[str, str]  # question_id: user_answer
    score: float
    total_points: int
    coins_earned: int = 0  # gambling-style reward
    attempted_at: datetime = Field(default_factory=datetime.utcnow)
    time_taken: int  # in seconds

class QuizSubmission(BaseModel):
    lesson_id: str
    answers: Dict[str, str]
    time_taken: int

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

# AI Content Generation Functions
async def generate_lesson_content(request: AIContentRequest) -> Dict[str, Any]:
    """Generate AI-powered lesson content using Gemini"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"lesson_generation_{uuid.uuid4()}",
            system_message=f"""You are an expert educational content creator specializing in {request.subject_area.value} for high school and college students. 
            Create comprehensive, engaging learning content that is appropriate for {request.difficulty.value} level learners.
            Focus on practical applications and real-world examples that resonate with students."""
        ).with_model("gemini", "gemini-2.0-flash")
        
        objectives_text = "\n".join([f"- {obj}" for obj in request.learning_objectives])
        
        prompt = f"""Create a comprehensive learning module on "{request.topic}" for {request.subject_area.value} at {request.difficulty.value} level.

Learning Objectives:
{objectives_text}

Duration: {request.duration_minutes} minutes

Please provide:
1. A clear, engaging lesson title
2. A brief description (2-3 sentences)
3. Detailed lesson content with explanations, examples, and practical applications
4. Key takeaways and summary points
5. Suggested follow-up activities or practice exercises

Make the content engaging and appropriate for high school/college students. Use a conversational but educational tone."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "content": response,
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "subject_area": request.subject_area.value,
                "difficulty": request.difficulty.value,
                "topic": request.topic,
                "duration_minutes": request.duration_minutes
            }
        }
        
    except Exception as e:
        logger.error(f"AI content generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate content")

async def generate_assessment_questions(request: AIAssessmentRequest) -> List[Dict[str, Any]]:
    """Generate AI-powered assessment questions"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        # Get lesson content for context
        lesson = await db.lessons.find_one({"id": request.lesson_id})
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"assessment_generation_{uuid.uuid4()}",
            system_message="""You are an expert assessment designer. Create fair, comprehensive questions that accurately measure student understanding. 
            Ensure questions are clear, have unambiguous correct answers, and include helpful explanations."""
        ).with_model("gemini", "gemini-2.0-flash")
        
        question_types_text = ", ".join([qt.value for qt in request.question_types])
        
        prompt = f"""Based on this lesson content: "{lesson['title']}: {lesson['content'][:500]}..."

Create {request.question_count} assessment questions at {request.difficulty.value} level.
Question types to include: {question_types_text}

For each question, provide:
1. Question text
2. Question type (multiple_choice, true_false, fill_blank, or essay)
3. Options (for multiple choice): exactly 4 options labeled A, B, C, D
4. Correct answer (for multiple choice, use the letter; for true/false use "True" or "False")
5. Explanation of why the answer is correct
6. Points value (10 for basic questions, 15 for intermediate, 20 for advanced)

Format each question as:
QUESTION: [question text]
TYPE: [question_type]
OPTIONS: [A, B, C, D for multiple choice]
CORRECT: [correct answer]
EXPLANATION: [explanation]
POINTS: [point value]
---"""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the AI response into structured questions
        questions = []
        question_blocks = response.split("---")
        
        for block in question_blocks:
            if not block.strip():
                continue
                
            lines = [line.strip() for line in block.strip().split('\n') if line.strip()]
            question_data = {}
            
            for line in lines:
                if line.startswith("QUESTION:"):
                    question_data["question_text"] = line.replace("QUESTION:", "").strip()
                elif line.startswith("TYPE:"):
                    question_data["question_type"] = line.replace("TYPE:", "").strip()
                elif line.startswith("OPTIONS:"):
                    options_text = line.replace("OPTIONS:", "").strip()
                    question_data["options"] = [opt.strip() for opt in options_text.split(",")]
                elif line.startswith("CORRECT:"):
                    question_data["correct_answer"] = line.replace("CORRECT:", "").strip()
                elif line.startswith("EXPLANATION:"):
                    question_data["explanation"] = line.replace("EXPLANATION:", "").strip()
                elif line.startswith("POINTS:"):
                    try:
                        question_data["points"] = int(line.replace("POINTS:", "").strip())
                    except:
                        question_data["points"] = 10
            
            if len(question_data) >= 4:  # Minimum required fields
                question_data["id"] = str(uuid.uuid4())
                question_data["lesson_id"] = request.lesson_id
                question_data["difficulty"] = request.difficulty.value
                question_data["is_ai_generated"] = True
                questions.append(question_data)
        
        return questions[:request.question_count]  # Ensure we don't exceed requested count
        
    except Exception as e:
        logger.error(f"AI assessment generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate assessment")

async def award_coins(user_id: str, amount: int, transaction_type: str, description: str, related_id: Optional[str] = None):
    """Award coins to user and record transaction"""
    # Update user's coin balance
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"total_coins": amount}}
    )
    
    # Record transaction
    transaction = CoinTransaction(
        user_id=user_id,
        amount=amount,
        transaction_type=transaction_type,
        description=description,
        related_id=related_id
    )
    await db.coin_transactions.insert_one(transaction.dict())

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Welcome to BalancEED Learning Platform API"}

# Authentication Routes (keeping existing routes)
@api_router.post("/auth/register", response_model=Dict[str, Any])
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user with extended fields
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
    recent_attempts_raw = await db.quiz_attempts.find(
        {"user_id": current_user.id}
    ).sort("attempted_at", -1).limit(5).to_list(5)
    
    # Convert to proper models to avoid ObjectId serialization issues
    recent_attempts = [QuizAttempt(**attempt) for attempt in recent_attempts_raw]
    
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

# YouTube Integration for Motivational Content
class YouTubeSearchRequest(BaseModel):
    query: str = Field(..., description="Search query for YouTube videos")
    max_results: int = Field(default=5, le=10, description="Maximum number of results")
    category: str = Field(default="motivation", description="Category filter")

@api_router.post("/youtube/search")
async def search_motivational_videos(
    request: YouTubeSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """Search for motivational YouTube videos"""
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=500, detail="YouTube API not configured")
    
    try:
        # Search for motivational/educational videos on YouTube
        search_query = f"{request.query} educational motivation students"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": search_query,
                    "type": "video",
                    "maxResults": request.max_results,
                    "key": YOUTUBE_API_KEY,
                    "safeSearch": "strict",
                    "videoEmbeddable": "true",
                    "videoSyndicated": "true"
                }
            )
            
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="YouTube API request failed")
            
        data = response.json()
        
        videos = []
        for item in data.get("items", []):
            video = {
                "id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"][:200] + "..." if len(item["snippet"]["description"]) > 200 else item["snippet"]["description"],
                "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"],
                "channel": item["snippet"]["channelTitle"],
                "published_at": item["snippet"]["publishedAt"],
                "embed_url": f"https://www.youtube.com/embed/{item['id']['videoId']}",
                "watch_url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
            }
            videos.append(video)
        
        # Save user's search for personalization
        await db.user_youtube_searches.insert_one({
            "user_id": current_user.id,
            "query": request.query,
            "category": request.category,
            "results_count": len(videos),
            "searched_at": datetime.utcnow()
        })
        
        return {"videos": videos, "total": len(videos)}
        
    except Exception as e:
        logger.error(f"YouTube search failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search videos")

# AI-Powered Personalized Learning Recommendations
class UserBehaviorData(BaseModel):
    completed_lessons: List[str] = []
    quiz_scores: List[float] = []
    time_spent_per_lesson: Dict[str, int] = {}
    preferred_subjects: List[str] = []
    difficulty_preference: str = "intermediate"

@api_router.post("/ai/personalized-recommendations")
async def get_personalized_recommendations(
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered personalized learning recommendations based on user behavior"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        # Gather user behavior data
        user_progress = await db.user_progress.find({"user_id": current_user.id}).to_list(100)
        quiz_attempts = await db.quiz_attempts.find({"user_id": current_user.id}).to_list(100)
        
        # Calculate user's learning patterns
        completed_lessons = [p["lesson_id"] for p in user_progress if p.get("completed_at")]
        avg_score = sum([qa["score"] for qa in quiz_attempts]) / len(quiz_attempts) if quiz_attempts else 0
        
        # Get preferred subjects based on activity
        subject_activity = {}
        for progress in user_progress:
            course = await db.courses.find_one({"id": progress["course_id"]})
            if course:
                subject = course.get("subject_area", "general")
                subject_activity[subject] = subject_activity.get(subject, 0) + 1
        
        preferred_subjects = sorted(subject_activity.keys(), key=lambda x: subject_activity[x], reverse=True)
        
        # AI-powered recommendation generation
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"recommendations_{current_user.id}_{uuid.uuid4()}",
            system_message="""You are an expert educational advisor who analyzes student learning patterns to provide personalized recommendations. 
            Focus on identifying strengths, areas for improvement, and optimal learning paths."""
        ).with_model("gemini", "gemini-2.0-flash")
        
        behavior_summary = f"""
        Student Learning Profile:
        - Completed Lessons: {len(completed_lessons)}
        - Average Quiz Score: {avg_score:.1f}%
        - Preferred Subjects: {', '.join(preferred_subjects[:3])}
        - Total XP: {current_user.total_xp}
        - Learning Level: {(current_user.total_xp // 100) + 1}
        
        Recent Performance Trends:
        - Recent quiz scores: {[qa['score'] for qa in quiz_attempts[-5:]]}
        """
        
        prompt = f"""Based on this student's learning profile:
        {behavior_summary}
        
        Provide personalized recommendations in the following format:
        
        NEXT_LESSONS: Suggest 3 specific lesson topics that would benefit this student most
        DIFFICULTY_ADJUSTMENT: Recommend if they should increase/maintain/decrease difficulty and why
        STUDY_SCHEDULE: Suggest optimal study schedule based on their performance patterns
        MOTIVATION_TIPS: Provide 2-3 specific motivational strategies for this student
        SKILL_GAPS: Identify any learning gaps that need attention
        LEARNING_PATH: Suggest the next 3 courses/modules they should focus on
        """
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Save recommendation for tracking
        recommendation = {
            "user_id": current_user.id,
            "content": response,
            "generated_at": datetime.utcnow(),
            "user_stats": {
                "completed_lessons": len(completed_lessons),
                "avg_score": avg_score,
                "preferred_subjects": preferred_subjects[:3],
                "total_xp": current_user.total_xp
            }
        }
        
        await db.ai_recommendations.insert_one(recommendation)
        
        return {
            "recommendations": response,
            "user_stats": recommendation["user_stats"],
            "generated_at": recommendation["generated_at"]
        }
        
    except Exception as e:
        logger.error(f"AI recommendation generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

# Enhanced Learning Path AI
@api_router.post("/ai/adaptive-learning-path")
async def create_adaptive_learning_path(
    subject_area: str,
    current_user: User = Depends(get_current_user)
):
    """Create an AI-powered adaptive learning path that evolves with user progress"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        # Get user's current skill level and preferences
        user_progress = await db.user_progress.find({"user_id": current_user.id}).to_list(100)
        quiz_attempts = await db.quiz_attempts.find({"user_id": current_user.id}).to_list(100)
        
        # Calculate competency levels
        subject_scores = {}
        for attempt in quiz_attempts:
            lesson = await db.lessons.find_one({"id": attempt["lesson_id"]})
            if lesson and lesson.get("subject_area") == subject_area:
                subject_scores.setdefault(subject_area, []).append(attempt["score"])
        
        avg_competency = sum(subject_scores.get(subject_area, [0])) / max(len(subject_scores.get(subject_area, [1])), 1)
        
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"learning_path_{current_user.id}_{uuid.uuid4()}",
            system_message="""You are an expert curriculum designer who creates adaptive learning paths. 
            Design progressive learning sequences that adapt to student performance and ensure mastery before advancement."""
        ).with_model("gemini", "gemini-2.0-flash")
        
        prompt = f"""Create an adaptive learning path for {subject_area} for a student with:
        - Current competency level: {avg_competency:.1f}% in {subject_area}
        - Total learning experience: {current_user.total_xp} XP
        - Completed lessons: {len(user_progress)}
        
        Design a 12-lesson progressive path with:
        1. Lesson titles and objectives
        2. Prerequisites for each lesson
        3. Difficulty progression (beginner -> advanced)
        4. Adaptive checkpoints where difficulty adjusts based on performance
        5. Estimated time commitments
        6. Success criteria for advancement
        
        Format as:
        LESSON_1: [Title] | Prerequisites: [list] | Difficulty: [level] | Time: [minutes] | Success Criteria: [criteria]
        (continue for all 12 lessons)
        
        ADAPTIVE_RULES: Explain how the path adapts based on quiz scores and completion time
        """
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Save the learning path
        learning_path = {
            "user_id": current_user.id,
            "subject_area": subject_area,
            "content": response,
            "current_competency": avg_competency,
            "generated_at": datetime.utcnow(),
            "is_active": True
        }
        
        await db.learning_paths.insert_one(learning_path)
        
        return {
            "learning_path": response,
            "subject_area": subject_area,
            "current_competency": avg_competency,
            "path_id": learning_path.get("_id")
        }
        
    except Exception as e:
        logger.error(f"Learning path generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create learning path")

# Include the router in the main app (moved to end to include all routes)
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
