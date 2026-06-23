"""LevelUp backend — System health, AI Food Scan, AI Plan Generation."""

import base64
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import (
    ImageContent,
    LlmChat,
    UserMessage,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config -------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
AI_MODEL_PROVIDER = "openai"
AI_MODEL_NAME = "gpt-4o"  # vision-capable

# Pro entitlement gate. In production this is replaced with RevenueCat
# entitlement lookup via x-app-user-id. For preview we accept a header
# value of "pro" to simulate an active entitlement; otherwise gate.
PREVIEW_PRO_HEADER = "pro"

ACCEPTED_IMAGE_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB

# --- DB ----------------------------------------------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# --- App ---------------------------------------------------------------
app = FastAPI(title="LevelUp API")
api = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("levelup")


# ====================== Models =========================================
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"


class ConfigResponse(BaseModel):
    appName: str = "LevelUp"
    ranks: List[Dict[str, Any]]
    xpMultipliers: Dict[str, float]
    products: List[Dict[str, Any]]
    aiModel: str
    disclaimers: Dict[str, str]


class NutritionEstimate(BaseModel):
    items: List[str]
    calories: int
    protein: int
    carbs: int
    fat: int
    servingEstimate: str
    confidence: float
    disclaimer: str = "Estimate only. Confirm before logging."


class Exercise(BaseModel):
    name: str
    sets: int
    reps: str
    rest: str
    cue: str


class WorkoutDay(BaseModel):
    day: int
    focus: str
    warmup: List[str]
    exercises: List[Exercise]


class WorkoutPlan(BaseModel):
    goal: str
    rank: str
    daysPerWeek: int
    sessionLength: int
    deloadEvery: int = 4
    notes: str
    days: List[WorkoutDay]


class PlanRequest(BaseModel):
    goal: str
    rank: str
    equipment: List[str]
    daysPerWeek: int
    sessionLength: int
    movementLiteracy: Dict[str, str] = Field(default_factory=dict)
    nutritionTargets: Dict[str, int] = Field(default_factory=dict)
    recentCompletions: List[str] = Field(default_factory=list)


# ====================== Helpers ========================================
def _check_pro(app_user_id: Optional[str]) -> None:
    """Preview entitlement: x-app-user-id == 'pro' grants premium."""
    if app_user_id != PREVIEW_PRO_HEADER:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "premium_required",
                "message": "Upgrade to LevelUp Pro to use this feature.",
            },
        )


def _parse_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """LLMs sometimes wrap JSON in markdown fences or prose. Strip and parse."""
    if not text:
        return None
    text = text.strip()
    # try direct parse first
    try:
        return json.loads(text)
    except Exception:
        pass
    # extract fenced code block
    fence = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1))
        except Exception:
            pass
    # find first {...} block
    brace = re.search(r"(\{.*\})", text, re.DOTALL)
    if brace:
        try:
            return json.loads(brace.group(1))
        except Exception:
            pass
    return None


