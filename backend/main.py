import re
import hashlib
import shutil
from pathlib import Path
from typing import List
import fasttext
import json
import os
import shutil
import tempfile
import zipfile

import pandas as pd
from fastapi import Body
from fastapi.background import BackgroundTasks
from fastapi.responses import FileResponse
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
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
            "message": "Running job belongs to different session",
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
        raise HTTPException(status_code="450", detail="Current Job is not owned by session")

    server_job.try_cancel_process()
    return {
        "status": "JOB_CANCELLED",
        "message": "Cancelled job successfully",
    }

@app.get("/dynamic/similar/{word}")
def get_similar(word: str, session_id=Depends(get_session_id)):
    model_path = UPLOAD_DIR / session_id / "model.bin"
    if not model_path.is_file():
        raise HTTPException(status_code="451", detail="No Model Loaded in Current Session")
    model = fasttext.load_model(str(model_path)) if model_path.is_file() else None
    return model.get_nearest_neighbors(word, k=20)


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






def safe_extract(zf: zipfile.ZipFile, target_dir: Path):
    """Extract a zip file while preventing path traversal (zip-slip)."""
    target_dir = target_dir.resolve()

    for member in zf.namelist():
        member_path = (target_dir / member).resolve()

        # Ensure the resolved path is still inside target_dir
        if (
            not str(member_path).startswith(str(target_dir) + os.sep)
            and member_path != target_dir
        ):
            raise HTTPException(status_code=400, detail=f"Unsafe path in zip: {member}")

    zf.extractall(target_dir)



@app.post("/downloadSavefile")
async def downloadSavefile(
    background_tasks: BackgroundTasks,
    state: str = Body(...),
    session_id=Depends(get_session_id),
):
    if session_id is None:
        return
    dir_path = UPLOAD_DIR / session_id / 'files'
    if not dir_path.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    tmp_dir = tempfile.mkdtemp()
    background_tasks.add_task(shutil.rmtree, tmp_dir, ignore_errors=True)

    # Copy the upload dir into a staging area so we don't write into the real dir
    staging_dir = os.path.join(tmp_dir, "staging")
    shutil.copytree(dir_path, os.path.join(staging_dir, "files"))

    # Write the app state JSON at the top level of the staged copy
    state_path = os.path.join(staging_dir, "state.json")
    with open(state_path, "w") as f:
        f.write(state)

    save_path = os.path.join(staging_dir, "save.txt")
    with open(save_path, "w") as f:
        f.write(session_id)


    zip_base = os.path.join(tmp_dir, session_id)
    zip_path = shutil.make_archive(zip_base, "zip", root_dir=staging_dir)

    return FileResponse(
        path=zip_path,
        filename=f"{session_id}.zip",
        media_type="application/zip",
        background=background_tasks,
    )


SAVE_NAME_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
@app.post("/uploadSavefile")
async def upload_savefile(response: Response, file: UploadFile = File(...)):
    content = await file.read()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        zip_path = tmp_path / "upload.zip"
        zip_path.write_bytes(content)

        if not zipfile.is_zipfile(zip_path):
            raise HTTPException(status_code=400, detail="Uploaded file is not a zip archive")

        extract_to = tmp_path / "extracted"
        extract_to.mkdir()

        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                safe_extract(zf, extract_to)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Corrupt zip file")

        save_txt = extract_to / "save.txt"
        state_json = extract_to / "state.json"
        files_dir = extract_to / "files"

        missing = []
        if not save_txt.is_file():
            missing.append("save.txt")
        if not state_json.is_file():
            missing.append("state.json")
        if not files_dir.is_dir():
            missing.append("files/")
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Savefile is missing required entries: {', '.join(missing)}",
            )

        try:
            lines = [l.strip() for l in save_txt.read_text(encoding="utf-8").splitlines()]
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="save.txt is not valid UTF-8")

        lines = [l for l in lines if l]
        if len(lines) != 1:
            raise HTTPException(
                status_code=400,
                detail="save.txt must contain exactly one non-empty line",
            )

        name = lines[0]
        if not SAVE_NAME_RE.fullmatch(name):
            raise HTTPException(
                status_code=400,
                detail="Invalid save name in save.txt",
            )

        upload_root = UPLOAD_DIR.resolve()
        target = (upload_root / name).resolve()
        if target.parent != upload_root:
            raise HTTPException(status_code=400, detail="Invalid save name in save.txt")

        # Parse before committing anything to disk, so a broken state.json
        # can't leave a half-written save directory behind.
        try:
            state = json.loads(state_json.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise HTTPException(status_code=400, detail="state.json is not valid JSON")

        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(extract_to, target)

    response.set_cookie(key="stopperware_session_id", value=name, expires=None)
    return state
