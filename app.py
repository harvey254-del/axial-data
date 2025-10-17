import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from langdetect import detect, LangDetectException
from dotenv import load_dotenv
import uvicorn

# -------------------------------------------------------------------
# 1️⃣ Load environment variables
# -------------------------------------------------------------------
load_dotenv()

# -------------------------------------------------------------------
# 2️⃣ Initialize FastAPI
# -------------------------------------------------------------------
app = FastAPI(title="Axial Data API", version="1.0.0")

# -------------------------------------------------------------------
# 3️⃣ Enable CORS for frontend
# -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# 4️⃣ Load Supabase environment variables
# -------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("🔍 Environment check:")
print(f"SUPABASE_URL: {'✅' if SUPABASE_URL else '❌'}")
print(f"SUPABASE_ANON_KEY: {'✅' if SUPABASE_ANON_KEY else '❌'} ({len(SUPABASE_ANON_KEY or '')} chars)")
print(f"SUPABASE_SERVICE_ROLE_KEY: {'✅' if SUPABASE_SERVICE_ROLE_KEY else '❌'} ({len(SUPABASE_SERVICE_ROLE_KEY or '')} chars)")

# -------------------------------------------------------------------
# 5️⃣ Initialize Supabase clients
# -------------------------------------------------------------------
supabase_client = None
service_client = None

def create_supabase_clients():
    """Initialize Supabase anon + service clients safely."""
    global supabase_client, service_client

    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        print("❌ Missing required environment variables!")
        return

    try:
        # Service client (writes / admin)
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        test = service_client.table("data_items").select("id").limit(1).execute()
        print("✅ Service client connected!" if test.data is not None else "⚠️ Connected, but table empty or restricted.")

        # Anon client (reads / public)
        if SUPABASE_ANON_KEY:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            print("✅ Anon client connected")
        else:
            print("⚠️ Missing anon key — only service client active.")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        supabase_client = None
        service_client = None

create_supabase_clients()

# -------------------------------------------------------------------
# 6️⃣ Define request model
# -------------------------------------------------------------------
class IngestRequest(BaseModel):
    source: str
    content: str

# -------------------------------------------------------------------
# 7️⃣ Routes
# -------------------------------------------------------------------
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "Axial Data API running 🚀",
        "supabase_connected": bool(service_client),
        "version": "1.0.0"
    }

@app.post("/ingest")
async def ingest_data(payload: IngestRequest):
    """Insert a new content item into Supabase."""
    if not service_client:
        raise HTTPException(status_code=500, detail="Supabase service client not available")

    try:
        try:
            lang = detect(payload.content)
        except LangDetectException:
            lang = "unknown"

        # Placeholder auto-labels
        labels = ["africa", "tech", "pending"]

        item = {
            "source": payload.source,
            "content": payload.content,
            "language_code": lang,
            "labels": labels
        }

        response = service_client.table("data_items").insert(item).execute()
        if response.data:
            inserted_item = response.data[0]
            print(f"✅ Inserted record ID: {inserted_item.get('id', 'unknown')}")
            return {"status": "success", "item": inserted_item}
        else:
            raise HTTPException(status_code=500, detail="Insert failed — no data returned")

    except Exception as e:
        print(f"❌ Ingest error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ingest failed: {str(e)}")

@app.get("/data")
async def get_recent_data(limit: int = 10):
    """Fetch recent records from Supabase."""
    client = supabase_client or service_client
    if not client:
        raise HTTPException(status_code=500, detail="No database client available")

    try:
        response = client.table("data_items").select("*").order("created_at", desc=True).limit(limit).execute()
        return {"status": "success", "data": response.data or [], "count": len(response.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/docs")
async def docs_link():
    """Simple documentation endpoint."""
    return {
        "docs": "/docs",
        "redoc": "/redoc"
    }

# -------------------------------------------------------------------
# 8️⃣ Launch the app (for Railway or local)
# -------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    if not service_client:
        print("❌ Cannot start — Supabase not connected. Check .env or Railway Variables.")
    else:
        print("🚀 Starting Axial Data API on port", port)
        uvicorn.run("app:app", host="0.0.0.0", port=port)