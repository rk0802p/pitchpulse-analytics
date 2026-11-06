import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"D:\New folder (2)\Sports Analytical Website\artifacts\screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Overview
        print("Capturing Overview...")
        page.goto("http://localhost:3000/#dashboard", wait_until="networkidle", timeout=20000)
        time.sleep(3)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_overview_pitchpulse.png"))

        # 2. Explorer
        print("Capturing Player Explorer...")
        page.goto("http://localhost:3000/#explorer", wait_until="networkidle", timeout=20000)
        time.sleep(3)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_explorer_pitchpulse.png"))

        # 3. Add 2 players to Compare while on explorer
        try:
            compare_buttons = page.locator("button:has-text('+ Compare')")
            if compare_buttons.count() >= 2:
                compare_buttons.nth(0).click()
                time.sleep(1)
                # navigate back to explorer to add second
                page.goto("http://localhost:3000/#explorer", wait_until="networkidle", timeout=20000)
                time.sleep(2)
                page.locator("button:has-text('+ Compare')").nth(1).click()
                time.sleep(1)
        except Exception as e:
            print(f"Compare populate error: {e}")

        # 4. Compare View
        print("Capturing Comparison Matrix...")
        page.goto("http://localhost:3000/#compare", wait_until="networkidle", timeout=20000)
        time.sleep(3)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_compare_pitchpulse.png"))

        # 5. Squad Browser (Click Arsenal to show full squad dossier)
        print("Capturing Squad Browser...")
        page.goto("http://localhost:3000/#browse", wait_until="networkidle", timeout=20000)
        time.sleep(3)
        try:
            arsenal_card = page.get_by_text("Arsenal", exact=True).first
            if arsenal_card.is_visible():
                arsenal_card.click()
                time.sleep(3)
        except Exception as e:
            print(f"Arsenal click error: {e}")
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_squad_pitchpulse.png"))

        # 6. Profile View (Click player in explorer)
        print("Capturing Player Profile...")
        page.goto("http://localhost:3000/#explorer", wait_until="networkidle", timeout=20000)
        time.sleep(3)
        try:
            first_row = page.locator("tbody tr").first
            if first_row.is_visible():
                first_row.click()
                time.sleep(3)
        except Exception as e:
            print(f"Profile row click error: {e}")
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_profile_pitchpulse.png"))

        # 7. Dataset Registry
        print("Capturing Dataset Registry...")
        page.goto("http://localhost:3000/#data", wait_until="networkidle", timeout=20000)
        time.sleep(3)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_registry_pitchpulse.png"))

        browser.close()
        print("Done capturing all screenshots!")

if __name__ == "__main__":
    main()
