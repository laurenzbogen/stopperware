import hashlib
import shutil
from pathlib import Path
from typing import List

import pandas as pd
from fastapi import (
    Cookie,
    Depends,
    FastAPI,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from job_state import JobState

UPLOAD_DIR = Path("./tmp")
app = FastAPI(title="Stopword API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
)

server_job = JobState()


def get_session_id(stopperware_session_id=Cookie(default=None)):
    return stopperware_session_id


def try_get_session_or_raise_and_clear(session_id):
    session_dir = UPLOAD_DIR / session_id / "files"
    if not session_dir.is_dir():
        raise HTTPException(
            status_code=561,
            detail="Session Files not in place clearing session",
            headers={"set-cookie": 'stopperware_session_id=""; Max-Age=0; Path=/'},
        )


@app.get("/status")
def get_status(session_id=Depends(get_session_id)):
    if server_job.is_blocking_to_session(session_id):
        return {
            "status": "JOB_BLOCKING",
            "message": "Running ob belongs to different session",
        }

    if session_id is None:
        return {
            "status": "NO_SESSION_ID",
            "message": "No corpus loaded in current session",
        }

    if server_job.is_idle():
        return {"status": "SERVER_IDLE", "message": "No Jobs Running"}

    return {
        "status": "JOB_ATTACHABLE",
        "message": "Running job belongs to current session",
    }


@app.get("/session")
def get_session(response: Response, session_id=Depends(get_session_id)):
    if session_id is None:
        return {"session": "NO_SESSION"}
    session_dir = UPLOAD_DIR / session_id / "files"
    if not session_dir.is_dir():
        response.delete_cookie("stopperware_session_id")
        return {"session": "STALE_SESSION"}
    return {"session": "ACTIVE_SESSION"}


@app.post("/dependency/{dependency}")
async def dependency(dependency: str, session_id=Depends(get_session_id)):
    cached = return_if_cached(dependency, session_id)
    if cached is not None:
        server_job.reset(session_id)
        return {
            "status": "DEPENDENCY_AVAILABLE",
            "name": dependency,
            "data": cached,
        }

    if server_job.is_errored():
        response = server_job.serialize_job_state(session_id)
        server_job.try_cancel_process()
        server_job.reset(session_id)
        return response

    await server_job.start_or_attach(
        dependency, session_id, DEPENDENCY_DICT[dependency][2]
    )

    return server_job.serialize_job_state(session_id)


@app.post("/uploadCorpus")
async def upload_files(
    response: Response,
    files: List[UploadFile] = File(...),
):
    firstlines = b""
    size = 0

    for f in files:
        firstlines += f.file.readline()
        size += f.size

    h = hashlib.sha256(firstlines + str(size).encode()).hexdigest()
    process_files(files, h)

    response.set_cookie(key="stopperware_session_id", value=h)
    return {"status": "AVAILABLE", "payload": h}


@app.get("/cancel")
def cancel_calculation(session_id=Depends(get_session_id)):
    if server_job.is_blocking_to_session(session_id):
        raise HTTPException(detail="Current Job is not owned by session")

    server_job.try_cancel_process()
    return {
        "status": "JOB_CANCELLED",
        "message": "Cancelled job succesfully",
    }


def process_files(files: List[UploadFile], h: str):
    session_dir = UPLOAD_DIR / h / "files"
    session_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        dest = session_dir / f.filename
        try:
            with open(dest, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
        finally:
            f.file.close()


def return_wordcount(path):
    df = pd.read_csv(
        path,
        index_col=0,
        keep_default_na=False,
        na_values=["", "NA", "NULL"],
    )
    counts = df.sum(axis=0).reset_index()
    counts.columns = ["word", "count"]
    counts = counts.sort_values("count", ascending=False)
    return counts.to_dict(orient="records")

def return_embedding(path):
    return 'Embedding Calculated'


def return_scatter(path):
    positions = pd.read_csv(
        path,
        index_col=0,
        keep_default_na=False,
        na_values=["", "NA", "NULL"],
    )

    return positions.to_dict(orient="records")

# Cache Path, Cache Parse Func, Calculation Func
DEPENDENCY_DICT = {
    "wordcount": ["wordcount.csv", return_wordcount, "workers/calc_wordcount.py"],
    "embedding": ["model.bin", return_embedding, "workers/calc_embedding.py"],
    "embeddingScatter": ["embedding_scatter.csv", return_scatter, "workers/calc_embedding_scatter.py"],
    "tfidfScatter": ["tfidf_scatter.csv", return_scatter, "workers/calc_tfidf_scatter.py"],
}


def return_if_cached(dependency, session_id):
    try:
        dependency_path, c_function, _ = DEPENDENCY_DICT[dependency]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Dependency '{dependency}' is not implemented",
        )
    path = UPLOAD_DIR / session_id / dependency_path
    if path.exists():
        return c_function(path)
    return None
