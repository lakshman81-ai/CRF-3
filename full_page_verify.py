import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto(f"file://{os.path.abspath('viewer/index.html')}")
        await page.wait_for_timeout(1000)

        # Navigate to INPUT DATA tab
        await page.click("text=INPUT DATA")
        await page.wait_for_timeout(1000)

        # Upload file (we'll click the hidden input or force upload)
        # There should be a load button. Let's look for text="Use Sample" in the input data page
        try:
            await page.click("text=Use Sample", timeout=2000)
            await page.wait_for_timeout(1000)
        except:
            print("No Use sample found, looking for file input")
            try:
                await page.locator("input[type=file]").set_input_files("SAMPLE2.ACCDB")
                await page.wait_for_timeout(1000)
            except:
                print("No file input found either")

        # Navigate to GEOMETRY tab
        await page.click("text=GEOMETRY")
        await page.wait_for_timeout(1000)

        # Take full page screenshot
        await page.screenshot(path="geometry_fullpage.png", full_page=True)
        await browser.close()

asyncio.run(run())
