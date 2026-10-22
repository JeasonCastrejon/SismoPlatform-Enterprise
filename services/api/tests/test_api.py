from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r=client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_events_shape():
    r=client.get("/api/v1/events")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    if r.json():
        assert {"magnitude","depth_km","latitude","longitude","source"} <= set(r.json()[0])

def test_dashboard_summary():
    r=client.get("/api/v1/dashboard/summary")
    assert r.status_code == 200
    assert "total_events" in r.json()
