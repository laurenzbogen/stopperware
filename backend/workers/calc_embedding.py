import tempfile
import sys
import fasttext
import json
import re
import os
from time import time
import threading
from pathlib import Path
from calc_helpers import emit, init, UPLOAD_DIR


def get_files(session_id):
    session_dir = UPLOAD_DIR / session_id / "files"
    if not session_dir.exists():
        emit(
            session_id=session_id,
            errored=True,
            error_message=f"Cant find any files while calculating embedding",
        )
    files = []
    for path in session_dir.iterdir():
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except:
            emit(
                errored=True,
                error_message=f"Error reading file at {path}",
            )

        files.append({"name": path.name, "text": text})

    return files


PROGRESS_RE = re.compile(
    r"Progress:\s*([\d.]+)%\s*words/sec/thread:\s*(\d+)\s*"
    r"lr:\s*([\d.]+)\s*avg\.loss:\s*([\d.]+)\s*ETA:\s*(.+)"
)


def _parse_line(line):
    m = PROGRESS_RE.search(line)
    if not m:
        return None
    pct, wps, lr, loss, eta = m.groups()
    return {
        "status": "INPROGRESS",
        "progress": float(pct) * 0.008,
        "words_per_sec_thread": int(wps),
        "lr": float(lr),
        "avg_loss": float(loss),
        "eta": eta.strip(),
    }




class ProgressWatcher:
    """
    Redirects fd 2 (stderr) into a pipe so fasttext's C++ progress
    output can be parsed, and restores it cleanly on close().
    """

    def __init__(self, session_id):
        self._read_fd, self._write_fd = os.pipe()
        self._saved_stderr_fd = os.dup(2)
        os.dup2(self._write_fd, 2)
        os.close(self._write_fd)  # fd 2 now owns the "real" write end

        self._thread = threading.Thread(target=self._reader, daemon=True)
        self._thread.start()
        self._session_id = session_id

    def _reader(self):
        buf = b""
        last_time = 0.0
        # fdopen takes ownership of _read_fd and will close it
        with os.fdopen(self._read_fd, "rb", buffering=0) as f:
            while chunk := f.read(1024):
                buf += chunk
                while b"\r" in buf or b"\n" in buf:
                    sep = b"\r" if b"\r" in buf else b"\n"
                    line, buf = buf.split(sep, 1)
                    parsed = _parse_line(line.decode(errors="ignore"))
                    if parsed and time() - last_time > 0.5:
                        last_time = time()
                        emit(
                            progress=parsed["progress"],
                            progress_message="Training Embedding..",
                        )

    def close(self):
        # Restore the real stderr onto fd 2. This closes the pipe's
        # write side (since it was living at fd 2), which sends EOF
        # to the reader thread's read() call.
        os.dup2(self._saved_stderr_fd, 2)
        os.close(self._saved_stderr_fd)

        # Wait for the reader to actually drain/finish before returning.
        self._thread.join(timeout=5)


def train_worker(session_id):
    session_dir = UPLOAD_DIR / session_id
    files = [f["text"] for f in get_files(session_id)]
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as tmp:
        tmp.writelines("\n".join(files))
    tmp_path = tmp.name

    watcher = ProgressWatcher(session_id)
    try:
        model = fasttext.train_unsupervised(tmp_path, model="skipgram", dim=50)
        emit(progress=0.9, progress_message="Caching Model..")
        model.save_model(
            str((session_dir / "model.bin").resolve()),
        )
    except Exception as e:
        emit(errored=True, error_message=str(e))
        raise
    finally:
        watcher.close()


if __name__ == "__main__":
    train_worker(init('embedding'))
