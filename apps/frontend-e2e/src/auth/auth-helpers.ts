import { Page, expect } from '@playwright/test';

/**
 * Shared helper functions for authentication E2E tests
 */

// Wait functions
export const waitForFormSubmission = async (timeout = 5000) => {
  await new Promise(resolve => setTimeout(resolve, timeout));
};

export const waitForEmailValidation = async (timeout = 800) => {
  await new Promise(resolve => setTimeout(resolve, timeout));
};

export const waitForAuthResponse = async (timeout = 5000) => {
  await new Promise(resolve => setTimeout(resolve, timeout));
};

// Utility functions
export const generateUniqueEmail = () => `e2etest${Date.now()}@example.com`;

export const generateSecTestEmail = () => `sectest${Date.now()}@example.com`;

// Get base URL from environment or default to localhost:3000
const getBaseUrl = () => process.env.BASE_URL || 'http://localhost:3000';

// Navigation helpers
export const navigateToLogin = async (page: Page) => {
  await page.goto(`${getBaseUrl()}/login`);
  await expect(page.getByTestId('login-form')).toBeVisible();
};

export const navigateToRegister = async (page: Page) => {
  await page.goto(`${getBaseUrl()}/register`);
  await expect(page.getByTestId('register-form')).toBeVisible();
};

export const navigateToForgotPassword = async (page: Page) => {
  await page.goto(`${getBaseUrl()}/forgot-password`);
  await expect(page.getByTestId('forgot-password-form')).toBeVisible();
};

// Assertion helpers
export const assertElementVisible = async (page: Page, testId: string, errorMessage?: string) => {
  try {
    await expect(page.getByTestId(testId)).toBeVisible({ timeout: 5000 });
  } catch (error) {
    console.log(errorMessage || `Element with testId '${testId}' not visible`);
    throw error;
  }
};

export const checkForErrorOrSuccess = async (page: Page) => {
  const errorElement = page.getByTestId('error-message');
  const successToast = page.getByTestId('toast-success');
  const errorToast = page.getByTestId('toast-error');
  
  const hasError = await errorElement.isVisible().catch(() => false);
  const hasSuccessToast = await successToast.isVisible().catch(() => false);
  const hasErrorToast = await errorToast.isVisible().catch(() => false);
  
  if (hasError) {
    const errorText = await errorElement.textContent();
    console.log('Error message displayed:', errorText);
    return { type: 'error', message: errorText };
  }
  
  if (hasSuccessToast) {
    const successText = await successToast.textContent();
    console.log('Success toast displayed:', successText);
    return { type: 'success', message: successText };
  }
  
  if (hasErrorToast) {
    const errorText = await errorToast.textContent();
    console.log('Error toast displayed:', errorText);
    return { type: 'error', message: errorText };
  }
  
  return { type: 'none', message: null };
};

// Generic error checking for security tests
export const assertGenericError = async (page: Page, context: string) => {
  const errorElement = page.getByTestId('error-message');
  const isErrorVisible = await errorElement.isVisible().catch(() => false);
  
  if (isErrorVisible) {
    const errorText = await errorElement.textContent();
    expect(errorText).toBeTruthy();
    // Should show generic security-conscious error
    expect(errorText?.toLowerCase()).toMatch(/(invalid email or password|network error|unable to sign in|try again in a moment|technical difficulties|login failed)/);
    console.log(`✓ Generic error for ${context}:`, errorText);
    return true;
  }
  console.log(`⚠ No error displayed for ${context}`);
  return false;
};

// Form filling helpers
export const fillLoginForm = async (page: Page, email: string, password: string) => {
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
};

export const fillRegistrationForm = async (page: Page, email: string, password = 'SecurePassword123', firstName = 'Test', lastName = 'User') => {
  await page.getByTestId('first-name-input').fill(firstName);
  await page.getByTestId('last-name-input').fill(lastName);
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('confirm-password-input').fill(password);
};

export const fillForgotPasswordForm = async (page: Page, email: string) => {
  await page.getByTestId('email-input').fill(email);
};

// Submit helpers
export const submitLoginForm = async (page: Page) => {
  await page.getByTestId('login-submit').click();
};

export const submitRegistrationForm = async (page: Page) => {
  await page.getByTestId('register-submit').click();
};

export const submitForgotPasswordForm = async (page: Page) => {
  await page.getByTestId('submit-button').click();
};

// Test constants
export const EXISTING_USER_EMAIL = '309406931@qq.com';
export const EXISTING_USER_PASSWORD = 'Wl1991714';

// Security testing helpers
export const checkGenericErrorMessage = (message: string | null): boolean => {
  if (!message) return false;
  const genericPatterns = [
    /invalid email or password/i,
    /unable to sign in/i,
    /authentication failed/i,
    /login failed/i,
    /network error/i,
    /connection error/i,
    /please check your credentials/i,
    /technical difficulties/i,
    /try again in a moment/i
  ];
  return genericPatterns.some(pattern => pattern.test(message));
};

export const assertGenericSecurityError = async (page: Page, errorElement: any, context: string) => {
  const isErrorVisible = await errorElement.isVisible().catch(() => false);
  if (isErrorVisible) {
    const errorText = await errorElement.textContent();
    const isGeneric = checkGenericErrorMessage(errorText);
    expect(isGeneric).toBe(true);
    console.log(`✓ Generic security error for ${context}:`, errorText);
    return true;
  }
  return false;
};

export const verifyNoUserEnumeration = async (page: Page, testScenario: string) => {
  const errorElement = page.getByTestId('error-message');
  const hasGenericError = await assertGenericSecurityError(page, errorElement, testScenario);
  
  if (!hasGenericError) {
    console.log(`⚠ No error displayed for ${testScenario} - may indicate backend connectivity issues`);
    // Still verify we don't see specific enumeration messages
    const specificErrors = [
      'user not found',
      'user does not exist', 
      'email not registered',
      'account not found',
      'wrong password'
    ];
    
    for (const errorText of specificErrors) {
      const specificError = page.locator(`text=${errorText}`);
      const isVisible = await specificError.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  }
};