def _deterministic_plan(req: PlanRequest) -> WorkoutPlan:
    """Conservative, equipment-aware fallback plan."""
    eq = set(e.lower() for e in req.equipment)
    has_db = "dumbbells" in eq or "full gym" in eq
    has_gym = "full gym" in eq
    days = max(3, min(req.daysPerWeek, 6))
    rank_letter = (req.rank or "E").upper()[0]
    advanced = rank_letter in {"C", "B", "A", "S"}

    def ex(name, sets, reps, rest, cue):
        return Exercise(name=name, sets=sets, reps=reps, rest=rest, cue=cue)

    pool_lower = (
        [ex("Goblet Squat", 4, "8-10", "90s", "Tall chest, knees track over toes")]
        if has_db
        else [ex("Bodyweight Squat", 4, "12-15", "60s", "Slow eccentric, full depth")]
    )
    pool_push = (
        [ex("DB Bench Press", 4, "8-10", "90s", "Tuck elbows ~45°")]
        if has_db
        else [ex("Push-Up", 4, "AMRAP", "75s", "Plank line, full ROM")]
    )
    pool_pull = (
        [ex("Pull-Up", 4, "AMRAP", "90s", "Full hang, chin over bar")]
        if has_gym
        else [ex("Inverted Row", 4, "8-12", "75s", "Squeeze shoulder blades")]
    )
    pool_hinge = (
        [ex("Romanian Deadlift", 4, "8-10", "90s", "Hips back, neutral spine")]
        if has_db
        else [ex("Single-Leg RDL", 4, "8/side", "60s", "Slow & controlled hinge")]
    )

    plan_days: List[WorkoutDay] = []
    splits = ["Lower Strength", "Upper Push", "Lower Hinge", "Upper Pull", "Full Body", "Conditioning"]
    for i in range(days):
        focus = splits[i % len(splits)]
        exercises = []
        if "Lower Strength" in focus:
            exercises = pool_lower + pool_hinge
        elif "Lower Hinge" in focus:
            exercises = pool_hinge + pool_lower
        elif "Upper Push" in focus:
            exercises = pool_push
        elif "Upper Pull" in focus:
            exercises = pool_pull
        elif "Full Body" in focus:
            exercises = pool_lower[:1] + pool_push[:1] + pool_pull[:1]
        else:
            exercises = [ex("Z2 Cardio", 1, "20-30 min", "—", "Nasal-breathing pace")]

        if advanced:
            for e in exercises:
                e.cue = f"{e.cue} • RPE 7-8, tempo 3-1-1"

        plan_days.append(
            WorkoutDay(
                day=i + 1,
                focus=focus,
                warmup=[
                    "5 min general (bike/jog/jump rope)",
                    "World's greatest stretch x 5/side",
                    "2 activation sets at 50-60% load",
                ],
                exercises=exercises,
            )
        )

    return WorkoutPlan(
        goal=req.goal,
        rank=req.rank,
        daysPerWeek=days,
        sessionLength=req.sessionLength,
        deloadEvery=4,
        notes="Double progression. Deload every 4th week. Movement-literacy safe.",
        days=plan_days,
    )


def _validate_plan_payload(payload: Any, req: PlanRequest) -> Optional[WorkoutPlan]:
    if not isinstance(payload, dict):
        return None
    try:
        plan = WorkoutPlan(**payload)
    except Exception as e:
        logger.warning("Plan validation failed: %s", e)
        return None
    if not plan.days or len(plan.days) < 1:
        return None
    for d in plan.days:
        if not d.exercises:
            return None
    # equipment safety: if user has only bodyweight, reject barbells/machines
    eq = set(e.lower() for e in req.equipment)
    bodyweight_only = eq == {"bodyweight only"} or eq == {"bodyweight"}
    if bodyweight_only:
        forbidden = ["barbell", "machine", "smith", "cable", "leg press"]
        for d in plan.days:
            for e in d.exercises:
                low = e.name.lower()
                if any(tok in low for tok in forbidden):
                    return None
    return plan


# ====================== Endpoints ======================================
@api.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", timestamp=datetime.now(timezone.utc))


@api.get("/ready")
async def ready():
    try:
        await db.command("ping")
        return {"status": "ready", "db": "ok"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "degraded", "error": str(e)})


@api.get("/config", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        ranks=[
            {"code": "E", "name": "Awakened", "min": 0, "max": 999},
            {"code": "D", "name": "Iron Hunter", "min": 1000, "max": 2999},
            {"code": "C", "name": "Steel Hunter", "min": 3000, "max": 5999},
            {"code": "B", "name": "Void Hunter", "min": 6000, "max": 9999},
            {"code": "A", "name": "Elite Hunter", "min": 10000, "max": 19999},
            {"code": "S", "name": "Apex Hunter", "min": 20000, "max": 10**9},
        ],
        xpMultipliers={"E": 1.0, "D": 1.25, "C": 1.5, "B": 1.75, "A": 2.0, "S": 2.5},
        products=[
            {"id": "com.levelup.pro.monthly", "price": "$4.99", "period": "month"},
            {
                "id": "com.levelup.pro.annual",
                "price": "$39.99",
                "period": "year",
                "trialDays": 7,
            },
        ],
        aiModel=f"{AI_MODEL_PROVIDER}:{AI_MODEL_NAME}",
        disclaimers={
            "foodScan": "Estimate only. Confirm before logging.",
            "privacy": "AI Food Scan sends the selected image to backend for estimate; not stored by default; user confirms before logging.",
        },
    )


