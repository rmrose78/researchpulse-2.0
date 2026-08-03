---
name: pytest-backend
description: Generate Python backend tests for ResearchPulse using pytest and FastAPI's TestClient, following AAA structure and red-green validation.
---

# Skill: pytest-backend

Generate Python backend tests for ResearchPulse using pytest and FastAPI's TestClient.

## Rules
- Always use AAA structure with `# Arrange`, `# Act`, `# Assert` comments
- One assertion concept per test — don't stack unrelated assertions
- Test function names must describe the behavior: `test_<what>_<expected result>`
- Never test implementation details — test inputs and outputs only
- Each test must be independent — no test should rely on another test's side effects

## Setup Pattern
Every test file starts with:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
```

## AAA Pattern
```python
def test_<behavior>():
    # Arrange
    <set up data and variables>

    # Act
    response = client.<method>(<url>, <optional json or params>)

    # Assert
    assert response.status_code == <expected>
    <additional assertions on response.json()>
```

## What to Test for Every Endpoint
- Happy path — valid input returns correct status and shape
- Validation error — missing or invalid input returns 422
- Not found — invalid ID returns 404
- Conflict — duplicate returns 409 (POST only)
- Required fields — response contains expected keys

## HTTP Methods
```python
# GET
response = client.get("/api/endpoint/")
response = client.get(f"/api/endpoint/{id}")
response = client.get(f"/api/endpoint/?param={value}")

# POST
response = client.post("/api/endpoint/", json={"key": "value"})

# DELETE
response = client.delete(f"/api/endpoint/{id}")
```

## Status Codes
- 200 — successful GET
- 201 — successful POST (resource created)
- 204 — successful DELETE (no content returned)
- 404 — resource not found
- 409 — conflict (duplicate resource)
- 422 — validation error (bad input)
- 502 — external API error (PubMed down)

## Red-Green Validation (Required for Every New Test)

Before finalizing any new test, always verify it can fail:

1. Write the test
2. Temporarily flip the assertion to force failure:
```python
# Change this:
assert response.status_code == 201

# To this temporarily:
assert response.status_code == 999
```
3. Run pytest — confirm it FAILS (red)
4. Flip assertion back to correct value
5. Run pytest — confirm it PASSES (green)
6. Only then is the test considered valid

**Never accept a passing test that was never seen failing first.**

## Testability Is a Design Constraint

See `be-standards.md`'s "Testability Is a Design Constraint" section for
the underlying design principle (keeping decision logic separate from
DB/HTTP calls) — this skill covers how to write the actual test, not how
to shape the code being tested.

## Example — Search Endpoint Tests
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_search_returns_results():
    # Arrange
    query = "cardiac"

    # Act
    response = client.get(f"/api/search/?q={query}")
    data = response.json()

    # Assert
    assert response.status_code == 200
    assert data["query"] == "cardiac"
    assert data["total"] > 0
    assert len(data["results"]) > 0

def test_search_requires_min_length():
    # Arrange
    query = "a"

    # Act
    response = client.get(f"/api/search/?q={query}")

    # Assert
    assert response.status_code == 422

def test_search_result_has_required_fields():
    # Arrange
    query = "cardiac"
    number_of_results = 1

    # Act
    response = client.get(f"/api/search/?q={query}&max_results={number_of_results}")
    result = response.json()["results"][0]

    # Assert
    assert response.status_code == 200
    assert "pmid" in result
    assert "title" in result
    assert "authors" in result

def test_get_article_invalid_pmid():
    # Arrange
    pmid = "00000000"

    # Act
    response = client.get(f"/api/search/{pmid}")

    # Assert
    assert response.status_code == 404
```

## Naming Conventions
- File: `tests/test_<feature>.py`
- Function: `test_<endpoint>_<scenario>()`
- Examples:
  - `test_save_article_returns_201()`
  - `test_save_duplicate_article_returns_409()`
  - `test_delete_nonexistent_article_returns_404()`
