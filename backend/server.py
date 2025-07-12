from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import bcrypt
from bson import ObjectId
import json
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager for chat rooms
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_text(message)

manager = ConnectionManager()

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "BalancEDD API is running", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "BalancEDD API is operational"}

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"

# Helper function to convert MongoDB documents to JSON serializable format
def convert_objectid(obj):
    """Convert MongoDB ObjectId to string recursively"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_objectid(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid(item) for item in obj]
    return obj

# Enhanced Models for Complete Learning Platform
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str = "student"
    institution_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    onboarding_completed: bool = False
    brain_training_level: int = 1
    trade_pathway: Optional[str] = None
    certification_progress: int = 0
    language_streak: int = 0
    asvab_progress: Dict[str, int] = {}
    location: Optional[str] = None  # For local opportunities

class LanguageLearningLesson(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    language: str  # "spanish", "french", "german", "japanese", etc.
    level: int
    unit: int
    lesson_number: int
    title: str
    description: str
    lesson_type: str  # "vocabulary", "grammar", "conversation", "listening"
    content: Dict[str, Any]  # Lesson-specific content
    points: int = 10
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LanguageProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    language: str
    level: int = 1
    unit: int = 1
    total_points: int = 0
    streak_count: int = 0
    lessons_completed: int = 0
    last_practice: Optional[datetime] = None

class ASVABModule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str  # "general_science", "arithmetic_reasoning", "word_knowledge", etc.
    level: int
    module_name: str
    description: str
    content: Dict[str, Any]
    practice_questions: List[Dict[str, Any]]
    passing_score: int = 70
    time_limit: int = 30  # minutes
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ASVABResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subject: str
    score: int
    time_taken: int  # minutes
    correct_answers: int
    total_questions: int
    percentile: int
    completed_at: datetime = Field(default_factory=datetime.utcnow)

class CareerAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    assessment_type: str  # "trade", "military", "college"
    interests: List[str]
    aptitudes: List[str]
    personality_traits: List[str]
    work_preferences: List[str]
    results: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    completed_at: datetime = Field(default_factory=datetime.utcnow)

class LocalOpportunity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    opportunity_type: str  # "trade", "apprenticeship", "military", "college"
    title: str
    organization: str
    location: str
    description: str
    requirements: List[str]
    contact_info: Dict[str, str]
    application_deadline: Optional[datetime] = None
    active: bool = True

class BrainTrainingExercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # "math", "reading", "science", "memory", "logic"
    level: int
    title: str
    description: str
    exercise_type: str  # "multiple_choice", "calculation", "pattern", "memory_game"
    content: Dict[str, Any]  # Exercise-specific content
    points: int = 10
    time_limit: Optional[int] = None  # seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TradeModule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trade_pathway: str  # "automotive", "healthcare", "technology", "construction", etc.
    level: int
    module_name: str
    description: str
    learning_objectives: List[str]
    content: Dict[str, Any]
    prerequisites: List[str] = []
    certification_value: int = 10  # Progress toward certification
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BrainTrainingResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    exercise_id: str
    score: int
    time_taken: int  # seconds
    correct_answers: int
    total_questions: int
    completed_at: datetime = Field(default_factory=datetime.utcnow)

class TradeProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    trade_pathway: str
    module_id: str
    completion_percentage: int
    score: int
    time_spent: int  # minutes
    completed_at: Optional[datetime] = None

class ChatRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    topic: str
    category: str  # "study_group", "trade_discussion", "brain_training", "general"
    created_by: str
    participants: List[str] = []
    max_participants: int = 10
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    user_id: str
    username: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    # Academic Information
    grade_level: Optional[str] = None
    academic_strengths: List[str] = []
    academic_challenges: List[str] = []
    learning_style: Optional[str] = None
    
    # Goals and Motivations
    primary_goals: List[str] = []
    motivation_factors: List[str] = []
    preferred_activities: List[str] = []
    
    # Wellness Information
    wellness_focus_areas: List[str] = []
    stress_management_preferences: List[str] = []
    mood_tracking_interest: int = 5
    
    # Nutrition Information
    dietary_restrictions: List[str] = []
    nutrition_knowledge_level: Optional[str] = None
    meal_prep_interest: int = 5
    
    # Life Skills Priorities
    life_skills_priorities: List[str] = []
    independence_level: Optional[str] = None
    career_interests: List[str] = []
    
    # Preferences
    communication_style: Optional[str] = None
    reminder_frequency: Optional[str] = None
    challenge_level_preference: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AdaptiveSurveyResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    question_id: str
    question_text: str
    response: Any
    response_timestamp: datetime = Field(default_factory=datetime.utcnow)

class PersonalizedRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str
    recommendation_type: str
    title: str
    description: str
    priority: int = 1
    personalization_reasons: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"
    institution_id: str = "default"

class UserRegistration(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"
    institution_id: str = "default"
    profile_data: Optional[Dict] = None
    survey_responses: Optional[List[Dict]] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class BalancEDDPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    title: str
    description: str
    academic_goals: List[str]
    wellness_goals: List[str]
    nutrition_goals: List[str]
    life_skills_goals: List[str]
    personalized: bool = True
    customization_reasons: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class ProgressEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: Optional[str] = None
    category: str
    type: str
    title: str
    description: str
    value: Any
    date: datetime = Field(default_factory=datetime.utcnow)

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: Optional[str] = None
    mood_rating: int
    content: str
    tags: List[str] = []
    date: datetime = Field(default_factory=datetime.utcnow)

class NutritionLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: Optional[str] = None
    meal_type: str
    foods: List[str]
    calories: Optional[int] = None
    notes: str = ""
    date: datetime = Field(default_factory=datetime.utcnow)

class LifeSkillTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: Optional[str] = None
    skill_category: str
    task_name: str
    description: str
    completed: bool = False
    completion_date: Optional[datetime] = None
    notes: str = ""
    difficulty_level: str = "moderate"
    personalized: bool = False

# Auth functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

# Language Learning Functions
async def generate_language_lessons():
    """Generate default language learning lessons"""
    lessons = [
        # Spanish Lessons
        {
            "language": "spanish",
            "level": 1,
            "unit": 1,
            "lesson_number": 1,
            "title": "Basic Greetings",
            "description": "Learn essential Spanish greetings and introductions",
            "lesson_type": "vocabulary",
            "content": {
                "vocabulary": [
                    {"spanish": "Hola", "english": "Hello", "audio": "hola.mp3"},
                    {"spanish": "Buenos días", "english": "Good morning", "audio": "buenos_dias.mp3"},
                    {"spanish": "Buenas tardes", "english": "Good afternoon", "audio": "buenas_tardes.mp3"},
                    {"spanish": "Buenas noches", "english": "Good evening", "audio": "buenas_noches.mp3"},
                    {"spanish": "¿Cómo te llamas?", "english": "What's your name?", "audio": "como_te_llamas.mp3"}
                ],
                "exercises": [
                    {
                        "type": "match",
                        "question": "Match the Spanish greeting with its English translation",
                        "pairs": [
                            {"spanish": "Hola", "english": "Hello"},
                            {"spanish": "Buenos días", "english": "Good morning"},
                            {"spanish": "Buenas tardes", "english": "Good afternoon"}
                        ]
                    },
                    {
                        "type": "multiple_choice",
                        "question": "How do you say 'Good morning' in Spanish?",
                        "options": ["Hola", "Buenos días", "Buenas tardes", "Buenas noches"],
                        "correct": 1
                    }
                ]
            },
            "points": 15
        },
        {
            "language": "spanish",
            "level": 1,
            "unit": 1,
            "lesson_number": 2,
            "title": "Numbers 1-10",
            "description": "Learn Spanish numbers from one to ten",
            "lesson_type": "vocabulary",
            "content": {
                "vocabulary": [
                    {"spanish": "uno", "english": "one", "audio": "uno.mp3"},
                    {"spanish": "dos", "english": "two", "audio": "dos.mp3"},
                    {"spanish": "tres", "english": "three", "audio": "tres.mp3"},
                    {"spanish": "cuatro", "english": "four", "audio": "cuatro.mp3"},
                    {"spanish": "cinco", "english": "five", "audio": "cinco.mp3"}
                ],
                "exercises": [
                    {
                        "type": "listening",
                        "question": "Listen and select the correct number",
                        "audio": "tres.mp3",
                        "options": ["dos", "tres", "cuatro"],
                        "correct": 1
                    }
                ]
            },
            "points": 12
        },
        # French Lessons
        {
            "language": "french",
            "level": 1,
            "unit": 1,
            "lesson_number": 1,
            "title": "Basic Greetings",
            "description": "Learn essential French greetings",
            "lesson_type": "vocabulary",
            "content": {
                "vocabulary": [
                    {"french": "Bonjour", "english": "Hello/Good morning", "audio": "bonjour.mp3"},
                    {"french": "Bonsoir", "english": "Good evening", "audio": "bonsoir.mp3"},
                    {"french": "Salut", "english": "Hi/Bye (informal)", "audio": "salut.mp3"},
                    {"french": "Comment vous appelez-vous?", "english": "What is your name? (formal)", "audio": "comment_vous_appelez_vous.mp3"}
                ]
            },
            "points": 15
        }
    ]
    
    for lesson_data in lessons:
        lesson = LanguageLearningLesson(**lesson_data)
        existing = await db.language_lessons.find_one({
            "language": lesson.language,
            "level": lesson.level,
            "unit": lesson.unit,
            "lesson_number": lesson.lesson_number
        })
        if not existing:
            await db.language_lessons.insert_one(lesson.dict())

# ASVAB Functions
async def generate_asvab_modules():
    """Generate ASVAB preparation modules"""
    modules = [
        {
            "subject": "general_science",
            "level": 1,
            "module_name": "Biology Basics",
            "description": "Fundamental biology concepts for ASVAB General Science",
            "content": {
                "topics": [
                    "Cell structure and function",
                    "Human body systems",
                    "Genetics basics",
                    "Ecology and ecosystems"
                ],
                "study_materials": [
                    {
                        "title": "Cell Structure",
                        "content": "Learn about the basic components of plant and animal cells",
                        "examples": ["Nucleus", "Mitochondria", "Cell membrane", "Cytoplasm"]
                    }
                ]
            },
            "practice_questions": [
                {
                    "question": "Which organelle is known as the 'powerhouse of the cell'?",
                    "options": ["Nucleus", "Mitochondria", "Ribosome", "Vacuole"],
                    "correct": 1,
                    "explanation": "Mitochondria produce ATP, the cell's main energy currency."
                },
                {
                    "question": "What is the largest organ in the human body?",
                    "options": ["Heart", "Liver", "Skin", "Brain"],
                    "correct": 2,
                    "explanation": "The skin is the largest organ, covering the entire body."
                }
            ],
            "passing_score": 70,
            "time_limit": 25
        },
        {
            "subject": "arithmetic_reasoning",
            "level": 1,
            "module_name": "Word Problems",
            "description": "Solve arithmetic word problems for ASVAB",
            "content": {
                "topics": [
                    "Basic arithmetic operations",
                    "Fractions and decimals",
                    "Percentages",
                    "Ratios and proportions"
                ]
            },
            "practice_questions": [
                {
                    "question": "If a car travels 240 miles in 4 hours, what is its average speed?",
                    "options": ["50 mph", "60 mph", "70 mph", "80 mph"],
                    "correct": 1,
                    "explanation": "Speed = Distance ÷ Time = 240 ÷ 4 = 60 mph"
                },
                {
                    "question": "A store offers a 20% discount on a $50 item. What is the sale price?",
                    "options": ["$30", "$35", "$40", "$45"],
                    "correct": 2,
                    "explanation": "20% of $50 = $10, so sale price = $50 - $10 = $40"
                }
            ],
            "passing_score": 75,
            "time_limit": 30
        },
        {
            "subject": "word_knowledge",
            "level": 1,
            "module_name": "Vocabulary Building",
            "description": "Expand vocabulary for ASVAB Word Knowledge section",
            "content": {
                "topics": [
                    "Synonyms and antonyms",
                    "Word roots and prefixes",
                    "Context clues",
                    "Common vocabulary"
                ]
            },
            "practice_questions": [
                {
                    "question": "What does 'meticulous' mean?",
                    "options": ["Careless", "Very careful and precise", "Fast", "Loud"],
                    "correct": 1,
                    "explanation": "Meticulous means showing great attention to detail; very careful."
                },
                {
                    "question": "Which word is closest in meaning to 'abundant'?",
                    "options": ["Scarce", "Plentiful", "Small", "Difficult"],
                    "correct": 1,
                    "explanation": "Abundant means existing in large quantities; plentiful."
                }
            ],
            "passing_score": 70,
            "time_limit": 20
        },
        {
            "subject": "mathematics_knowledge",
            "level": 1,
            "module_name": "Algebra Fundamentals",
            "description": "Basic algebra concepts for ASVAB Math Knowledge",
            "content": {
                "topics": [
                    "Solving linear equations",
                    "Working with exponents",
                    "Factoring",
                    "Graphing linear equations"
                ]
            },
            "practice_questions": [
                {
                    "question": "Solve for x: 2x + 5 = 13",
                    "options": ["x = 3", "x = 4", "x = 5", "x = 6"],
                    "correct": 1,
                    "explanation": "2x + 5 = 13, so 2x = 8, therefore x = 4"
                },
                {
                    "question": "What is 3² × 2³?",
                    "options": ["36", "72", "18", "24"],
                    "correct": 1,
                    "explanation": "3² = 9, 2³ = 8, so 9 × 8 = 72"
                }
            ],
            "passing_score": 75,
            "time_limit": 25
        },
        {
            "subject": "mechanical_comprehension",
            "level": 1,
            "module_name": "Simple Machines",
            "description": "Understanding basic mechanical principles",
            "content": {
                "topics": [
                    "Levers and fulcrums",
                    "Pulleys and wheels",
                    "Inclined planes",
                    "Gears and mechanical advantage"
                ]
            },
            "practice_questions": [
                {
                    "question": "Which type of lever has the fulcrum between the effort and the load?",
                    "options": ["First class", "Second class", "Third class", "Fourth class"],
                    "correct": 0,
                    "explanation": "A first-class lever has the fulcrum positioned between the effort and load, like a seesaw."
                }
            ],
            "passing_score": 70,
            "time_limit": 20
        }
    ]
    
    for module_data in modules:
        module = ASVABModule(**module_data)
        existing = await db.asvab_modules.find_one({
            "subject": module.subject,
            "level": module.level,
            "module_name": module.module_name
        })
        if not existing:
            await db.asvab_modules.insert_one(module.dict())

# Career Assessment Functions
def calculate_career_match(interests, aptitudes, personality):
    """Calculate career recommendations based on assessment results"""
    
    # Trade recommendations
    trade_scores = {}
    
    if "mechanical" in interests or "hands_on" in aptitudes:
        trade_scores["automotive"] = 85
        trade_scores["construction"] = 80
        trade_scores["manufacturing"] = 75
    
    if "helping_people" in interests or "healthcare" in aptitudes:
        trade_scores["healthcare"] = 90
        trade_scores["emergency_services"] = 85
    
    if "technology" in interests or "logical_thinking" in aptitudes:
        trade_scores["information_technology"] = 95
        trade_scores["electronics"] = 85
    
    if "creative" in interests or "artistic" in aptitudes:
        trade_scores["culinary"] = 80
        trade_scores["cosmetology"] = 85
        trade_scores["graphic_design"] = 90
    
    # Military branch recommendations
    military_scores = {}
    
    if "leadership" in personality or "disciplined" in personality:
        military_scores["army"] = 85
        military_scores["marines"] = 90
    
    if "technology" in interests or "analytical" in aptitudes:
        military_scores["air_force"] = 95
        military_scores["space_force"] = 90
    
    if "adventure" in interests or "physical_fitness" in aptitudes:
        military_scores["navy"] = 85
        military_scores["coast_guard"] = 80
    
    # Military specialties (MOS)
    mos_recommendations = []
    
    if "technology" in interests:
        mos_recommendations.extend([
            {"branch": "air_force", "mos": "3D1X2", "title": "Cyber Transport Systems", "score": 95},
            {"branch": "army", "mos": "25B", "title": "Information Technology Specialist", "score": 90},
            {"branch": "navy", "mos": "IT", "title": "Information Systems Technician", "score": 88}
        ])
    
    if "mechanical" in interests:
        mos_recommendations.extend([
            {"branch": "army", "mos": "91B", "title": "Wheeled Vehicle Mechanic", "score": 85},
            {"branch": "air_force", "mos": "2A6X1", "title": "Aerospace Propulsion", "score": 88},
            {"branch": "navy", "mos": "AD", "title": "Aviation Machinist's Mate", "score": 83}
        ])
    
    if "healthcare" in interests:
        mos_recommendations.extend([
            {"branch": "army", "mos": "68W", "title": "Combat Medic Specialist", "score": 92},
            {"branch": "air_force", "mos": "4N0X1", "title": "Aerospace Medical Service", "score": 90},
            {"branch": "navy", "mos": "HM", "title": "Hospital Corpsman", "score": 89}
        ])
    
    return {
        "trade_recommendations": sorted(trade_scores.items(), key=lambda x: x[1], reverse=True)[:3],
        "military_branches": sorted(military_scores.items(), key=lambda x: x[1], reverse=True)[:3],
        "military_specialties": sorted(mos_recommendations, key=lambda x: x["score"], reverse=True)[:5]
    }

# Brain Training Functions
async def generate_brain_training_exercises():
    """Generate default brain training exercises"""
    exercises = [
        # Math Exercises
        {
            "category": "math",
            "level": 1,
            "title": "Basic Addition",
            "description": "Solve addition problems quickly",
            "exercise_type": "calculation",
            "content": {
                "problems": [
                    {"question": "15 + 23", "answer": 38},
                    {"question": "47 + 19", "answer": 66},
                    {"question": "82 + 35", "answer": 117}
                ]
            },
            "points": 10,
            "time_limit": 60
        },
        {
            "category": "math",
            "level": 2,
            "title": "Percentage Calculations",
            "description": "Calculate percentages and discounts",
            "exercise_type": "multiple_choice",
            "content": {
                "questions": [
                    {
                        "question": "What is 20% of 150?",
                        "options": ["25", "30", "35", "40"],
                        "correct": 1
                    },
                    {
                        "question": "If a $50 item is 15% off, what's the sale price?",
                        "options": ["$42.50", "$45.00", "$47.50", "$48.00"],
                        "correct": 0
                    }
                ]
            },
            "points": 15,
            "time_limit": 90
        },
        # Reading Comprehension
        {
            "category": "reading",
            "level": 1,
            "title": "Main Idea Recognition",
            "description": "Identify the main idea in short passages",
            "exercise_type": "multiple_choice",
            "content": {
                "passages": [
                    {
                        "text": "Solar panels convert sunlight into electricity through photovoltaic cells. This renewable energy source helps reduce carbon emissions and dependence on fossil fuels.",
                        "question": "What is the main idea of this passage?",
                        "options": [
                            "Solar panels are expensive",
                            "Solar panels convert sunlight to electricity",
                            "Fossil fuels are bad",
                            "Carbon emissions are dangerous"
                        ],
                        "correct": 1
                    }
                ]
            },
            "points": 12,
            "time_limit": 120
        },
        # Memory Games
        {
            "category": "memory",
            "level": 1,
            "title": "Pattern Memory",
            "description": "Remember and repeat color patterns",
            "exercise_type": "memory_game",
            "content": {
                "type": "sequence",
                "colors": ["red", "blue", "green", "yellow"],
                "sequence_length": 4
            },
            "points": 8,
            "time_limit": 30
        },
        # Science
        {
            "category": "science",
            "level": 1,
            "title": "Basic Chemistry",
            "description": "Identify chemical elements and compounds",
            "exercise_type": "multiple_choice",
            "content": {
                "questions": [
                    {
                        "question": "What is the chemical symbol for water?",
                        "options": ["H2O", "CO2", "NaCl", "O2"],
                        "correct": 0
                    },
                    {
                        "question": "Which element has the symbol 'Au'?",
                        "options": ["Silver", "Gold", "Aluminum", "Argon"],
                        "correct": 1
                    }
                ]
            },
            "points": 10,
            "time_limit": 60
        }
    ]
    
    for exercise_data in exercises:
        exercise = BrainTrainingExercise(**exercise_data)
        existing = await db.brain_training_exercises.find_one({"title": exercise.title})
        if not existing:
            await db.brain_training_exercises.insert_one(exercise.dict())

async def generate_trade_modules():
    """Generate default trade pathway modules"""
    modules = [
        # Automotive Technology
        {
            "trade_pathway": "automotive",
            "level": 1,
            "module_name": "Engine Basics",
            "description": "Understanding internal combustion engines",
            "learning_objectives": [
                "Identify engine components",
                "Understand combustion cycle",
                "Basic engine maintenance"
            ],
            "content": {
                "lessons": [
                    {
                        "title": "Engine Components",
                        "content": "Learn about pistons, cylinders, valves, and more",
                        "quiz": [
                            {
                                "question": "How many strokes are in a typical car engine cycle?",
                                "options": ["2", "4", "6", "8"],
                                "correct": 1
                            }
                        ]
                    }
                ]
            },
            "prerequisites": [],
            "certification_value": 15
        },
        {
            "trade_pathway": "automotive",
            "level": 2,
            "module_name": "Brake Systems",
            "description": "Understanding brake system operation and maintenance",
            "learning_objectives": [
                "Brake system components",
                "Hydraulic principles",
                "Brake maintenance procedures"
            ],
            "content": {
                "lessons": [
                    {
                        "title": "Hydraulic Brake Systems",
                        "content": "Learn how brake fluid transfers force",
                        "quiz": [
                            {
                                "question": "What fluid is typically used in brake systems?",
                                "options": ["Engine oil", "Brake fluid", "Water", "Transmission fluid"],
                                "correct": 1
                            }
                        ]
                    }
                ]
            },
            "prerequisites": ["Engine Basics"],
            "certification_value": 20
        },
        # Healthcare
        {
            "trade_pathway": "healthcare",
            "level": 1,
            "module_name": "Medical Terminology",
            "description": "Essential medical vocabulary and terminology",
            "learning_objectives": [
                "Basic medical prefixes and suffixes",
                "Body system terminology",
                "Common medical abbreviations"
            ],
            "content": {
                "lessons": [
                    {
                        "title": "Medical Prefixes",
                        "content": "Learn common prefixes used in medical terms",
                        "quiz": [
                            {
                                "question": "What does the prefix 'hyper-' mean?",
                                "options": ["Under", "Over", "Around", "Through"],
                                "correct": 1
                            }
                        ]
                    }
                ]
            },
            "prerequisites": [],
            "certification_value": 10
        },
        # Technology
        {
            "trade_pathway": "technology",
            "level": 1,
            "module_name": "Programming Fundamentals",
            "description": "Introduction to programming concepts",
            "learning_objectives": [
                "Variables and data types",
                "Control structures",
                "Basic algorithms"
            ],
            "content": {
                "lessons": [
                    {
                        "title": "Variables and Data Types",
                        "content": "Understanding how computers store and manipulate data",
                        "quiz": [
                            {
                                "question": "Which data type stores whole numbers?",
                                "options": ["String", "Integer", "Boolean", "Float"],
                                "correct": 1
                            }
                        ]
                    }
                ]
            },
            "prerequisites": [],
            "certification_value": 12
        }
    ]
    
    for module_data in modules:
        module = TradeModule(**module_data)
        existing = await db.trade_modules.find_one({"module_name": module.module_name, "trade_pathway": module.trade_pathway})
        if not existing:
            await db.trade_modules.insert_one(module.dict())

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegistration):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "institution_id": user_data.institution_id,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "onboarding_completed": bool(user_data.profile_data),
        "brain_training_level": 1,
        "trade_pathway": None,
        "certification_progress": 0,
        "language_streak": 0,
        "asvab_progress": {},
        "location": None
    }
    user_obj = User(**user_dict)
    
    # Store user with hashed password
    user_db_dict = user_obj.dict()
    user_db_dict["hashed_password"] = hashed_password
    await db.users.insert_one(user_db_dict)
    
    # Store profile data if provided
    if user_data.profile_data:
        profile_data = user_data.profile_data.copy()
        profile_data["user_id"] = user_obj.id
        profile_obj = UserProfile(**profile_data)
        await db.user_profiles.insert_one(profile_obj.dict())
    
    # Store survey responses if provided
    if user_data.survey_responses:
        for response_data in user_data.survey_responses:
            response_data["user_id"] = user_obj.id
            survey_response = AdaptiveSurveyResponse(**response_data)
            await db.survey_responses.insert_one(survey_response.dict())
    
    # Create token
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": user_obj.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

# Language Learning Routes
@api_router.get("/language-learning/languages")
async def get_available_languages():
    return [
        {"code": "spanish", "name": "Spanish", "flag": "🇪🇸", "difficulty": "Easy"},
        {"code": "french", "name": "French", "flag": "🇫🇷", "difficulty": "Medium"},
        {"code": "german", "name": "German", "flag": "🇩🇪", "difficulty": "Medium"},
        {"code": "japanese", "name": "Japanese", "flag": "🇯🇵", "difficulty": "Hard"},
        {"code": "mandarin", "name": "Mandarin Chinese", "flag": "🇨🇳", "difficulty": "Hard"},
        {"code": "italian", "name": "Italian", "flag": "🇮🇹", "difficulty": "Easy"},
        {"code": "portuguese", "name": "Portuguese", "flag": "🇵🇹", "difficulty": "Easy"},
        {"code": "arabic", "name": "Arabic", "flag": "🇸🇦", "difficulty": "Hard"}
    ]

@api_router.get("/language-learning/{language}/lessons")
async def get_language_lessons(
    language: str, 
    level: int = 1, 
    current_user: User = Depends(get_current_user)
):
    lessons = await db.language_lessons.find({
        "language": language,
        "level": level
    }).sort("unit", 1).sort("lesson_number", 1).to_list(50)
    
    return convert_objectid(lessons)

@api_router.get("/language-learning/progress")
async def get_language_progress(current_user: User = Depends(get_current_user)):
    progress = await db.language_progress.find({"user_id": current_user.id}).to_list(10)
    return convert_objectid(progress)

@api_router.post("/language-learning/complete-lesson")
async def complete_language_lesson(
    language: str,
    lesson_id: str,
    score: int,
    current_user: User = Depends(get_current_user)
):
    # Update or create language progress
    progress = await db.language_progress.find_one({
        "user_id": current_user.id,
        "language": language
    })
    
    if progress:
        # Update existing progress
        new_points = progress["total_points"] + (score * 2)
        new_streak = progress["streak_count"] + 1 if score >= 80 else 0
        new_lessons = progress["lessons_completed"] + 1
        
        await db.language_progress.update_one(
            {"user_id": current_user.id, "language": language},
            {"$set": {
                "total_points": new_points,
                "streak_count": new_streak,
                "lessons_completed": new_lessons,
                "last_practice": datetime.utcnow()
            }}
        )
    else:
        # Create new progress record
        new_progress = LanguageProgress(
            user_id=current_user.id,
            language=language,
            total_points=score * 2,
            streak_count=1 if score >= 80 else 0,
            lessons_completed=1,
            last_practice=datetime.utcnow()
        )
        await db.language_progress.insert_one(new_progress.dict())
    
    # Update user's language streak
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"language_streak": new_streak if 'new_streak' in locals() else 1}}
    )
    
    return {"message": "Lesson completed successfully", "points_earned": score * 2}

# ASVAB Routes
@api_router.get("/asvab/subjects")
async def get_asvab_subjects():
    return [
        {"code": "general_science", "name": "General Science", "icon": "🔬"},
        {"code": "arithmetic_reasoning", "name": "Arithmetic Reasoning", "icon": "🧮"},
        {"code": "word_knowledge", "name": "Word Knowledge", "icon": "📖"},
        {"code": "paragraph_comprehension", "name": "Paragraph Comprehension", "icon": "📝"},
        {"code": "mathematics_knowledge", "name": "Mathematics Knowledge", "icon": "📐"},
        {"code": "electronics_information", "name": "Electronics Information", "icon": "⚡"},
        {"code": "auto_shop_information", "name": "Auto & Shop Information", "icon": "🔧"},
        {"code": "mechanical_comprehension", "name": "Mechanical Comprehension", "icon": "⚙️"}
    ]

@api_router.get("/asvab/{subject}/modules")
async def get_asvab_modules(subject: str, current_user: User = Depends(get_current_user)):
    modules = await db.asvab_modules.find({"subject": subject}).sort("level", 1).to_list(50)
    return convert_objectid(modules)

@api_router.post("/asvab/submit-result")
async def submit_asvab_result(result: ASVABResult, current_user: User = Depends(get_current_user)):
    result.user_id = current_user.id
    
    # Calculate percentile (simplified)
    result.percentile = min(95, max(5, result.score))
    
    await db.asvab_results.insert_one(result.dict())
    
    # Update user's ASVAB progress
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {f"asvab_progress.{result.subject}": result.score}}
    )
    
    return {"message": "ASVAB result submitted successfully", "percentile": result.percentile}

@api_router.get("/asvab/progress")
async def get_asvab_progress(current_user: User = Depends(get_current_user)):
    results = await db.asvab_results.find({"user_id": current_user.id}).to_list(100)
    
    # Calculate overall ASVAB score (AFQT approximation)
    subject_scores = {}
    for result in results:
        subject_scores[result["subject"]] = result["score"]
    
    # AFQT calculation (simplified: AR + MK + WK + PC)
    afqt_subjects = ["arithmetic_reasoning", "mathematics_knowledge", "word_knowledge", "paragraph_comprehension"]
    afqt_scores = [subject_scores.get(subject, 0) for subject in afqt_subjects]
    afqt_score = sum(afqt_scores) / len([s for s in afqt_scores if s > 0]) if any(afqt_scores) else 0
    
    return {
        "subject_scores": subject_scores,
        "afqt_score": round(afqt_score, 1),
        "total_tests_taken": len(results),
        "military_eligibility": "Eligible" if afqt_score >= 31 else "Not Eligible"
    }

# Career Assessment Routes
@api_router.get("/career-assessment/questions")
async def get_career_assessment_questions():
    return {
        "interests": [
            {
                "id": "work_environment",
                "question": "What type of work environment do you prefer?",
                "options": ["Indoors/Office", "Outdoors", "Workshop/Lab", "Varies"],
                "type": "single_choice"
            },
            {
                "id": "activity_type",
                "question": "What type of activities interest you most?",
                "options": ["Working with hands", "Helping people", "Analyzing data", "Creating things"],
                "type": "multi_choice"
            },
            {
                "id": "problem_solving",
                "question": "How do you prefer to solve problems?",
                "options": ["Logical analysis", "Creative thinking", "Following procedures", "Team collaboration"],
                "type": "single_choice"
            }
        ],
        "aptitudes": [
            {
                "id": "strengths",
                "question": "What are your strongest abilities?",
                "options": ["Mechanical skills", "Communication", "Math/Science", "Technology", "Leadership"],
                "type": "multi_choice"
            },
            {
                "id": "learning_style",
                "question": "How do you learn best?",
                "options": ["Hands-on practice", "Reading/studying", "Visual demonstrations", "Group discussions"],
                "type": "single_choice"
            }
        ],
        "personality": [
            {
                "id": "work_style",
                "question": "Which describes your work style?",
                "options": ["Independent", "Team-oriented", "Leadership role", "Supportive role"],
                "type": "single_choice"
            },
            {
                "id": "traits",
                "question": "Which traits describe you?",
                "options": ["Detail-oriented", "Creative", "Organized", "Adventurous", "Analytical"],
                "type": "multi_choice"
            }
        ]
    }

@api_router.post("/career-assessment/submit")
async def submit_career_assessment(
    assessment_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    # Process assessment responses
    interests = assessment_data.get("interests", [])
    aptitudes = assessment_data.get("aptitudes", [])
    personality = assessment_data.get("personality", [])
    
    # Calculate recommendations
    results = calculate_career_match(interests, aptitudes, personality)
    
    # Create assessment record
    assessment = CareerAssessment(
        user_id=current_user.id,
        assessment_type="comprehensive",
        interests=interests,
        aptitudes=aptitudes,
        personality_traits=personality,
        work_preferences=assessment_data.get("work_preferences", []),
        results=results,
        recommendations=[]
    )
    
    await db.career_assessments.insert_one(assessment.dict())
    
    return results

# Local Opportunities Routes
@api_router.get("/local-opportunities")
async def get_local_opportunities(
    location: Optional[str] = None,
    opportunity_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"active": True}
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    elif current_user.location:
        query["location"] = {"$regex": current_user.location, "$options": "i"}
    
    if opportunity_type:
        query["opportunity_type"] = opportunity_type
    
    opportunities = await db.local_opportunities.find(query).to_list(50)
    return convert_objectid(opportunities)

@api_router.post("/local-opportunities/search")
async def search_opportunities(search_data: Dict[str, Any]):
    location = search_data.get("location", "")
    interests = search_data.get("interests", [])
    
    # Generate mock opportunities based on search
    opportunities = [
        {
            "id": str(uuid.uuid4()),
            "opportunity_type": "apprenticeship",
            "title": "Automotive Technician Apprenticeship",
            "organization": "Johnson Auto Group",
            "location": f"{location} Area",
            "description": "4-year automotive technician apprenticeship program with full benefits",
            "requirements": ["High school diploma", "Valid driver's license", "Mechanical aptitude"],
            "contact_info": {"phone": "(555) 123-4567", "email": "careers@johnsonauto.com"},
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "opportunity_type": "military",
            "title": "Army National Guard - Technology Specialist",
            "organization": "U.S. Army National Guard",
            "location": f"{location} Recruiting Station",
            "description": "Part-time service with technology training and education benefits",
            "requirements": ["U.S. Citizen", "Age 17-35", "High school diploma", "Pass ASVAB"],
            "contact_info": {"phone": "(555) 987-6543", "website": "www.nationalguard.mil"},
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "opportunity_type": "college",
            "title": "Community College Career Fair",
            "organization": f"{location} Community College",
            "location": f"{location} Community College Campus",
            "description": "Annual career fair with local employers and trade programs",
            "requirements": ["Open to all students", "Bring resume", "Dress professionally"],
            "contact_info": {"phone": "(555) 456-7890", "email": "careerfair@lccc.edu"},
            "application_deadline": datetime.utcnow() + timedelta(days=30),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "opportunity_type": "trade",
            "title": "Electrician Training Program",
            "organization": "Metro Electrical Contractors",
            "location": f"{location} Training Center",
            "description": "6-month electrician training with job placement assistance",
            "requirements": ["18+ years old", "Physical fitness", "Basic math skills"],
            "contact_info": {"phone": "(555) 321-0987", "email": "training@metroelectrical.com"},
            "active": True
        }
    ]
    
    return opportunities

# Brain Training Routes
@api_router.get("/brain-training/exercises")
async def get_brain_training_exercises(
    category: Optional[str] = None,
    level: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    if level:
        query["level"] = level
    
    exercises = await db.brain_training_exercises.find(query).to_list(50)
    return convert_objectid(exercises)

@api_router.post("/brain-training/submit-result")
async def submit_brain_training_result(
    result: BrainTrainingResult,
    current_user: User = Depends(get_current_user)
):
    result.user_id = current_user.id
    await db.brain_training_results.insert_one(result.dict())
    
    # Update user's brain training level if needed
    user_results = await db.brain_training_results.find({"user_id": current_user.id}).to_list(100)
    avg_score = sum(r["score"] for r in user_results) / len(user_results) if user_results else 0
    
    if avg_score > 80 and len(user_results) >= 5:
        new_level = current_user.brain_training_level + 1
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"brain_training_level": new_level}}
        )
    
    return {"message": "Result submitted successfully", "new_level": avg_score > 80}

@api_router.get("/brain-training/progress")
async def get_brain_training_progress(current_user: User = Depends(get_current_user)):
    results = await db.brain_training_results.find({"user_id": current_user.id}).to_list(100)
    
    if not results:
        return {"total_exercises": 0, "average_score": 0, "categories": {}}
    
    # Calculate progress statistics
    total_exercises = len(results)
    average_score = sum(r["score"] for r in results) / total_exercises
    
    # Group by category
    categories = {}
    for result in results:
        exercise = await db.brain_training_exercises.find_one({"id": result["exercise_id"]})
        if exercise:
            cat = exercise["category"]
            if cat not in categories:
                categories[cat] = {"count": 0, "total_score": 0}
            categories[cat]["count"] += 1
            categories[cat]["total_score"] += result["score"]
    
    # Calculate category averages
    for cat in categories:
        categories[cat]["average"] = categories[cat]["total_score"] / categories[cat]["count"]
    
    return {
        "total_exercises": total_exercises,
        "average_score": average_score,
        "current_level": current_user.brain_training_level,
        "categories": categories
    }

# Trade Learning Routes
@api_router.get("/trades/pathways")
async def get_trade_pathways():
    pathways = [
        {"id": "automotive", "name": "Automotive Technology", "description": "Learn automotive repair and maintenance"},
        {"id": "healthcare", "name": "Healthcare", "description": "Medical terminology and healthcare skills"},
        {"id": "technology", "name": "Information Technology", "description": "Programming and IT skills"},
        {"id": "construction", "name": "Construction", "description": "Building and construction trades"},
        {"id": "culinary", "name": "Culinary Arts", "description": "Cooking and food service"},
        {"id": "cosmetology", "name": "Cosmetology", "description": "Hair, skin, and nail care"}
    ]
    return pathways

@api_router.get("/trades/{pathway}/modules")
async def get_trade_modules(pathway: str, current_user: User = Depends(get_current_user)):
    modules = await db.trade_modules.find({"trade_pathway": pathway}).sort("level", 1).to_list(50)
    
    # Get user's progress for each module
    user_progress = await db.trade_progress.find({"user_id": current_user.id, "trade_pathway": pathway}).to_list(100)
    progress_map = {p["module_id"]: p for p in user_progress}
    
    # Add progress info to modules
    for module in modules:
        module_id = module["id"]
        if module_id in progress_map:
            module["user_progress"] = progress_map[module_id]
        else:
            module["user_progress"] = None
    
    return convert_objectid(modules)

@api_router.post("/trades/progress")
async def update_trade_progress(
    progress: TradeProgress,
    current_user: User = Depends(get_current_user)
):
    progress.user_id = current_user.id
    
    # Update or insert progress
    existing = await db.trade_progress.find_one({
        "user_id": current_user.id,
        "module_id": progress.module_id
    })
    
    if existing:
        await db.trade_progress.update_one(
            {"user_id": current_user.id, "module_id": progress.module_id},
            {"$set": progress.dict()}
        )
    else:
        await db.trade_progress.insert_one(progress.dict())
    
    # Update user's certification progress
    if progress.completion_percentage == 100:
        module = await db.trade_modules.find_one({"id": progress.module_id})
        if module:
            new_cert_progress = current_user.certification_progress + module["certification_value"]
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": {"certification_progress": new_cert_progress}}
            )
    
    return {"message": "Progress updated successfully"}

# Chat Room Routes
@api_router.get("/chat/rooms")
async def get_chat_rooms(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    rooms = await db.chat_rooms.find(query).to_list(50)
    return convert_objectid(rooms)

@api_router.post("/chat/rooms")
async def create_chat_room(room: ChatRoom, current_user: User = Depends(get_current_user)):
    room.created_by = current_user.id
    room.participants = [current_user.id]
    await db.chat_rooms.insert_one(room.dict())
    return room

@api_router.post("/chat/rooms/{room_id}/join")
async def join_chat_room(room_id: str, current_user: User = Depends(get_current_user)):
    room = await db.chat_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user.id not in room["participants"]:
        if len(room["participants"]) >= room["max_participants"]:
            raise HTTPException(status_code=400, detail="Room is full")
        
        await db.chat_rooms.update_one(
            {"id": room_id},
            {"$push": {"participants": current_user.id}}
        )
    
    return {"message": "Joined room successfully"}

@api_router.get("/chat/rooms/{room_id}/messages")
async def get_chat_messages(room_id: str, limit: int = 50):
    messages = await db.chat_messages.find({"room_id": room_id}).sort("timestamp", -1).limit(limit).to_list(limit)
    return convert_objectid(messages[::-1])  # Reverse to show oldest first

@api_router.websocket("/chat/rooms/{room_id}/ws")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Create chat message
            chat_message = ChatMessage(
                room_id=room_id,
                user_id=message_data["user_id"],
                username=message_data["username"],
                message=message_data["message"]
            )
            
            # Save to database
            await db.chat_messages.insert_one(chat_message.dict())
            
            # Broadcast to all connections in the room
            await manager.broadcast(json.dumps({
                "user_id": chat_message.user_id,
                "username": chat_message.username,
                "message": chat_message.message,
                "timestamp": chat_message.timestamp.isoformat()
            }), room_id)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

# Survey and Onboarding routes
@api_router.get("/survey/questions")
async def get_adaptive_survey_questions():
    """Get adaptive survey questions for registration"""
    return {
        "academic": [
            {
                "id": "grade_level",
                "type": "select",
                "question": "What grade level are you currently in?",
                "options": ["6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade", "Other"],
                "required": True
            },
            {
                "id": "academic_strengths",
                "type": "multi_select",
                "question": "What subjects do you feel strongest in? (Select all that apply)",
                "options": ["Mathematics", "Science", "English/Language Arts", "History", "Art", "Music", "Physical Education", "Technology"],
                "required": False
            },
            {
                "id": "academic_challenges",
                "type": "multi_select",
                "question": "What subjects would you like more support with? (Select all that apply)",
                "options": ["Mathematics", "Science", "English/Language Arts", "History", "Art", "Music", "Study Skills", "Test Taking"],
                "required": False
            },
            {
                "id": "learning_style",
                "type": "select",
                "question": "How do you learn best?",
                "options": ["Visual (seeing pictures, diagrams)", "Auditory (hearing explanations)", "Kinesthetic (hands-on activities)", "Reading/Writing", "Combination"],
                "required": True
            }
        ],
        "goals": [
            {
                "id": "primary_goals",
                "type": "multi_select",
                "question": "What are your main goals for this program? (Select up to 3)",
                "options": ["Improve academic performance", "Build confidence", "Develop life skills", "Improve health and wellness", "Learn stress management", "Prepare for future career", "Build better relationships", "Increase independence"],
                "max_selections": 3,
                "required": True
            },
            {
                "id": "motivation_factors",
                "type": "multi_select",
                "question": "What motivates you most? (Select all that apply)",
                "options": ["Achieving personal goals", "Helping others", "Recognition and praise", "Learning new things", "Creative expression", "Competition", "Making a difference", "Building skills for the future"],
                "required": False
            }
        ],
        "wellness": [
            {
                "id": "wellness_focus_areas",
                "type": "multi_select",
                "question": "Which wellness areas would you like to focus on? (Select all that apply)",
                "options": ["Stress management", "Emotional regulation", "Building self-confidence", "Improving sleep", "Managing anxiety", "Building relationships", "Mindfulness and meditation"],
                "required": False
            },
            {
                "id": "mood_tracking_interest",
                "type": "scale",
                "question": "How interested are you in tracking your daily mood and emotions?",
                "scale": {"min": 1, "max": 10, "labels": {"1": "Not interested", "10": "Very interested"}},
                "required": True
            }
        ],
        "nutrition": [
            {
                "id": "nutrition_knowledge_level",
                "type": "select",
                "question": "How would you rate your current nutrition knowledge?",
                "options": ["Beginner - I'm just starting to learn", "Intermediate - I know the basics", "Advanced - I'm quite knowledgeable"],
                "required": True
            },
            {
                "id": "dietary_restrictions",
                "type": "multi_select",
                "question": "Do you have any dietary restrictions or preferences? (Select all that apply)",
                "options": ["No restrictions", "Vegetarian", "Vegan", "Gluten-free", "Lactose intolerant", "Food allergies", "Religious dietary laws", "Other"],
                "required": False
            },
            {
                "id": "meal_prep_interest",
                "type": "scale",
                "question": "How interested are you in learning meal planning and preparation?",
                "scale": {"min": 1, "max": 10, "labels": {"1": "Not interested", "10": "Very interested"}},
                "required": True
            }
        ],
        "life_skills": [
            {
                "id": "life_skills_priorities",
                "type": "multi_select",
                "question": "Which life skills are most important to you right now? (Select up to 4)",
                "options": ["Financial literacy", "Time management", "Communication skills", "Career preparation", "Conflict resolution", "Home management", "Technology skills", "Leadership"],
                "max_selections": 4,
                "required": True
            },
            {
                "id": "independence_level",
                "type": "select",
                "question": "How independent do you feel in managing daily tasks?",
                "options": ["Low - I need a lot of support", "Medium - I can do some things independently", "High - I'm quite independent"],
                "required": True
            }
        ],
        "preferences": [
            {
                "id": "communication_style",
                "type": "select",
                "question": "What communication style do you prefer?",
                "options": ["Formal and structured", "Casual and friendly", "Encouraging and supportive", "Direct and clear"],
                "required": True
            },
            {
                "id": "challenge_level_preference",
                "type": "select",
                "question": "What level of challenge do you prefer in your activities?",
                "options": ["Easy - I like to build confidence gradually", "Moderate - I want some challenge but not too much", "Challenging - I thrive on difficult tasks"],
                "required": True
            }
        ]
    }

# Student routes with personalization
@api_router.get("/student/dashboard")
async def get_student_dashboard(current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get user profile for personalization
    profile = await db.user_profiles.find_one({"user_id": current_user.id})
    profile = convert_objectid(profile) if profile else None
    
    # Get student's plan
    plan = await db.balanc_edd_plans.find_one({"student_id": current_user.id})
    plan = convert_objectid(plan) if plan else None
    
    # Get personalized recommendations
    recommendations = await db.personalized_recommendations.find(
        {"user_id": current_user.id}
    ).sort("priority", -1).limit(6).to_list(6)
    recommendations = convert_objectid(recommendations)
    
    # Get recent progress entries
    recent_progress = await db.progress_entries.find(
        {"student_id": current_user.id}
    ).sort("date", -1).limit(10).to_list(10)
    recent_progress = convert_objectid(recent_progress)
    
    # Get recent journal entries
    recent_journals = await db.journal_entries.find(
        {"student_id": current_user.id}
    ).sort("date", -1).limit(5).to_list(5)
    recent_journals = convert_objectid(recent_journals)
    
    # Get recent nutrition logs
    recent_nutrition = await db.nutrition_logs.find(
        {"student_id": current_user.id}
    ).sort("date", -1).limit(5).to_list(5)
    recent_nutrition = convert_objectid(recent_nutrition)
    
    # Get life skills tasks
    life_skills = await db.life_skill_tasks.find(
        {"student_id": current_user.id}
    ).to_list(50)
    life_skills = convert_objectid(life_skills)
    
    # Get brain training progress
    brain_training_results = await db.brain_training_results.find(
        {"user_id": current_user.id}
    ).limit(5).to_list(5)
    
    # Get trade progress
    trade_progress = await db.trade_progress.find(
        {"user_id": current_user.id}
    ).limit(5).to_list(5)
    
    # Get language progress
    language_progress = await db.language_progress.find(
        {"user_id": current_user.id}
    ).limit(5).to_list(5)
    
    # Get ASVAB progress
    asvab_results = await db.asvab_results.find(
        {"user_id": current_user.id}
    ).limit(5).to_list(5)
    
    # Calculate progress stats
    total_progress = len(recent_progress)
    academic_progress = len([p for p in recent_progress if p["category"] == "academic"])
    wellness_progress = len([p for p in recent_progress if p["category"] == "wellness"])
    nutrition_progress = len([p for p in recent_progress if p["category"] == "nutrition"])
    life_skills_completed = len([ls for ls in life_skills if ls["completed"]])
    
    return {
        "user": current_user,
        "profile": profile,
        "plan": plan,
        "recommendations": recommendations,
        "stats": {
            "total_progress": total_progress,
            "academic_progress": academic_progress,
            "wellness_progress": wellness_progress,
            "nutrition_progress": nutrition_progress,
            "life_skills_completed": life_skills_completed,
            "life_skills_total": len(life_skills),
            "brain_training_level": current_user.brain_training_level,
            "certification_progress": current_user.certification_progress,
            "language_streak": current_user.language_streak,
            "asvab_completed": len(asvab_results)
        },
        "recent_progress": recent_progress,
        "recent_journals": recent_journals,
        "recent_nutrition": recent_nutrition,
        "life_skills": life_skills,
        "brain_training_results": convert_objectid(brain_training_results),
        "trade_progress": convert_objectid(trade_progress),
        "language_progress": convert_objectid(language_progress),
        "asvab_results": convert_objectid(asvab_results)
    }

@api_router.post("/student/progress")
async def add_progress_entry(entry: ProgressEntry, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    entry.student_id = current_user.id
    await db.progress_entries.insert_one(entry.dict())
    return entry

@api_router.post("/student/journal")
async def add_journal_entry(entry: JournalEntry, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    entry.student_id = current_user.id
    await db.journal_entries.insert_one(entry.dict())
    return entry

@api_router.post("/student/nutrition")
async def add_nutrition_log(log: NutritionLog, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    log.student_id = current_user.id
    await db.nutrition_logs.insert_one(log.dict())
    return log

@api_router.post("/student/life-skills")
async def add_life_skill_task(task: LifeSkillTask, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    task.student_id = current_user.id
    await db.life_skill_tasks.insert_one(task.dict())
    return task

@api_router.put("/student/life-skills/{task_id}/complete")
async def complete_life_skill_task(task_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.life_skill_tasks.update_one(
        {"id": task_id, "student_id": current_user.id},
        {"$set": {"completed": True, "completion_date": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task completed successfully"}

# Demo data route (enhanced)
@api_router.post("/demo/cleanup")
async def cleanup_demo_data():
    """Clean up existing demo data"""
    try:
        # Remove existing demo user and related data
        await db.users.delete_many({"email": "student@demo.com"})
        await db.user_profiles.delete_many({})
        await db.balanc_edd_plans.delete_many({})
        await db.progress_entries.delete_many({})
        await db.journal_entries.delete_many({})
        await db.nutrition_logs.delete_many({})
        await db.life_skill_tasks.delete_many({})
        await db.personalized_recommendations.delete_many({})
        await db.brain_training_results.delete_many({})
        await db.trade_progress.delete_many({})
        await db.language_progress.delete_many({})
        await db.asvab_results.delete_many({})
        return {"message": "Demo data cleaned up successfully"}
    except Exception as e:
        return {"message": f"Cleanup completed with warnings: {str(e)}"}

@api_router.post("/demo/setup")
async def setup_demo_data():
    # Generate all learning modules
    await generate_brain_training_exercises()
    await generate_trade_modules()
    await generate_language_lessons()
    await generate_asvab_modules()
    
    # Create a demo student with enhanced features
    demo_user = {
        "id": str(uuid.uuid4()),
        "email": "student@demo.com",
        "name": "Alex Johnson",
        "role": "student",
        "institution_id": "demo_institution",
        "created_at": datetime.utcnow(),
        "is_active": True,
        "onboarding_completed": True,
        "brain_training_level": 3,
        "trade_pathway": "technology",
        "certification_progress": 45,
        "language_streak": 7,
        "asvab_progress": {
            "general_science": 78,
            "arithmetic_reasoning": 82,
            "word_knowledge": 75,
            "mathematics_knowledge": 80
        },
        "location": "Metro City",
        "hashed_password": get_password_hash("demo123")
    }
    
    await db.users.insert_one(demo_user)
    
    # Create demo language progress
    demo_language_progress = [
        {
            "id": str(uuid.uuid4()),
            "user_id": demo_user["id"],
            "language": "spanish",
            "level": 2,
            "unit": 3,
            "total_points": 156,
            "streak_count": 7,
            "lessons_completed": 12,
            "last_practice": datetime.utcnow() - timedelta(hours=2)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": demo_user["id"],
            "language": "french",
            "level": 1,
            "unit": 2,
            "total_points": 84,
            "streak_count": 3,
            "lessons_completed": 6,
            "last_practice": datetime.utcnow() - timedelta(days=2)
        }
    ]
    
    await db.language_progress.insert_many(demo_language_progress)
    
    # Create demo ASVAB results
    demo_asvab_results = [
        {
            "id": str(uuid.uuid4()),
            "user_id": demo_user["id"],
            "subject": "general_science",
            "score": 78,
            "time_taken": 23,
            "correct_answers": 15,
            "total_questions": 20,
            "percentile": 78,
            "completed_at": datetime.utcnow() - timedelta(days=5)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": demo_user["id"],
            "subject": "arithmetic_reasoning",
            "score": 82,
            "time_taken": 28,
            "correct_answers": 16,
            "total_questions": 20,
            "percentile": 82,
            "completed_at": datetime.utcnow() - timedelta(days=3)
        }
    ]
    
    await db.asvab_results.insert_many(demo_asvab_results)
    
    # Create demo career assessment
    demo_career_assessment = {
        "id": str(uuid.uuid4()),
        "user_id": demo_user["id"],
        "assessment_type": "comprehensive",
        "interests": ["technology", "problem_solving", "helping_people"],
        "aptitudes": ["logical_thinking", "technology", "communication"],
        "personality_traits": ["analytical", "team_oriented", "detail_oriented"],
        "work_preferences": ["office_environment", "flexible_hours"],
        "results": {
            "trade_recommendations": [
                ["information_technology", 95],
                ["electronics", 85],
                ["healthcare", 75]
            ],
            "military_branches": [
                ["air_force", 95],
                ["space_force", 90],
                ["navy", 85]
            ],
            "military_specialties": [
                {"branch": "air_force", "mos": "3D1X2", "title": "Cyber Transport Systems", "score": 95},
                {"branch": "army", "mos": "25B", "title": "Information Technology Specialist", "score": 90}
            ]
        },
        "recommendations": [],
        "completed_at": datetime.utcnow() - timedelta(days=7)
    }
    
    await db.career_assessments.insert_one(demo_career_assessment)
    
    # Create existing demo data (profile, plan, etc.)
    demo_profile = {
        "id": str(uuid.uuid4()),
        "user_id": demo_user["id"],
        "grade_level": "11th Grade",
        "academic_strengths": ["Science", "Technology", "Mathematics"],
        "academic_challenges": ["English/Language Arts", "History"],
        "learning_style": "visual",
        "primary_goals": ["Prepare for future career", "Improve academic performance", "Develop life skills"],
        "motivation_factors": ["Achieving personal goals", "Learning new things"],
        "preferred_activities": ["Interactive exercises", "Visual learning", "Technology-based"],
        "wellness_focus_areas": ["Stress management", "Building self-confidence"],
        "stress_management_preferences": ["Deep breathing", "Physical activity"],
        "mood_tracking_interest": 8,
        "dietary_restrictions": ["No restrictions"],
        "nutrition_knowledge_level": "intermediate",
        "meal_prep_interest": 6,
        "life_skills_priorities": ["Financial literacy", "Time management", "Career preparation", "Technology skills"],
        "independence_level": "medium",
        "career_interests": ["Technology", "Science", "Healthcare"],
        "communication_style": "encouraging",
        "reminder_frequency": "daily",
        "challenge_level_preference": "moderate",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.user_profiles.insert_one(demo_profile)
    
    # Create enhanced personalized plan
    demo_plan = {
        "id": str(uuid.uuid4()),
        "student_id": demo_user["id"],
        "title": "Alex's Comprehensive Career Prep Journey",
        "description": "A multi-faceted development plan integrating academic excellence, career preparation, and military readiness",
        "academic_goals": [
            "Master ASVAB preparation across all subjects",
            "Complete technology certification pathway",
            "Achieve fluency in Spanish for career enhancement",
            "Improve English comprehension through ASVAB practice"
        ],
        "wellness_goals": [
            "Develop daily stress management techniques",
            "Participate in study group collaborations",
            "Build leadership skills for military preparation",
            "Maintain physical fitness for service readiness"
        ],
        "nutrition_goals": [
            "Maintain balanced nutrition for optimal performance",
            "Learn meal planning for independent living",
            "Track nutrition for physical fitness goals"
        ],
        "life_skills_goals": [
            "Master personal budgeting and financial planning",
            "Complete technology certification with 80% proficiency",
            "Develop effective time management and study habits",
            "Build communication skills for leadership roles"
        ],
        "personalized": True,
        "customization_reasons": [
            "Tailored for visual learning style and technology interests",
            "Focused on military and college career preparation",
            "Integrated ASVAB preparation for military readiness",
            "Includes language learning for career competitiveness"
        ],
        "created_at": datetime.utcnow(),
        "created_by": "adaptive_system"
    }
    
    await db.balanc_edd_plans.insert_one(demo_plan)
    
    return {"message": "Comprehensive demo data with language learning, ASVAB, and career assessment created successfully", "demo_user": convert_objectid(demo_user)}

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