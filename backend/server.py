from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

# Enhanced Models for Adaptive Learning
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str = "student"
    institution_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    onboarding_completed: bool = False

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    # Academic Information
    grade_level: Optional[str] = None
    academic_strengths: List[str] = []
    academic_challenges: List[str] = []
    learning_style: Optional[str] = None  # "visual", "auditory", "kinesthetic", "reading"
    
    # Goals and Motivations
    primary_goals: List[str] = []
    motivation_factors: List[str] = []
    preferred_activities: List[str] = []
    
    # Wellness Information
    wellness_focus_areas: List[str] = []
    stress_management_preferences: List[str] = []
    mood_tracking_interest: int = 5  # 1-10 scale
    
    # Nutrition Information
    dietary_restrictions: List[str] = []
    nutrition_knowledge_level: Optional[str] = None  # "beginner", "intermediate", "advanced"
    meal_prep_interest: int = 5  # 1-10 scale
    
    # Life Skills Priorities
    life_skills_priorities: List[str] = []
    independence_level: Optional[str] = None  # "low", "medium", "high"
    career_interests: List[str] = []
    
    # Preferences
    communication_style: Optional[str] = None  # "formal", "casual", "encouraging"
    reminder_frequency: Optional[str] = None  # "daily", "weekly", "as_needed"
    challenge_level_preference: Optional[str] = None  # "easy", "moderate", "challenging"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AdaptiveSurveyResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    question_id: str
    question_text: str
    response: Any  # Can be string, number, list, etc.
    response_timestamp: datetime = Field(default_factory=datetime.utcnow)

class PersonalizedRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str  # "academic", "wellness", "nutrition", "life_skills"
    recommendation_type: str  # "goal", "activity", "resource", "tip"
    title: str
    description: str
    priority: int = 1  # 1-5 scale
    personalization_reasons: List[str] = []  # Why this was recommended
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

# Adaptive Learning Functions
async def generate_personalized_recommendations(user_id: str, profile: UserProfile):
    """Generate personalized recommendations based on user profile"""
    recommendations = []
    
    # Academic recommendations
    if "mathematics" in profile.academic_challenges:
        recommendations.append({
            "category": "academic",
            "recommendation_type": "resource",
            "title": "Interactive Math Practice",
            "description": "Visual math exercises tailored for your learning style",
            "priority": 4,
            "personalization_reasons": ["Identified math as challenge area", f"Matches {profile.learning_style} learning style"]
        })
    
    # Wellness recommendations
    if profile.mood_tracking_interest >= 7:
        recommendations.append({
            "category": "wellness",
            "recommendation_type": "activity",
            "title": "Advanced Mood Journaling",
            "description": "Deep reflection exercises with mood pattern analysis",
            "priority": 5,
            "personalization_reasons": ["High interest in mood tracking", "Advanced wellness engagement"]
        })
    
    # Nutrition recommendations
    if profile.nutrition_knowledge_level == "beginner":
        recommendations.append({
            "category": "nutrition",
            "recommendation_type": "goal",
            "title": "Nutrition Basics Journey",
            "description": "Start with fundamental nutrition principles and food groups",
            "priority": 4,
            "personalization_reasons": ["Beginner nutrition level", "Foundation building needed"]
        })
    
    # Life skills recommendations
    if "financial_literacy" in profile.life_skills_priorities:
        recommendations.append({
            "category": "life_skills",
            "recommendation_type": "activity",
            "title": "Personal Budgeting Challenge",
            "description": "Learn to create and manage a personal budget",
            "priority": 5,
            "personalization_reasons": ["High priority on financial literacy", "Practical life skill focus"]
        })
    
    # Store recommendations
    for rec_data in recommendations:
        rec_data["user_id"] = user_id
        rec_obj = PersonalizedRecommendation(**rec_data)
        await db.personalized_recommendations.insert_one(rec_obj.dict())
    
    return recommendations

