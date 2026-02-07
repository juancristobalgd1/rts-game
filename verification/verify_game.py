from playwright.sync_api import sync_playwright
import time

def verify_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to game...")
            page.goto("http://localhost:3000")

            # Wait for any start button
            start_btn = page.locator('button:has-text("START CAMPAIGN")')
            start_btn.wait_for(timeout=60000)

            print("Menu loaded.")
            page.screenshot(path="verification/menu.png")

            print("Starting game...")
            start_btn.click()

            # Wait for canvas
            page.wait_for_selector('canvas', timeout=10000)
            time.sleep(2) # Wait for render loop

            print("Game loaded. Taking screenshot...")
            page.screenshot(path="verification/game.png")
            print("Success!")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game()
