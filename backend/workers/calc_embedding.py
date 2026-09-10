import sys
import fasttext
import json
import re
import os
from time import time
import threading

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


def emit(**kwargs):
    kwargs['type'] = 'embedding'
    sys.stdout.write(json.dumps(kwargs) + "\n")
    sys.stdout.flush()


class ProgressWatcher:
    """
    Redirects fd 2 (stderr) into a pipe so fasttext's C++ progress
    output can be parsed, and restores it cleanly on close().
    """

    def __init__(self):
        self._read_fd, self._write_fd = os.pipe()
        self._saved_stderr_fd = os.dup(2)
        os.dup2(self._write_fd, 2)
        os.close(self._write_fd)  # fd 2 now owns the "real" write end

        self._thread = threading.Thread(target=self._reader, daemon=True)
        self._thread.start()

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
                        emit(jobStatus="running", progress=parsed["progress"], progressMessage="set in embedding _reader")

    def close(self):
        # Restore the real stderr onto fd 2. This closes the pipe's
        # write side (since it was living at fd 2), which sends EOF
        # to the reader thread's read() call.
        os.dup2(self._saved_stderr_fd, 2)
        os.close(self._saved_stderr_fd)

        # Wait for the reader to actually drain/finish before returning.
        self._thread.join(timeout=5)


def train_worker(input_path: str, model_path: str):
    watcher = ProgressWatcher()
    try:
        model = fasttext.train_unsupervised(input_path, model="skipgram")
        model.save_model(model_path)
        emit(jobStatus="running", progress=1.0, progressMessage="closing embedding", payload="embedding done")
    except Exception as e:
        emit(jobStatus="error", progress=0.0, payload=str(e))
        raise
    finally:
        watcher.close()


if __name__ == "__main__":
    train_worker(sys.argv[1], sys.argv[2])