async def create_personalized_plan(user_id: str, profile: UserProfile):
    """Create a personalized BalancEDD plan based on user profile"""
    
    # Academic goals based on profile
    academic_goals = []
    if "mathematics" in profile.academic_challenges:
        academic_goals.append("Master fundamental math concepts through visual learning")
    if "reading" in profile.academic_challenges:
        academic_goals.append("Improve reading comprehension with interactive exercises")
    if not academic_goals:
        academic_goals = ["Maintain academic excellence", "Explore new subjects of interest"]
    
    # Wellness goals
    wellness_goals = []
    if "stress_management" in profile.wellness_focus_areas:
        wellness_goals.append("Develop daily stress management techniques")
    if "emotional_regulation" in profile.wellness_focus_areas:
        wellness_goals.append("Practice emotional awareness and regulation")
    if profile.mood_tracking_interest >= 7:
        wellness_goals.append("Maintain consistent mood tracking and reflection")
    if not wellness_goals:
        wellness_goals = ["Practice daily mindfulness", "Build emotional awareness"]
    
    # Nutrition goals
    nutrition_goals = []
    if profile.nutrition_knowledge_level == "beginner":
        nutrition_goals.append("Learn basic nutrition principles")
        nutrition_goals.append("Identify healthy food choices")
    elif profile.meal_prep_interest >= 7:
        nutrition_goals.append("Master meal planning and preparation")
    if "weight_management" in profile.wellness_focus_areas:
        nutrition_goals.append("Develop sustainable eating habits")
    if not nutrition_goals:
        nutrition_goals = ["Track daily nutrition", "Maintain balanced meals"]
    
    # Life skills goals
    life_skills_goals = []
    for priority in profile.life_skills_priorities:
        if priority == "financial_literacy":
            life_skills_goals.append("Master personal budgeting and money management")
        elif priority == "time_management":
            life_skills_goals.append("Develop effective time management skills")
        elif priority == "communication":
            life_skills_goals.append("Improve interpersonal communication skills")
        elif priority == "career_preparation":
            life_skills_goals.append("Explore career paths and build relevant skills")
    
    if not life_skills_goals:
        life_skills_goals = ["Complete essential life skills modules", "Build independence"]
    
    # Create personalized plan
    plan = BalancEDDPlan(
        student_id=user_id,
        title=f"{profile.user_id.split('-')[0]}'s Personalized BalancEDD Journey",
        description="A customized development plan based on your unique goals, interests, and learning style",
        academic_goals=academic_goals,
        wellness_goals=wellness_goals,
        nutrition_goals=nutrition_goals,
        life_skills_goals=life_skills_goals,
        personalized=True,
        customization_reasons=[
            f"Tailored for {profile.learning_style} learning style",
            f"Focused on {', '.join(profile.primary_goals[:2])} goals",
            f"Addresses {', '.join(profile.academic_challenges[:2])} challenges"
        ],
        created_by="adaptive_system"
    )
    
    await db.balanc_edd_plans.insert_one(plan.dict())
    return plan

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
        "onboarding_completed": bool(user_data.profile_data)
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
        
        # Generate personalized recommendations and plan
        await generate_personalized_recommendations(user_obj.id, profile_obj)
        await create_personalized_plan(user_obj.id, profile_obj)
    
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
            "life_skills_total": len(life_skills)
        },
        "recent_progress": recent_progress,
        "recent_journals": recent_journals,
        "recent_nutrition": recent_nutrition,
        "life_skills": life_skills
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
        await db.user_profiles.delete_many({"user_id": {"$regex": ".*"}})
        await db.balanc_edd_plans.delete_many({"student_id": {"$regex": ".*"}})
        await db.progress_entries.delete_many({"student_id": {"$regex": ".*"}})
        await db.journal_entries.delete_many({"student_id": {"$regex": ".*"}})
        await db.nutrition_logs.delete_many({"student_id": {"$regex": ".*"}})
        await db.life_skill_tasks.delete_many({"student_id": {"$regex": ".*"}})
        await db.personalized_recommendations.delete_many({"user_id": {"$regex": ".*"}})
        return {"message": "Demo data cleaned up successfully"}
    except Exception as e:
        return {"message": f"Cleanup completed with warnings: {str(e)}"}

