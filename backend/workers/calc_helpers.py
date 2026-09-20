from pathlib import Path
import sys
import json

UPLOAD_DIR = Path("./tmp")

_session_id = None
_calculation_type = None


def init(calculation_type, session_id=None):
    global _session_id, _calculation_type
    _calculation_type = calculation_type
    _session_id = session_id if session_id is not None else sys.argv[1]
    return _session_id


def emit(**kwargs):
    if _calculation_type is None:
        raise RuntimeError("calc_helpers.init() must be called before emit()")
    kwargs.setdefault("session_id", _session_id)
    kwargs.setdefault("calculation_type", _calculation_type)
    sys.stdout.write(json.dumps(kwargs) + "\n")
    sys.stdout.flush()
