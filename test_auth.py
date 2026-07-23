import requests
import json

URL = "https://scioaxiojiituzovaxrg.supabase.co/auth/v1/token?grant_type=password"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaW9heGlvamlpdHV6b3ZheHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjY2OTUsImV4cCI6MjEwMDMwMjY5NX0._rl07aJgRwxlGfMP27Q_z-zoNJwhRuqf425p5EwPy74"

headers = {
    "apikey": KEY,
    "Content-Type": "application/json"
}
data = {
    "email": "admin@sparkbox.edu",
    "password": "Admin@123"
}

resp = requests.post(URL, headers=headers, json=data)
print(resp.status_code)
print(resp.json())
