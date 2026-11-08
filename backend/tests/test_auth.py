def test_user_registration_and_login(client):
    # Register
    reg_res = client.post("/api/auth/register", json={
        "email": "testuser@insightiq.ai",
        "password": "SecurePassword123!",
        "full_name": "Test User"
    })
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "testuser@insightiq.ai"

    # Duplicate registration should fail
    dup_res = client.post("/api/auth/register", json={
        "email": "testuser@insightiq.ai",
        "password": "SecurePassword123!",
        "full_name": "Test User"
    })
    assert dup_res.status_code == 400

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": "testuser@insightiq.ai",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # Current User Profile
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["full_name"] == "Test User"


def test_invalid_login(client):
    res = client.post("/api/auth/login", json={
        "email": "nonexistent@insightiq.ai",
        "password": "WrongPassword"
    })
    assert res.status_code == 401
