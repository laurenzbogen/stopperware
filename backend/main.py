import asyncio
import hashlib
import json
import multiprocessing as mp
import os
import shutil
import tempfile
import zipfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any, List, Optional

import fasttext
import numpy as np
import pandas as pd
from fastapi import (
    Body,
    Cookie,
    Depends,
    FastAPI,
    File,
    HTTPException,
    Response,
    UploadFile,
)
from fastapi.background import BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from job_state import JobState

UPLOAD_DIR = Path("./tmp")
app = FastAPI(title="Stopword API")
ctx = mp.get_context("spawn")
executor = ProcessPoolExecutor(max_workers=2, mp_context=ctx)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


def get_session_files(session_id) -> list:
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id cookie")

    session_dir = UPLOAD_DIR / session_id / "files"
    if not session_dir.is_dir():
        raise HTTPException(status_code=404, detail="Session not found")

    files = []
    for path in session_dir.iterdir():
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        files.append({"name": path.name, "text": text})

    return files


def get_session_id(stopperware_session_id: str | None = Cookie(default=None)) -> str:
    if not stopperware_session_id:
        raise HTTPException(status_code=400, detail="Missing session_id cookie")

    return stopperware_session_id


def get_cached_model(h: str = Depends(get_session_id)):
    model_path = UPLOAD_DIR / h / "model.bin"
    return fasttext.load_model(str(model_path)) if model_path.is_file() else None


job_state = JobState()


async def watch(proc, session_id):
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        job_state.update_from_line(line)


@app.post("/cancelCalculation")
async def cancelCalculation():
    process = job_state.get_process_if_running()
    if process is None:
        return "no process running"

    process.terminate()
    await process.wait()

    return "cancelled"


@app.post("/uploadCorpus")
async def upload_files(
    response: Response,
    files: List[UploadFile] = File(...),
):
    firstlines = b""
    size = 0

    for f in files:
        firstlines += f.file.readline()
        # size = f.size  # in bytes, may be None in some cases

    h = hashlib.sha256(firstlines + str(size).encode()).hexdigest()
    process_files(files, h)

    response.set_cookie(key="stopperware_session_id", value=h)
    return {"status": "AVAILABLE", "payload": h}


@app.get("/wordcount")
async def get_wordcount(response: Response, h: str = Depends(get_session_id)):
    cached_path = Path(UPLOAD_DIR) / h / "wordcount.csv"
    if cached_path.exists():
        print("cached_path_exists")
        df = pd.read_csv(
            cached_path,
            index_col=0,
            keep_default_na=False,
            na_values=["", "NA", "NULL"],
        )
        counts = df.sum(axis=0).reset_index()
        counts.columns = ["word", "count"]
        counts = counts.sort_values("count", ascending=False)

        p = job_state.get_process_if_running()
        if p is None:
            job_state.reset()
        else:
            job_state.clear_process(p)
        return {"status": "AVAILABLE", "payload": counts.to_dict(orient="records")}

    calculate, message = job_state.evaluate()
    job_state.check_state_to_request("wordcount")
    response.status_code = message["status_code"]

    if calculate:
        process = await job_state.try_start(
            "wordcount", h, "workers/calc_wordcount.py", h
        )
        asyncio.create_task(watch(process, h))

        print(process)

    return message


