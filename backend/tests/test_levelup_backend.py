"""LevelUp backend test suite (pytest).

Covers:
- /api/health, /api/ready, /api/config
- Premium gating (402) on AI endpoints
- AI Food Scan with real JPEG image
- AI Plan generation (bodyweight safety, ai/fallback source)
- Negative cases: non-image content-type, empty file
"""
import io
import os
import random

import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL must be set")

API = f"{BASE_URL}/api"
PRO_HEADER = {"x-app-user-id": "pro"}
TIMEOUT = 90  # AI calls can be slow


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def jpeg_food_image_bytes() -> bytes:
    """Generate a JPEG with real visual features (food-like shapes/colors)."""
    random.seed(42)
    img = Image.new("RGB", (512, 512), (245, 222, 179))  # wheat plate
    d = ImageDraw.Draw(img)
    # Plate
    d.ellipse((40, 40, 472, 472), fill=(250, 245, 230), outline=(120, 100, 80), width=4)
    # "Burger bun" top
    d.ellipse((140, 120, 372, 280), fill=(205, 133, 63), outline=(101, 67, 33), width=3)
    # "Lettuce"
    d.ellipse((130, 240, 382, 300), fill=(34, 139, 34), outline=(0, 100, 0), width=2)
    # "Cheese"
    d.rectangle((150, 285, 360, 320), fill=(255, 215, 0), outline=(184, 134, 11), width=2)
    # "Patty"
    d.ellipse((150, 305, 362, 380), fill=(101, 67, 33), outline=(60, 30, 10), width=3)
    # "Bun bottom"
    d.ellipse((150, 360, 362, 430), fill=(210, 140, 70), outline=(101, 67, 33), width=3)
    # Sesame seeds
    for _ in range(40):
        x = random.randint(160, 350)
        y = random.randint(135, 200)
        d.ellipse((x, y, x + 6, y + 4), fill=(255, 248, 220))
    # Fries on side
    for i in range(10):
        x = 380 + (i % 3) * 20
        y = 120 + (i // 3) * 30
        d.rectangle((x, y, x + 12, y + 80), fill=(255, 200, 80), outline=(180, 130, 30), width=1)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ---------- Health / Ready / Config ----------
class TestSystem:
    def test_health(self, session):
        r = session.get(f"{API}/health", timeout=10)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["status"] == "ok"
        assert "timestamp" in j

    def test_ready(self, session):
        r = session.get(f"{API}/ready", timeout=10)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("status") == "ready"
        assert j.get("db") == "ok"

    def test_config(self, session):
        r = session.get(f"{API}/config", timeout=10)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["appName"] == "LevelUp"
        assert isinstance(j["ranks"], list) and len(j["ranks"]) == 6
        codes = [x["code"] for x in j["ranks"]]
        assert codes == ["E", "D", "C", "B", "A", "S"]
        assert isinstance(j["products"], list) and len(j["products"]) == 2
        ids = [p["id"] for p in j["products"]]
        assert "com.levelup.pro.monthly" in ids
        assert "com.levelup.pro.annual" in ids
        assert j["aiModel"] == "openai:gpt-4o"


# ---------- Premium gating ----------
class TestPremiumGating:
    def test_food_scan_requires_pro(self, session, jpeg_food_image_bytes):
        files = {"image": ("meal.jpg", jpeg_food_image_bytes, "image/jpeg")}
        data = {"mealType": "lunch"}
        r = session.post(f"{API}/nutrition/analyze-image", files=files, data=data, timeout=30)
        assert r.status_code == 402, r.text
        j = r.json()
        assert j["detail"]["code"] == "premium_required"

    def test_plan_requires_pro(self, session):
        payload = {
            "goal": "Build Muscle",
            "rank": "E",
            "equipment": ["Bodyweight only"],
            "daysPerWeek": 4,
            "sessionLength": 45,
        }
        r = session.post(f"{API}/plans/generate", json=payload, timeout=30)
        assert r.status_code == 402, r.text
        j = r.json()
        assert j["detail"]["code"] == "premium_required"


# ---------- Negative validation ----------
class TestImageValidation:
    def test_non_image_content_type(self, session):
        files = {"image": ("note.txt", b"hello world", "text/plain")}
        r = session.post(
            f"{API}/nutrition/analyze-image",
            files=files,
            data={"mealType": "snack"},
            headers=PRO_HEADER,
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_empty_file(self, session):
        files = {"image": ("empty.jpg", b"", "image/jpeg")}
        r = session.post(
            f"{API}/nutrition/analyze-image",
            files=files,
            data={"mealType": "snack"},
            headers=PRO_HEADER,
            timeout=15,
        )
        assert r.status_code == 400, r.text


# ---------- AI Food Scan (real call) ----------
class TestFoodScanAI:
    def test_analyze_image_pro(self, session, jpeg_food_image_bytes):
        files = {"image": ("meal.jpg", jpeg_food_image_bytes, "image/jpeg")}
        data = {"mealType": "lunch"}
        r = session.post(
            f"{API}/nutrition/analyze-image",
            files=files,
            data=data,
            headers=PRO_HEADER,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        j = r.json()
        # Schema validation
        for k in ["items", "calories", "protein", "carbs", "fat", "servingEstimate", "confidence", "disclaimer"]:
            assert k in j, f"missing key {k} in {j}"
        assert isinstance(j["items"], list) and len(j["items"]) >= 1
        assert isinstance(j["calories"], int)
        assert isinstance(j["protein"], int)
        assert isinstance(j["carbs"], int)
        assert isinstance(j["fat"], int)
        assert isinstance(j["servingEstimate"], str)
        assert 0.0 <= float(j["confidence"]) <= 1.0
        assert j["disclaimer"] == "Estimate only. Confirm before logging."


# ---------- AI Plan Generation ----------
class TestPlanAI:
    def test_plan_bodyweight_safety(self, session):
        payload = {
            "goal": "Build Muscle",
            "rank": "E",
            "equipment": ["Bodyweight only"],
            "daysPerWeek": 4,
            "sessionLength": 45,
            "movementLiteracy": {"squat": "beginner"},
            "nutritionTargets": {"calories": 2400, "protein": 150},
            "recentCompletions": [],
        }
        r = session.post(
            f"{API}/plans/generate",
            json=payload,
            headers=PRO_HEADER,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["source"] in ("ai", "fallback"), j
        plan = j["plan"]
        assert plan["days"] and len(plan["days"]) >= 1
        forbidden = ["barbell", "machine", "smith", "cable", "leg press"]
        for d in plan["days"]:
            assert d["exercises"], "exercises non-empty"
            for ex in d["exercises"]:
                low = ex["name"].lower()
                for tok in forbidden:
                    assert tok not in low, (
                        f"Forbidden token '{tok}' in '{ex['name']}' for bodyweight plan; "
                        f"source={j['source']}"
                    )

    def test_plan_full_gym_ok(self, session):
        payload = {
            "goal": "Build Muscle",
            "rank": "C",
            "equipment": ["Full gym"],
            "daysPerWeek": 4,
            "sessionLength": 60,
        }
        r = session.post(
            f"{API}/plans/generate",
            json=payload,
            headers=PRO_HEADER,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["source"] in ("ai", "fallback")
        plan = j["plan"]
        assert plan["daysPerWeek"] >= 3
        assert plan["days"]
