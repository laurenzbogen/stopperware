import sys
from pathlib import Path

import numpy as np
import pandas as pd
from calc_helpers import UPLOAD_DIR, emit
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import MinMaxScaler


def calc(session_id):
    wc_path = Path(UPLOAD_DIR) / session_id / "wordcount.csv"
    emit(session_id=session_id, progress=0.1, progress_message='starting calculation')
    if not wc_path.exists():
        emit(
            session_id=session_id,
            errored=True,
            error_message="Couldnt find cached wordcounts",
        )
    wordcounts = pd.read_csv(
        wc_path,
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
    tf_idf = relative_term_frequecy.mul(idf, axis=1)

    svd = TruncatedSVD(n_components=2, random_state=42)

    scaler = MinMaxScaler()
    result = svd.fit_transform(tf_idf.T)

    r = pd.DataFrame(scaler.fit_transform(result), index=wordcounts.columns)
    r = r.loc[tf_idf.std().sort_values(ascending=False).index]
    r = r.reset_index()
    r.columns = ["word", "x", "y"]

    emit(session_id=session_id, progress=0.9, progress_message='Saving to cached csv')
    scatter_path = Path(UPLOAD_DIR) / session_id / "tfidf_scatter.csv"
    r.to_csv(scatter_path)


if __name__ == "__main__":
    calc(sys.argv[1])