@api_router.post("/demo/setup")
async def setup_demo_data():
    # Create a demo student
    demo_user = {
        "id": str(uuid.uuid4()),
        "email": "student@demo.com",
        "name": "Alex Johnson",
        "role": "student",
        "institution_id": "demo_institution",
        "created_at": datetime.utcnow(),
        "is_active": True,
        "onboarding_completed": True,
        "hashed_password": get_password_hash("demo123")
    }
    
    await db.users.insert_one(demo_user)
    
    # Create demo profile
    demo_profile = {
        "id": str(uuid.uuid4()),
        "user_id": demo_user["id"],
        "grade_level": "10th Grade",
        "academic_strengths": ["Science", "Technology"],
        "academic_challenges": ["Mathematics", "English/Language Arts"],
        "learning_style": "visual",
        "primary_goals": ["Improve academic performance", "Build confidence", "Develop life skills"],
        "motivation_factors": ["Achieving personal goals", "Learning new things"],
        "preferred_activities": ["Interactive exercises", "Visual learning", "Technology-based"],
        "wellness_focus_areas": ["Stress management", "Building self-confidence"],
        "stress_management_preferences": ["Deep breathing", "Physical activity"],
        "mood_tracking_interest": 8,
        "dietary_restrictions": ["No restrictions"],
        "nutrition_knowledge_level": "intermediate",
        "meal_prep_interest": 6,
        "life_skills_priorities": ["Financial literacy", "Time management", "Career preparation"],
        "independence_level": "medium",
        "career_interests": ["Technology", "Science"],
        "communication_style": "encouraging",
        "reminder_frequency": "daily",
        "challenge_level_preference": "moderate",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.user_profiles.insert_one(demo_profile)
    
    # Create personalized plan
    demo_plan = {
        "id": str(uuid.uuid4()),
        "student_id": demo_user["id"],
        "title": "Alex's Personalized BalancEDD Journey",
        "description": "A customized development plan based on your visual learning style and focus on academic improvement",
        "academic_goals": [
            "Master fundamental math concepts through visual learning",
            "Improve English comprehension with interactive exercises",
            "Leverage science strengths for cross-subject learning"
        ],
        "wellness_goals": [
            "Develop daily stress management techniques",
            "Build self-confidence through achievement tracking",
            "Practice emotional awareness and regulation"
        ],
        "nutrition_goals": [
            "Maintain balanced nutrition knowledge",
            "Explore meal planning strategies",
            "Track nutrition for performance optimization"
        ],
        "life_skills_goals": [
            "Master personal budgeting and money management",
            "Develop effective time management skills",
            "Explore technology career preparation"
        ],
        "personalized": True,
        "customization_reasons": [
            "Tailored for visual learning style",
            "Focused on academic improvement and confidence building goals",
            "Addresses mathematics and English challenges"
        ],
        "created_at": datetime.utcnow(),
        "created_by": "adaptive_system"
    }
    
    await db.balanc_edd_plans.insert_one(demo_plan)
    
    # Create personalized recommendations
    demo_recommendations = [
        {
            "id": str(uuid.uuid4()),
            "user_id": demo_user["id"],
            "category": "academic",
            "recommendation_type": "resource",
            "title": "Visual Math Learning Hub",
            "description": "Interactive visual exercises specifically designed for math concepts",
            "priority": 5,
            "personalization_reasons": ["Visual learning style", "Math identified as challenge area"],
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": demo_user["id"],
            "category": "wellness",
            "recommendation_type": "activity",
            "title": "Confidence Building Tracker",
            "description": "Daily activities to build self-confidence through small wins",
            "priority": 4,
            "personalization_reasons": ["Building confidence goal", "Moderate challenge preference"],
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": demo_user["id"],
            "category": "life_skills",
            "recommendation_type": "goal",
            "title": "Teen Financial Literacy Program",
            "description": "Comprehensive budgeting and money management for teens",
            "priority": 5,
            "personalization_reasons": ["Financial literacy priority", "Career preparation focus"],
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.personalized_recommendations.insert_many(demo_recommendations)
    
    # Create demo progress entries
    demo_progress = [
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "category": "academic",
            "type": "module_completion",
            "title": "Visual Math Module 2 Completed",
            "description": "Successfully completed algebra fundamentals using visual methods",
            "value": {"score": 85, "time_spent": 120, "method": "visual"},
            "date": datetime.utcnow() - timedelta(days=2)
        },
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "category": "wellness",
            "type": "confidence_building",
            "title": "Daily Confidence Check-in",
            "description": "Completed confidence building activity",
            "value": {"confidence_level": 7, "achievement": "Presented in class"},
            "date": datetime.utcnow() - timedelta(days=1)
        }
    ]
    
    await db.progress_entries.insert_many(demo_progress)
    
    # Create demo journal entries
    demo_journals = [
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "mood_rating": 7,
            "content": "Today was a good day. The visual math exercises really helped me understand the concepts better. I feel more confident about tomorrow's test.",
            "tags": ["positive", "academic", "confidence", "visual-learning"],
            "date": datetime.utcnow() - timedelta(days=1)
        }
    ]
    
    await db.journal_entries.insert_many(demo_journals)
    
    # Create demo life skills tasks
    demo_life_skills = [
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "skill_category": "financial_literacy",
            "task_name": "Create Personal Budget",
            "description": "Learn to create and manage a monthly budget",
            "completed": True,
            "completion_date": datetime.utcnow() - timedelta(days=5),
            "notes": "Great exercise! Really helped me understand money management",
            "difficulty_level": "moderate",
            "personalized": True
        },
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "skill_category": "time_management",
            "task_name": "Time Blocking Technique",
            "description": "Learn to organize your day using time blocking",
            "completed": False,
            "completion_date": None,
            "notes": "Scheduled for next week",
            "difficulty_level": "moderate",
            "personalized": True
        },
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "skill_category": "career_preparation",
            "task_name": "Technology Career Exploration",
            "description": "Research different technology career paths",
            "completed": False,
            "completion_date": None,
            "notes": "Looking forward to this!",
            "difficulty_level": "moderate",
            "personalized": True
        }
    ]
    
    await db.life_skill_tasks.insert_many(demo_life_skills)
    
    return {"message": "Enhanced demo data created successfully", "demo_user": convert_objectid(demo_user)}

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