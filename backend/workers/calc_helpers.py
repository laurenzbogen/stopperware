from pathlib import Path
import sys
import json

UPLOAD_DIR = Path("./tmp")

def emit(**kwargs):
    kwargs["calculation_type"] = "wordcount"
    sys.stdout.write(json.dumps(kwargs) + "\n")
    sys.stdout.flush()
