import { chromium } from "playwright-core";
import fs from "node:fs";

const URL = process.env.URL || "http://localhost:3000/";
const OUT = "/tmp/swij-intro-shots";
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: "pc", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function runOne(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Instrument: record lifecycle timestamps of intro + bridge before any script runs.
  await page.addInitScript(() => {
    try {
      sessionStorage.clear();
    } catch {}
    window.__swij = { log: [], t0: null };
    const t = () => performance.now();
    const rec = (k, v) => window.__swij.log.push({ k, t: t(), v });
    const state = {
      introSeen: false,
      introGone: false,
      introFadeStart: null,
      bridgeSeen: false,
      bridgeFadeStart: null,
      bridgeGone: false,
    };
    const poll = () => {
      const intro = document.querySelector("[data-swij-intro]");
      const bridge = document.querySelector("[data-swij-intro-bridge]");
      if (intro) {
        if (!state.introSeen) {
          state.introSeen = true;
          window.__swij.t0 = t();
          rec("intro:appear");
        }
        const op = parseFloat(getComputedStyle(intro).opacity);
        if (state.introFadeStart === null && op < 0.98) {
          state.introFadeStart = t();
          rec("intro:fadeStart", op);
        }
      } else if (state.introSeen && !state.introGone) {
        state.introGone = true;
        rec("intro:gone");
      }
      if (bridge) {
        if (!state.bridgeSeen) {
          state.bridgeSeen = true;
          rec("bridge:appear");
        }
        // bridge showing content div opacity
        const op = parseFloat(getComputedStyle(bridge).opacity);
        if (state.bridgeSeen && state.bridgeFadeStart === null && op < 0.98) {
          // only after it has been fully visible once
          if (!state.bridgeFullSeen) return requestAnimationFrame(poll);
          state.bridgeFadeStart = t();
          rec("bridge:fadeStart", op);
        }
        if (op > 0.98) state.bridgeFullSeen = true;
      } else if (state.bridgeSeen && !state.bridgeGone) {
        state.bridgeGone = true;
        rec("bridge:gone");
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });

  await page.goto(URL, { waitUntil: "domcontentloaded" });

  const shots = {};
  // Capture representative frames.
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/${vp.name}-1_intro-early.png` });
  await page.waitForTimeout(1600); // ~3.2s: full first intro
  await page.screenshot({ path: `${OUT}/${vp.name}-2_intro-full.png` });
  await page.waitForTimeout(1600); // ~4.8s: should be in bridge
  await page.screenshot({ path: `${OUT}/${vp.name}-3_bridge.png` });
  await page.waitForTimeout(2600); // ~7.4s: bridge should be fading/done -> top page
  await page.screenshot({ path: `${OUT}/${vp.name}-4_top.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${vp.name}-5_top-final.png` });

  const log = await page.evaluate(() => window.__swij.log);
  await context.close();

  // Derive durations relative to intro appear.
  const at = (k) => {
    const e = log.find((x) => x.k === k);
    return e ? e.t : null;
  };
  const introAppear = at("intro:appear");
  const introFade = at("intro:fadeStart");
  const introGone = at("intro:gone");
  const bridgeAppear = at("bridge:appear");
  const bridgeFade = at("bridge:fadeStart");
  const bridgeGone = at("bridge:gone");

  const ms = (a, b) => (a != null && b != null ? Math.round(b - a) : null);
  return {
    viewport: vp.name,
    firstIntro_visibleMs: ms(introAppear, introFade),
    firstIntro_appearToGoneMs: ms(introAppear, introGone),
    bridge_showToFadeMs: ms(bridgeAppear, bridgeFade),
    bridge_appearToGoneMs: ms(bridgeAppear, bridgeGone),
    raw: log.map((x) => ({ k: x.k, t: Math.round(x.t), v: x.v })),
  };
}

const exePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch({
  executablePath: exePath,
  args: ["--disable-dev-shm-usage"],
});
const results = [];
for (const vp of viewports) {
  results.push(await runOne(browser, vp));
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
