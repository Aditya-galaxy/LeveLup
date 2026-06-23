"""Tests for LevelUp domain logic."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient
from backend.server import app, _deterministic_plan, _validate_plan_payload, PlanRequest

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_config():
    r = client.get("/api/config")
    j = r.json()
    assert len(j["ranks"]) == 6
    assert j["xpMultipliers"]["S"] == 2.5


def test_premium_gate_food():
    # no x-app-user-id => 402
    r = client.post(
        "/api/nutrition/analyze-image",
        files={"image": ("a.jpg", b"x", "image/jpeg")},
        data={"mealType": "snack"},
    )
    assert r.status_code == 402
    assert r.json()["detail"]["code"] == "premium_required"


def test_premium_gate_plan():
    r = client.post("/api/plans/generate", json={
        "goal": "Build Muscle", "rank": "E", "equipment": ["Bodyweight only"],
        "daysPerWeek": 4, "sessionLength": 45
    })
    assert r.status_code == 402


def test_deterministic_plan_bodyweight():
    req = PlanRequest(goal="Build Muscle", rank="E",
                      equipment=["Bodyweight only"], daysPerWeek=4, sessionLength=45)
    plan = _deterministic_plan(req)
    assert plan.daysPerWeek == 4
    assert len(plan.days) == 4
    # bodyweight only: should not include barbell
    for d in plan.days:
        for e in d.exercises:
            assert "barbell" not in e.name.lower()


def test_plan_validator_rejects_barbell_for_bodyweight():
    req = PlanRequest(goal="Build Muscle", rank="E",
                      equipment=["Bodyweight only"], daysPerWeek=3, sessionLength=45)
    bad = {
        "goal": "Build Muscle", "rank": "E", "daysPerWeek": 3,
        "sessionLength": 45, "deloadEvery": 4, "notes": "x",
        "days": [{
            "day": 1, "focus": "Lower",
            "warmup": ["5 min jog"],
            "exercises": [{"name": "Back Squat (Barbell)", "sets": 5, "reps": "5",
                           "rest": "180s", "cue": "tight"}]
        }]
    }
    assert _validate_plan_payload(bad, req) is None


def test_xp_rank_logic_via_config():
    r = client.get("/api/config").json()
    # rank lookup ranges
    ranks = {x["code"]: x for x in r["ranks"]}
    assert ranks["E"]["min"] == 0 and ranks["E"]["max"] == 999
    assert ranks["S"]["min"] == 20000
