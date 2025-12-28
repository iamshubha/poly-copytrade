import { test as base, expect } from "@playwright/test";

const test = base.extend({
  // Add any custom fixtures here
});

test.describe("Authentication", () => {
  test("should display sign in page", async ({ page }) => {
    await page.goto("/auth/signin");

    await expect(page.locator("h1")).toContainText("Sign In to CopyTrade");
    await expect(page.locator("button")).toContainText("Connect Wallet");
  });

  test("should show connect wallet button", async ({ page }) => {
    await page.goto("/auth/signin");

    const connectButton = page.locator('button:has-text("Connect Wallet")');
    await expect(connectButton).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("should redirect to sign in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Should be redirected to sign in
    await expect(page).toHaveURL(/.*signin/);
  });
});

test.describe("Landing Page", () => {
  test("should display landing page correctly", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("Copy Elite Traders");
    await expect(page.locator("text=Get Started")).toBeVisible();
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Features")).toBeVisible();
    await expect(page.locator("text=How It Works")).toBeVisible();
    await expect(page.locator("text=Launch App")).toBeVisible();
  });

  test("should display feature cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Real-Time Copying")).toBeVisible();
    await expect(page.locator("text=Risk Management")).toBeVisible();
    await expect(page.locator("text=Follow Multiple Traders")).toBeVisible();
  });
});
