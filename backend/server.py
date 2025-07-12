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
