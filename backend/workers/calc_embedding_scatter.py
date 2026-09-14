import json
import sys
from pathlib import Path

import fasttext
import numpy as np
import pandas as pd
from umap import UMAP

UPLOAD_DIR = Path("./tmp")


def emit(**kwargs):
    kwargs['type'] = 'embeddingScatter'
    sys.stdout.write(json.dumps(kwargs) + "\n")
    sys.stdout.flush()


def calc_worker(h: str):
    emit(jobStatus="running", progress=0.2, progressMessage="Loading Cached Wordcounts")
    wordcount_path = Path(UPLOAD_DIR) / h / "wordcount.csv"
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

    emit(jobStatus="running", progress=0.4, progressMessage="Loading Cached Model")
    model_path = UPLOAD_DIR / h / "model.bin"
    if not model_path.is_file():
        emit(jobStatus="error", payload="model not cached")
        return
    model = fasttext.load_model(str(model_path)) if model_path.is_file() else None

    emit(jobStatus="running", progress=0.5, progressMessage="Fitting Model..")
    vecs = words["word"].apply(lambda x: model.get_word_vector(x)).values
    vecs = np.stack(vecs, axis=0)
    #
    emit(jobStatus="running", progress=0.7, progressMessage="Reducing Dimension with UMAP..")
    fit = UMAP(
        n_neighbors=50, min_dist=0.1, n_components=2, metric="cosine", random_state=42
    )
    u = fit.fit_transform(vecs)

    words["x"] = u[:, 0]
    words["y"] = u[:, 1]

    emit(jobStatus="running", progress=0.9, progressMessage="Saving to csv..")
    scatter_path = Path(UPLOAD_DIR) / h / "embedding_scatter.csv"
    words.to_csv(scatter_path)

    emit(jobStatus="running", progress=1.0, progressMessage="done", payload="embedding scatter done")




if __name__ == "__main__":
    calc_worker(sys.argv[1])