@app.get("/tfidf")
def tfidf(h: str = Depends(get_session_id)):
    cached_path = Path(UPLOAD_DIR) / h / "wordcount.csv"
    if not cached_path.exists():
        raise HTTPException(status_code=400, detail=f"Wordcounts couldnt be loaded")
    wordcounts = pd.read_csv(
        cached_path,
        index_col=0,
        keep_default_na=False,
        na_values=["", "NA", "NULL"],
    )
    col_sums = wordcounts.sum(axis=0)
    wordcounts = wordcounts[col_sums[col_sums > 10].index]

    relative_term_frequecy = wordcounts.div(wordcounts.sum(axis=1), axis=0)

    number_of_documents = len(wordcounts)
    number_of_documents_with_term = (wordcounts != 0).sum()

    idf = (number_of_documents / (1 + number_of_documents_with_term)).apply(np.log) + 1
    tf_idf = relative_term_frequecy.div(idf, axis=1)

    svd = TruncatedSVD(n_components=2, random_state=42)

    scaler = MinMaxScaler()
    transformed = svd.fit_transform(tf_idf.T)
    result = scaler.fit_transform(transformed)

    r = pd.DataFrame(scaler.fit_transform(result), index=wordcounts.columns)
    r = r.loc[tf_idf.std().sort_values(ascending=False).index]
    r = r.reset_index()
    r.columns = ["word", "x", "y"]

    return {"status": "AVAILABLE", "payload": r.iloc[:500].to_dict(orient="records")}


@app.get("/embedding")
async def embedding(response: Response, h: str = Depends(get_session_id)):

    cached_path = Path(UPLOAD_DIR) / h / "model.bin"
    if cached_path.exists():
        print("cached_path_exists")
        p = job_state.get_process_if_running()
        if p is None:
            job_state.reset()
        else:
            job_state.clear_process(p)
        return {"status": "AVAILABLE", "payload": "model is ready"}

    calculate, message = job_state.evaluate()
    job_state.check_state_to_request("embedding")
    response.status_code = message["status_code"]

    if calculate:
        session_dir = UPLOAD_DIR / h
        files = [f["text"] for f in get_session_files(h)]
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as tmp:
            tmp.writelines(files)
        tmp_path = tmp.name

        process = await job_state.try_start(
            "embedding",
            h,
            "workers/calc_embedding.py",
            str(tmp_path),
            str((session_dir / "model.bin").resolve()),
        )

        asyncio.create_task(watch(process, h))

    return message


@app.get("/embeddingScatter")
async def embeddingScatter(
    response: Response,
    h=Depends(get_session_id),
):
    cached_path = Path(UPLOAD_DIR) / h / "embedding_scatter.csv"

    if cached_path.exists():
        print("cached_path_exists")
        positions = pd.read_csv(
            cached_path,
            index_col=0,
            keep_default_na=False,
            na_values=["", "NA", "NULL"],
        )

        payload = positions[["word", "count", "x", "y"]].to_dict(orient="records")

        p = job_state.get_process_if_running()
        if p is None:
            job_state.reset()
        else:
            job_state.clear_process(p)
        return {"status": "AVAILABLE", "payload": payload}

    calculate, message = job_state.evaluate()
    job_state.check_state_to_request("embeddingScatter")
    response.status_code = message["status_code"]

    if calculate:
        process = await job_state.try_start(
            "embeddingScatter", h, "workers/calc_embedding_scatter.py", h
        )
        asyncio.create_task(watch(process, h))

    return message


