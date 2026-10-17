import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sinayici.http_handler import make_handler

handler = make_handler("/api/optimize")
