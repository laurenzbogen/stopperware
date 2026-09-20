import json
import sys
from pathlib import Path

import fasttext
import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import MinMaxScaler

UPLOAD_DIR = Path("./tmp")


def emit(**kwargs):
    kwargs['calculation_type'] = 'embeddingScatter'
    sys.stdout.write(json.dumps(kwargs) + "\n")
    sys.stdout.flush()


def calc_worker(session_id: str):
    emit(session_id=session_id, progress=0.2, progress_message="Loading Cached Wordcounts..")
    wordcount_path = Path(UPLOAD_DIR) / session_id / "wordcount.csv"
    df = pd.read_csv(
        wordcount_path,
        index_col=0,
        keep_default_na=False,
        na_values=["", "NA", "NULL"],
    )

    counts = df.sum().sort_values(ascending=False).reset_index()
    counts.columns = ["word", "count"]
    # only first 500 for performance for now
    words = counts[counts["count"] > 1].reset_index(drop=True).head(500)

    emit(session_id=session_id, progress=0.4, progress_message="Loading Cached Model")
    model_path = UPLOAD_DIR / session_id / "model.bin"
    if not model_path.is_file():
        emit(session_id=session_id, errored=True, error_message="model not cached")
        return
    model = fasttext.load_model(str(model_path)) if model_path.is_file() else None

    emit(session_id=session_id, progress=0.5, progress_message="Fitting Model..")
    vecs = words["word"].apply(lambda x: model.get_word_vector(x)).values
    vecs = np.stack(vecs, axis=0)
    #
    emit(session_id=session_id, progress=0.7, progress_message="Reducing Dimension with UMAP..")


    svd = TruncatedSVD(n_components=2, random_state=42)

    scaler = MinMaxScaler()
    result = svd.fit_transform(vecs)

    r = pd.DataFrame(scaler.fit_transform(result), index = words["word"])
    r = r.reset_index()
    r.columns = ["word", "x", "y"]

    # fit = UMAP(
    #     n_neighbors=50, min_dist=0.1, n_components=2, metric="cosine", random_state=42
    # )
    # u = fit.fit_transform(vecs)

    # words["x"] = u[:, 0]
    # words["y"] = u[:, 1]
    #
    # words = words.drop(columns='count')     

    emit(session_id=session_id, progress=0.9, progress_message="Saving to csv..")
    scatter_path = Path(UPLOAD_DIR) / session_id / "embedding_scatter.csv"
    r.to_csv(scatter_path)


if __name__ == "__main__":
    calc_worker(sys.argv[1])