@app.get("/embeddingSimilar/{similarKey}")
def embeddingSimilar(similarKey: str, h=Depends(get_session_id)):
    model_path = UPLOAD_DIR / h / "model.bin"
    if not model_path.is_file():
        raise HTTPException(
            status_code=400, detail=f"Embedding model couldnt be loaded"
        )
    model = fasttext.load_model(str(model_path)) if model_path.is_file() else None

    return {
        "status": "AVAILABLE",
        "payload": model.get_nearest_neighbors(similarKey, k=20),
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


@app.post("/uploadSavefile")
async def upload_savefile(response: Response, file: UploadFile = File(...)):
    filename = file.filename or ""
    is_zip_ext = filename.lower().endswith(".zip")

    save_path = UPLOAD_DIR / filename
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    if not zipfile.is_zipfile(save_path):
        if is_zip_ext:
            raise HTTPException(
                status_code=400,
                detail="File has .zip extension but is not a valid zip archive",
            )
        return {
            "filename": filename,
            "extracted": False,
            "message": "Not a zip file, saved as-is",
        }

    h = save_path.stem
    extract_to = UPLOAD_DIR / h
    extract_to.mkdir(exist_ok=True)

    try:
        with zipfile.ZipFile(save_path, "r") as zf:
            safe_extract(zf, extract_to)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Corrupt zip file")

    save_path.unlink()

    response.set_cookie(key="session_id", value=h, expires=None)
    with open(extract_to / "state.json") as f:
        return json.load(f)


@app.post("/downloadSavefile")
async def downloadSavefile(
    background_tasks: BackgroundTasks,
    state: dict = Body(...),
    h: str = Depends(get_session_id),
):
    dir_path = UPLOAD_DIR / h
    if not dir_path.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    tmp_dir = tempfile.mkdtemp()
    background_tasks.add_task(shutil.rmtree, tmp_dir, ignore_errors=True)

    # Copy the upload dir into a staging area so we don't write into the real dir
    staging_dir = os.path.join(tmp_dir, "staging")
    shutil.copytree(dir_path, staging_dir)

    # Write the app state JSON at the top level of the staged copy
    state_path = os.path.join(staging_dir, "state.json")
    with open(state_path, "w") as f:
        json.dump(state, f, indent=2)

    zip_base = os.path.join(tmp_dir, h)
    zip_path = shutil.make_archive(zip_base, "zip", root_dir=staging_dir)

    return FileResponse(
        path=zip_path,
        filename=f"{h}.zip",
        media_type="application/zip",
        background=background_tasks,
    )


@app.get("/status")
def status(
    response: Response, stopperware_session_id: str | None = Cookie(default=None)
):
    response.set_cookie(key="stopperware_session_id", value=stopperware_session_id)
    return {
        "sessionId": stopperware_session_id,
        "jobStatus": job_state.evaluate()[1]["jobStatus"],
    }


#
# @app.get("/similar/{h}/{word}")
# def calc_embedding_similar(h: str, word: str):
#     model = get_model_or_throw(h)
#     return model.get_nearest_neighbors(word, k=2000)[:10]
#
#
#
#
# # import numpy as np
# # from bertopic import BERTopic
# # from umap import UMAP
# # from hdbscan import HDBSCAN  # <--- Need this import
# #
# # # 1. Prepare data and embeddings
# # cleaned_docs = [doc.replace("\n", " ").strip() for doc in docs]
# # embeddings = np.array([model.get_sentence_vector(doc) for doc in cleaned_docs])
# #
# # # 2. Relax UMAP for small data
# # custom_umap = UMAP(n_neighbors=5, n_components=5, min_dist=0.0, metric='cosine', random_state=42)
# #
# # # 3. Relax HDBSCAN so it accepts tiny clusters (Crucial Step!)
# # custom_hdbscan = HDBSCAN(
# #     min_cluster_size=3,       # Smallest group that can form a topic (changed from 10)
# #     min_samples=1,            # How strict the clustering is (lower = fewer outliers)
# #     prediction_data=True
# # )
# #
# # # 4. Combine them into BERTopic
# # topic_model = BERTopic(umap_model=custom_umap, hdbscan_model=custom_hdbscan)
# # topics, probs = topic_model.fit_transform(docs, embeddings)
# # topics, probs
# #
# # topic_info = topic_model.get_topic_info()
# # topic_info
# #
# # topic_0_words = topic_model.get_topic(0)
# # print(topic_0_words)
#
#
# def get_files(folder_path):
#     results = []
#     # Convert string path to a Path object
#     path = Path(folder_path)
#
#     # .glob("*.txt") finds all text files in the directory
#     for file_path in path.glob("*.txt"):
#         # Read the contents of the file as a string
#         contents = file_path.read_text(encoding="utf-8")
#
#         results.append({
#             "filename": file_path.name,          # e.g., "notes.txt"
#             "size": file_path.stat().st_size,    # File size in bytes
#             "content_type": "text/plain",        # Hardcoded for .txt files
#             "content": contents,
#         })
#
#     return results
#
# # file_dicts = get_files('/Users/laurenzbogen/_1projects/Bachelorarbeit/Geste/txt/norm')
#
#
#
@app.get("/health")
def health():
    return {"status": "ok"}
