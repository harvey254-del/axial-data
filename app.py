import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from langdetect import detect, LangDetectException
from dotenv import load_dotenv
import uvicorn

# Load environment variables FIRST
load_dotenv()

app = FastAPI(title="Axial Data API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Debug: Check if keys loaded
print("🔍 Environment check:")
print(f"SUPABASE_URL: {'✅' if SUPABASE_URL else '❌'}")
print(f"SUPABASE_ANON_KEY: {'✅' if SUPABASE_ANON_KEY else '❌'} ({len(SUPABASE_ANON_KEY or '')} chars)")
print(f"SUPABASE_SERVICE_ROLE_KEY: {'✅' if SUPABASE_SERVICE_ROLE_KEY else '❌'} ({len(SUPABASE_SERVICE_ROLE_KEY or '')} chars)")

# Initialize clients
supabase_client = None
service_client = None

def create_supabase_clients():
    global supabase_client, service_client
    
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
        print("❌ Missing required environment variables!")
        return
    
    try:
        # Service client for writes (bypasses RLS)
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Test service client with a simple query
        test_resp = service_client.table("data_items").select("id").limit(1).execute()
        if test_resp.data is not None:
            print("✅ Service client connected!")
        else:
            print("⚠️ Service client connected but table may be empty or inaccessible.")
        
        # Anon client for reads
        if SUPABASE_ANON_KEY:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            print("✅ Anon client connected")
        else:
            print("⚠️ No anon key - reads may be limited")
            
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        service_client = None
        supabase_client = None

create_supabase_clients()

class IngestRequest(BaseModel):
    source: str
    content: str

@app.get("/")
async def root():
    return {
        "message": "Axial Data API running! 🚀",
        "supabase_connected": bool(service_client),
        "version": "1.0.0"
    }

@app.post("/ingest")
async def ingest_data(payload: IngestRequest):
    if not service_client:
        raise HTTPException(status_code=500, detail="Supabase service client not available")
    
    try:
        # Language detection
        try:
            lang = detect(payload.content)
        except LangDetectException:
            lang = "unknown"
        
        # Auto-labeling (placeholder)
        labels = ["africa", "tech", "pending"]
        
        # Prepare data
        item = {
            "source": payload.source,
            "content": payload.content,
            "language_code": lang,
            "labels": labels
        }
        
        # Insert to Supabase
        response = service_client.table("data_items").insert(item).execute()
        
        if response.data:
            inserted_item = response.data[0]
            print(f"✅ Inserted: {inserted_item.get('id', 'unknown')}")
            return {"status": "success", "item": inserted_item}
        else:
            raise HTTPException(status_code=500, detail="Insert failed - no data returned")
            
    except Exception as e:
        print(f"❌ Ingest error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/data")
async def get_recent_data(limit: int = 10):
    client = supabase_client or service_client
    if not client:
        raise HTTPException(status_code=500, detail="No database client available")
    
    try:
        response = client.table("data_items").select("*").order("created_at", desc=True).limit(limit).execute()
        return {"status": "success", "data": response.data or [], "count": len(response.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/docs")
async def docs():
    return {"docs": "Available at http://localhost:8000/docs", "redoc": "http://localhost:8000/redoc"}

# Production: Use PORT from environment
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    if not service_client:
        print("❌ Cannot start - Supabase not connected. Check .env file.")
    else:
        print("🚀 Starting Axial Data API...")
        uvicorn.run(app, host="0.0.0.0", port=port, reload=True)