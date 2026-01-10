import { Page, Browser } from '@playwright/test';
import { World as CucumberWorld } from '@cucumber/cucumber';

export interface World extends CucumberWorld {
  page: Page;
  browser: Browser;
}