import sys
import json
from time import sleep
from pathlib import Path
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
import pandas as pd
import traceback


UPLOAD_DIR = Path("./tmp")

def emit(**kwargs):
    kwargs['type'] = 'wordcount'
    sys.stdout.write(json.dumps(kwargs) + "\n")
    sys.stdout.flush()

def get_files(h):
    session_dir = UPLOAD_DIR / h / "files"
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

def calc_worker(h):
    try:
        session_files = get_files(h)

        files = [f["text"] for f in session_files]
        filenames = [f["name"] for f in session_files]
        emit(jobStatus="running", progress=0.4)

        vectorizer = CountVectorizer(strip_accents="unicode")
        X = vectorizer.fit_transform(files)

        emit(jobStatus="running", progress=0.7)
        df = pd.DataFrame(
            X.toarray(), index=filenames, columns=vectorizer.get_feature_names_out()
        )
        cached_path = Path(UPLOAD_DIR) / h / "wordcount.csv"
        df.to_csv(cached_path)

        emit(jobStatus="running", progress=1.0, payload={
            "csv_path": str(cached_path),
        })
    except:
        emit(jobStatus="error", payload=traceback.format_exc())


if __name__ == "__main__":
    calc_worker(sys.argv[1])
