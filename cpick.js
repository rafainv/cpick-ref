const { connect } = require("puppeteer-real-browser");
const fs = require("fs");
require("dotenv").config({ quiet: true });

const url = process.env.URL;
const login = process.env.LOGIN;
const senha = process.env.SENHA;

const COOKIES_PATH = "cookies.json";

const cpick = async () => {
  const { page, browser } = await connect({
    args: ["--start-maximized"],
    turnstile: true,
    headless: false,
    // disableXvfb: true,
    customConfig: {},
    connectOption: {
      defaultViewport: null,
    },
    plugins: [],
  });

  try {
    if (fs.existsSync(COOKIES_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH));
      await page.setCookie(...cookies);
    }

    await page.goto(url, { waitUntil: "networkidle2" });

    await page.evaluate(() => {
      document.body.style.zoom = "45%";
      window.scrollTo(0, document.body.scrollHeight);
    });

    await new Promise((r) => setTimeout(r, 10000));

    try {
      await page.click("#cf_turnstile");
    } catch(e) {}

    let token = null;
    let startDate = Date.now();
    while (!token && Date.now() - startDate < 30000) {
      token = await page.evaluate(() => {
        try {
          let item = document.querySelector(
            '[name="cf-turnstile-response"]'
          ).value;
          return item && item.length > 20 ? item : null;
        } catch (e) {
          return null;
        }
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    await new Promise((r) => setTimeout(r, 8000));

    // const clockVisible = await page.evaluate(() => {
    //   try {
    //     const clockDiv = document.getElementById("faucet_countdown_clock");
    //     return clockDiv && clockDiv.style.display !== "none";
    //   } catch (e) {
    //     return false;
    //   }
    // });

    for (let i = 0; i < 5; i++) {
      try {
        // if (!clockVisible) {
        await page.waitForSelector("#process_claim_hourly_faucet");
        await page.click("#process_claim_hourly_faucet");
        await new Promise((r) => setTimeout(r, 10000));
        break;
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 10000));
    }

    await page.screenshot({ path: "screen.png" });
  } catch (error) {
    await page.screenshot({ path: "screen.png" });
    console.error(`Erro interno do servidor: ${error.message}`);
    await browser.close();
    await new Promise((r) => setTimeout(r, 5000));
    await cpick();
  } finally {
    await browser.close();
  }
};

cpick();
