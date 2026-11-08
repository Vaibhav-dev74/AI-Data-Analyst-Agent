def test_analyst_agent_chat_workflow(authenticated_client):
    with open("sample_datasets/sales_data.csv", "rb") as f:
        upload_res = authenticated_client.post(
            "/api/datasets/upload",
            files={"file": ("sales_data.csv", f, "text/csv")}
        )
    dataset_id = upload_res.json()["id"]

    # Submit question to AI Analyst
    chat_res = authenticated_client.post("/api/analyst/chat", json={
        "dataset_id": dataset_id,
        "message": "What are my top five selling products by total revenue?"
    })
    assert chat_res.status_code == 200
    msg = chat_res.json()
    assert msg["role"] == "assistant"
    assert msg["content"]
    assert msg["query_sql"]
    assert "SELECT" in msg["query_sql"].upper()
    assert msg["analytical_method"]
    assert msg["result"] is not None
    assert len(msg["result"]["raw_data"]) > 0

    # Verify history
    hist_res = authenticated_client.get("/api/analyst/history")
    assert hist_res.status_code == 200
    sessions = hist_res.json()
    assert len(sessions) > 0
