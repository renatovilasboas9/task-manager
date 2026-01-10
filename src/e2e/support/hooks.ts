import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { chromium, Browser } from '@playwright/test';
import { World } from '../steps/world';

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
});

Before(async function (this: World) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: 'reports/e2e-videos/',
      size: { width: 1280, height: 720 }
    }
  });
  
  // Set much higher timeouts for complex multi-task scenarios
  context.setDefaultTimeout(90000); // 90 seconds to match Cucumber timeout
  context.setDefaultNavigationTimeout(90000); // 90 seconds
  
  this.page = await context.newPage();
  this.browser = browser;
  
  // Set page-level timeouts as well
  this.page.setDefaultTimeout(90000);
  this.page.setDefaultNavigationTimeout(90000);
});

After(async function (this: World) {
  if (this.page) {
    await this.page.context().close();
  }
});

AfterAll(async function () {
  if (browser) {
    await browser.close();
  }
});