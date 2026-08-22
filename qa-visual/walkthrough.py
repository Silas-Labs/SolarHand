"""Headless visual walkthrough for SolarHand — the reliable alternative to
driving the desktop browser overlay.

It launches bundled Chromium (headless), logs in through the real login form,
visits the public landing page, every telemetry-enabled asset's detail page
(as a technician), and the admin dashboard, then writes full-page PNG
screenshots to ./shots next to this file. It uses DOM role/text selectors and
real navigation — no pixel-coordinate clicking — so it is deterministic.

Prereqs (on the machine running this):
  1. Backend API running          (default http://127.0.0.1:8099)
  2. Frontend dev server running   (default http://localhost:5173)
  3. Playwright + Chromium in the venv:
        pip install playwright
        python -m playwright install chromium

Run:
    python qa-visual/walkthrough.py

Override any default via env: SH_WEB, SH_API, SH_ADMIN, SH_ADMIN_PW,
SH_TECH, SH_TECH_PW.

Connected-asset IDs are resolved live from the API by `telemetry_enabled`, so
this keeps working after a reseed (asset UUIDs change every seed run).
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

WEB = os.environ.get("SH_WEB", "http://localhost:5173")
API = os.environ.get("SH_API", "http://127.0.0.1:8099")
ADMIN = (os.environ.get("SH_ADMIN", "admin@lakesidesolar.co.ke"),
         os.environ.get("SH_ADMIN_PW", "solarhand"))
TECH = (os.environ.get("SH_TECH", "brian@lakesidesolar.co.ke"),
        os.environ.get("SH_TECH_PW", "solarhand"))
SHOTS = Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(exist_ok=True)


def api_login(email: str, pw: str) -> str:
    data = urllib.parse.urlencode({"username": email, "password": pw}).encode()
    req = urllib.request.Request(
        f"{API}/auth/login", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)["access_token"]


def api_get(path: str, token: str):
    req = urllib.request.Request(f"{API}{path}",
                                 headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)


def slug(s: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "asset").lower()).strip("-")[:32]


errors: list[str] = []


def wire(page, tag: str) -> None:
    # Only genuine errors — React Router v7 future-flag notices are warnings.
    page.on("console", lambda m: errors.append(f"[{tag}] {m.text}")
            if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"[{tag}] pageerror: {e}"))


def login(page, email: str, pw: str) -> None:
    page.goto(f"{WEB}/login", wait_until="domcontentloaded")
    page.fill("input[type=email]", email)
    page.fill("input[type=password]", pw)
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=20000)
    page.wait_for_load_state("networkidle")


def shoot(page, name: str) -> None:
    page.wait_for_timeout(1500)
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)
    print(f"  shot: {name}.png  ({page.url})")


def main() -> None:
    token = api_login(*ADMIN)
    assets = api_get("/assets", token)
    connected = [a for a in assets if a.get("telemetry_enabled")]
    print(f"connected assets: {[a['device_id'] for a in connected]}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        vp = {"width": 1440, "height": 1000}

        # 1) public landing (no auth)
        ctx = browser.new_context(viewport=vp)
        pg = ctx.new_page(); wire(pg, "landing")
        pg.goto(WEB, wait_until="networkidle")
        shoot(pg, "01_landing")
        ctx.close()

        # 2) technician: assets list + every connected asset's detail
        ctx = browser.new_context(viewport=vp)
        tp = ctx.new_page(); wire(tp, "tech")
        login(tp, *TECH)
        tp.goto(f"{WEB}/assets", wait_until="networkidle")
        shoot(tp, "02_assets_list")
        for i, a in enumerate(connected, start=1):
            tp.goto(f"{WEB}/assets/{a['id']}", wait_until="networkidle")
            shoot(tp, f"03_{i:02d}_{slug(a.get('location_name'))}")
        ctx.close()

        # 3) admin dashboard (fresh context = clean session)
        ctx = browser.new_context(viewport=vp)
        ap = ctx.new_page(); wire(ap, "admin")
        login(ap, *ADMIN)
        ap.goto(f"{WEB}/admin", wait_until="networkidle")
        shoot(ap, "04_admin_dashboard")
        ctx.close()

        browser.close()

    print("\nconsole errors:",
          ("\n  " + "\n  ".join(errors)).encode("ascii", "replace").decode()
          if errors else "none")
    print("done ->", SHOTS)


if __name__ == "__main__":
    main()
