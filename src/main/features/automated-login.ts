/**
 * Automated Login Module
 * Updated to handle LinkedIn's "Sign in to view more jobs" modal.
 */

import { fetchLatestOTP } from './secretary-service';
import { logAction } from '../database';

export async function handleLoginRoadblock(page: any, credentials: any, userId: number) {
  console.log('Login: Attempting automated login...');
  try {
    // 1. Handle Cookie Consent
    const cookieButton = 'button[data-tracking-control-name="ga-cookie-banner-accept"], button.artdeco-button--primary';
    try {
      await page.waitForSelector(cookieButton, { timeout: 3000 });
      await page.click(cookieButton);
    } catch (e) {}

    // 2. Handle Modal
    const modalSignInButton = 'button.authwall-join-form__form-toggle--vis, button[data-tracking-control-name="public_jobs_authwall-base_sign-in-button"]';
    const isModalPresent = await page.evaluate((sel: string) => !!document.querySelector(sel), modalSignInButton);
    if (isModalPresent) {
      await page.click(modalSignInButton);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 3. Fill Credentials
    const userSelector = '#username, #session_key, input[name="session_key"], input[type="email"]';
    const passSelector = '#password, #session_password, input[name="session_password"], input[type="password"]';
    const submitSelector = 'button[type="submit"], .login__form_action_container button, .btn__primary--large';

    await page.waitForSelector(userSelector, { timeout: 10000 });
    await page.type(userSelector, credentials.email, { delay: 100 });
    await page.type(passSelector, credentials.password, { delay: 100 });
    
    // 4. Click
    await page.waitForSelector(submitSelector, { timeout: 5000 });
    await page.evaluate((sel: string) => {
      const btn = document.querySelector(sel) as HTMLElement;
      if (btn) { btn.scrollIntoView(); btn.click(); }
    }, submitSelector);

    // 5. Check for OTP
    await new Promise(resolve => setTimeout(resolve, 5000));
    const isOTPRequested = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('verification code') || text.includes('otp') || !!document.querySelector('input[name="pin"]');
    });
    
    if (isOTPRequested) {
      await logAction(userId, 'ai_secretary', '📧 Login requires OTP. Secretary is searching email...', 'in_progress');
      const otp = await fetchLatestOTP(userId);
      if (otp) {
        const otpInput = 'input[name="pin"], #input-otp, .input_verification_pin';
        await page.waitForSelector(otpInput, { timeout: 5000 });
        await page.type(otpInput, otp, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Login Error:', error);
    return { success: false };
  }
}