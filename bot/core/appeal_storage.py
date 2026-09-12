import json
import os

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
SANCTIONS_FILE = os.path.join(DATA_DIR, "sanctions.json")
APPEALS_FILE = os.path.join(DATA_DIR, "appeals.json")

os.makedirs(DATA_DIR, exist_ok=True)

def load_json(file_path: str) -> dict:
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_json(file_path: str, data: dict):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
