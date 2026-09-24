import sys
import json
from time import sleep
from pathlib import Path
from sklearn.feature_extraction.text import CountVectorizer
import pandas as pd
from calc_helpers import emit, init, UPLOAD_DIR


def get_files(session_id):
    session_dir = UPLOAD_DIR / session_id / "files"
    if not session_dir.exists():
        emit(session_id=session_id, errored=True, error_message=f'Cant find any files while calculating wordcount')
    files = []
    for path in session_dir.iterdir():
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except:
            emit(session_id=session_id, errored=True, error_message=f'Error reading file at {path}')

        files.append({"name": path.name, "text": text})

    return files


def calc_worker(session_id):
    session_files = get_files(session_id)
    try:
        files = [f["text"] for f in session_files]
        filenames = [f["name"] for f in session_files]
        emit(session_id=session_id, progress=0.4, progress_message='Fitting Count Vectorizer..')

        vectorizer = CountVectorizer(
            strip_accents="unicode",
            # token_pattern=r"(?u)[^\W\d_]+['’]?",
        )
        X = vectorizer.fit_transform(files)

        emit(session_id=session_id, progress=0.7, progress_message='Collecting in csv cache..')

        df = pd.DataFrame(
            X.toarray(), index=filenames, columns=vectorizer.get_feature_names_out()
        )


        cached_path = Path(UPLOAD_DIR) / session_id / "wordcount.csv"
        df.to_csv(cached_path)

    except:
        emit(session_id=session_id, errored=True, error_message='Error calculating word count')

if __name__ == "__main__":
    calc_worker(init("wordcount"))
