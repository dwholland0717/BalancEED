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

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str  # "student", "mentor", "admin"
    institution_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"
    institution_id: str = "default"

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str  # mentor_id

class ProgressEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    category: str  # "academic", "wellness", "nutrition", "life_skills"
    type: str  # "module_completion", "journal_entry", "meal_log", "skill_completion"
    title: str
    description: str
    value: Any  # flexible field for different data types
    date: datetime = Field(default_factory=datetime.utcnow)

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    mood_rating: int  # 1-10
    content: str
    tags: List[str] = []
    date: datetime = Field(default_factory=datetime.utcnow)

class NutritionLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    meal_type: str  # "breakfast", "lunch", "dinner", "snack"
    foods: List[str]
    calories: Optional[int] = None
    notes: str = ""
    date: datetime = Field(default_factory=datetime.utcnow)

class LifeSkillTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    skill_category: str  # "first_aid", "home_economics", "auto_mechanics", "parenting"
    task_name: str
    description: str
    completed: bool = False
    completion_date: Optional[datetime] = None
    notes: str = ""

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

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    user_obj = User(**user_dict)
    
    # Store user with hashed password
    user_db_dict = user_obj.dict()
    user_db_dict["hashed_password"] = hashed_password
    await db.users.insert_one(user_db_dict)
    
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

# Student routes
@api_router.get("/student/dashboard")
async def get_student_dashboard(current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get student's plan
    plan = await db.balanc_edd_plans.find_one({"student_id": current_user.id})
    
    # Get recent progress entries
    recent_progress = await db.progress_entries.find(
        {"student_id": current_user.id}
    ).sort("date", -1).limit(10).to_list(10)
    
    # Get recent journal entries
    recent_journals = await db.journal_entries.find(
        {"student_id": current_user.id}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Get recent nutrition logs
    recent_nutrition = await db.nutrition_logs.find(
        {"student_id": current_user.id}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Get life skills tasks
    life_skills = await db.life_skill_tasks.find(
        {"student_id": current_user.id}
    ).to_list(50)
    
    # Calculate progress stats
    total_progress = len(recent_progress)
    academic_progress = len([p for p in recent_progress if p["category"] == "academic"])
    wellness_progress = len([p for p in recent_progress if p["category"] == "wellness"])
    nutrition_progress = len([p for p in recent_progress if p["category"] == "nutrition"])
    life_skills_completed = len([ls for ls in life_skills if ls["completed"]])
    
    return {
        "user": current_user,
        "plan": plan,
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

# Demo data route
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
        "hashed_password": get_password_hash("demo123")
    }
    
    await db.users.insert_one(demo_user)
    
    # Create demo plan
    demo_plan = {
        "id": str(uuid.uuid4()),
        "student_id": demo_user["id"],
        "title": "Alex's BalancEDD Development Plan",
        "description": "Comprehensive development plan focusing on academic achievement, wellness, nutrition, and essential life skills",
        "academic_goals": [
            "Complete Math Module 3",
            "Submit English Essay",
            "Pass Science Quiz",
            "Improve Reading Comprehension"
        ],
        "wellness_goals": [
            "Daily mindfulness practice",
            "Weekly therapy sessions",
            "Stress management techniques",
            "Emotional regulation skills"
        ],
        "nutrition_goals": [
            "Track daily meals",
            "Include 5 servings of fruits/vegetables",
            "Stay hydrated",
            "Learn healthy cooking basics"
        ],
        "life_skills_goals": [
            "Complete first aid certification",
            "Learn basic auto maintenance",
            "Practice conflict resolution",
            "Develop budgeting skills"
        ],
        "created_at": datetime.utcnow(),
        "created_by": "mentor_demo"
    }
    
    await db.balanc_edd_plans.insert_one(demo_plan)
    
    # Create demo progress entries
    demo_progress = [
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "category": "academic",
            "type": "module_completion",
            "title": "Math Module 2 Completed",
            "description": "Successfully completed algebra fundamentals",
            "value": {"score": 85, "time_spent": 120},
            "date": datetime.utcnow() - timedelta(days=2)
        },
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "category": "wellness",
            "type": "journal_entry",
            "title": "Weekly Reflection",
            "description": "Processed this week's challenges and growth",
            "value": {"mood_improvement": True},
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
            "content": "Today was a good day. I completed my math assignment and felt confident about the material. Looking forward to tomorrow's challenges.",
            "tags": ["positive", "academic", "confidence"],
            "date": datetime.utcnow() - timedelta(days=1)
        }
    ]
    
    await db.journal_entries.insert_many(demo_journals)
    
    # Create demo life skills tasks
    demo_life_skills = [
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "skill_category": "first_aid",
            "task_name": "CPR Certification",
            "description": "Complete CPR training and certification",
            "completed": True,
            "completion_date": datetime.utcnow() - timedelta(days=5),
            "notes": "Passed with 95% score"
        },
        {
            "id": str(uuid.uuid4()),
            "student_id": demo_user["id"],
            "skill_category": "auto_mechanics",
            "task_name": "Change Oil",
            "description": "Learn how to change car oil",
            "completed": False,
            "completion_date": None,
            "notes": "Scheduled for next week"
        }
    ]
    
    await db.life_skill_tasks.insert_many(demo_life_skills)
    
    return {"message": "Demo data created successfully", "demo_user": demo_user}

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