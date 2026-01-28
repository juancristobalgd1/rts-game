from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")
        try:
            # Click 'INICIAR'
            page.get_by_text("INICIAR").click()

            page.wait_for_selector('canvas', timeout=5000)
            print("Game loaded successfully.")
            page.screenshot(path="verification/game_upgrades.png")
        except Exception as e:
            print(f"Error loading game: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    os.makedirs("verification", exist_ok=True)
    run()