@api.post("/nutrition/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    mealType: str = Form("snack"),
    x_app_user_id: Optional[str] = Header(default=None, alias="x-app-user-id"),
):
    _check_pro(x_app_user_id)

    mime = (image.content_type or "").lower()
    if mime not in ACCEPTED_IMAGE_MIME:
        raise HTTPException(status_code=400, detail="Unsupported image type. Use JPEG, PNG, or WEBP.")

    raw = await image.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty image.")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 8MB).")

    b64 = base64.b64encode(raw).decode("ascii")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="AI service unavailable.")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"food-{uuid.uuid4()}",
        system_message=(
            "You are an AI Coach inside the LevelUp app. You estimate nutrition from a single "
            "photo of a meal. Return ONLY a single JSON object, no prose, no markdown fences. "
            "Schema: {\"items\":[string], \"calories\":int, \"protein\":int, \"carbs\":int, "
            "\"fat\":int, \"servingEstimate\":string, \"confidence\":float between 0 and 1}. "
            "If the photo is not a meal, set items=[\"unknown\"], all macros to 0, confidence<=0.2."
        ),
    ).with_model(AI_MODEL_PROVIDER, AI_MODEL_NAME)

    try:
        msg = UserMessage(
            text=f"Meal type: {mealType}. Estimate macros for the food in this image. Output JSON only.",
            file_contents=[ImageContent(image_base64=b64)],
        )
        result_text = await chat.send_message(msg)
    except Exception as e:
        logger.exception("AI food scan failed")
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    parsed = _parse_json_from_text(str(result_text))
    if not parsed:
        raise HTTPException(status_code=502, detail="AI returned unparseable response.")

    try:
        est = NutritionEstimate(
            items=parsed.get("items") or ["unknown"],
            calories=int(parsed.get("calories", 0)),
            protein=int(parsed.get("protein", 0)),
            carbs=int(parsed.get("carbs", 0)),
            fat=int(parsed.get("fat", 0)),
            servingEstimate=str(parsed.get("servingEstimate", "1 serving")),
            confidence=float(parsed.get("confidence", 0.5)),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI response schema invalid: {e}")

    return est.model_dump()


@api.post("/plans/generate")
async def generate_plan(
    req: PlanRequest,
    x_app_user_id: Optional[str] = Header(default=None, alias="x-app-user-id"),
):
    _check_pro(x_app_user_id)

    fallback = _deterministic_plan(req)

    if not EMERGENT_LLM_KEY:
        return {"plan": fallback.model_dump(), "source": "fallback", "reason": "ai_unavailable"}

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"plan-{uuid.uuid4()}",
        system_message=(
            "You are the LevelUp AI Coach. Generate a safe, equipment-aware training plan. "
            "Return ONLY a single JSON object, no prose, no markdown fences. "
            "Schema: {goal, rank, daysPerWeek:int, sessionLength:int, deloadEvery:int, notes, "
            "days:[{day:int, focus, warmup:[string], exercises:[{name, sets:int, reps, rest, cue}]}]}. "
            "Rules: use ONLY listed equipment; warmup = 5min general + 2 activation sets; "
            "double-progression; E/D = basic compounds + accessory; C+ = periodization, RPE, tempo; "
            "deload every 4th week."
        ),
    ).with_model(AI_MODEL_PROVIDER, AI_MODEL_NAME)

    prompt = json.dumps(req.model_dump())
    try:
        result_text = await chat.send_message(
            UserMessage(text=f"Input: {prompt}. Output JSON plan only.")
        )
        parsed = _parse_json_from_text(str(result_text))
        plan = _validate_plan_payload(parsed, req)
        if plan is None:
            return {"plan": fallback.model_dump(), "source": "fallback", "reason": "ai_invalid"}
        return {"plan": plan.model_dump(), "source": "ai"}
    except Exception as e:
        logger.exception("AI plan generation failed")
        return {"plan": fallback.model_dump(), "source": "fallback", "reason": str(e)}


# A simple ping to validate connectivity
@api.get("/")
async def root():
    return {"message": "LevelUp System online"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
