from pathlib import Path
import sys
import json

UPLOAD_DIR = Path("./tmp")

def emit(**kwargs):
    sys.stdout.write(json.dumps(kwargs) + "\n")
    sys.stdout.flush()
