import urllib.request
import datetime
import sys
import os

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "keepalive_supabase.log")

SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E"

url = f"{SUPABASE_URL}/rest/v1/templates?select=id&limit=1"
req = urllib.request.Request(url, headers={
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
})

log_line = f"[{datetime.datetime.now()}] "
exit_code = 0
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        log_line += f"OK - status {resp.status}"
except Exception as e:
    log_line += f"ERROR - {type(e).__name__}: {e}"
    exit_code = 1

with open(LOG_PATH, "a", encoding="utf-8") as f:
    f.write(log_line + "\n")

sys.exit(exit_code)
