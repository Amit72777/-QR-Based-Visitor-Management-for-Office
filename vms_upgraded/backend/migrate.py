# backend/migrate.py
"""
Run this once to add the v2 columns to an existing v1 database.
Usage (from inside backend/ with venv active):
    python migrate.py
"""
import os
import psycopg2

# Read DATABASE_URL directly from backend/.env — no app imports needed
env_path = os.path.join(os.path.dirname(__file__), ".env")
db_url = None

with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line.startswith("DATABASE_URL"):
            db_url = line.split("=", 1)[1].strip()
            break

if not db_url:
    print("[ERROR] DATABASE_URL not found in .env")
    exit(1)

print(f"Connecting to: {db_url.split('@')[-1]}")

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

COLUMNS_TO_ADD = [
    ("visitors", "photo_path",      "VARCHAR(300)"),
    ("visits",   "qr_expiry_hours", "INTEGER"),
]

print("\nRunning migrations...\n")

for table, column, col_type in COLUMNS_TO_ADD:
    cur.execute("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    """, (table, column))

    if cur.fetchone():
        print(f"  [SKIP]  {table}.{column} already exists")
    else:
        cur.execute(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {col_type}')
        print(f"  [ADDED] {table}.{column} ({col_type})")

cur.close()
conn.close()
print("\nDone. Restart uvicorn now.")