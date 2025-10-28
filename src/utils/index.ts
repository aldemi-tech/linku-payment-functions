/**
 * Shared utilities for payment gateway
 */

import * as admin from "firebase-admin";
import * as crypto from "node:crypto";
import { PaymentGatewayError } from "../types";

// Export auth utilities
export * from './auth';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

/**
 * Validate card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Get card brand from card number
 */
export function getCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  
  if (digits.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  if (/^3(?:0[0-5]|[68])/.test(digits)) return "diners";
  if (/^(?:2131|1800|35)/.test(digits)) return "jcb";
  
  return "unknown";
}

/**
 * Mask card number (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  return `****${digits.slice(-4)}`;
}

/**
 * Validate expiration date
 */
export function validateExpirationDate(month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // If year is 2 digits, convert to 4 digits
  const fullYear = year < 100 ? 2000 + year : year;
  
  if (fullYear < currentYear) return false;
  if (fullYear === currentYear && month < currentMonth) return false;
  
  return true;
}

/**
 * Sanitize sensitive data for logging
 */
export function sanitizeForLog(data: any): any {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sensitiveFields = [
    "card_number",
    "card_cvv",
    "cvv",
    "password",
    "secret",
    "secretKey",
    "api_key",
    "apiKey",
  ];

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = "***REDACTED***";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Log with sanitization
 */
export function secureLog(message: string, data?: any): void {
  const sanitizedData = data ? sanitizeForLog(data) : undefined;
  console.log(message, sanitizedData);
}

/**
 * Validate webhook signature (generic implementation)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = "sha256"
): boolean {
  const hmac = crypto.createHmac(algorithm, secret);
  const expectedSignature = hmac.update(payload).digest("hex");
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle errors and convert to PaymentGatewayError
 */
export function handleError(error: any): PaymentGatewayError {
  if (error instanceof PaymentGatewayError) {
    return error;
  }

  secureLog("Unhandled error:", error);

  return new PaymentGatewayError(
    error.message || "An unexpected error occurred",
    error.code || "INTERNAL_ERROR",
    error.statusCode || 500,
    error.details
  );
}

/**
 * Validate required fields in request
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    throw new PaymentGatewayError(
      `Missing required fields: ${missingFields.join(", ")}`,
      "VALIDATION_ERROR",
      400,
      { missingFields }
    );
  }
}

/**
 * Create a Firestore timestamp from Date
 */
export function createTimestamp(date: Date = new Date()): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Add expiration time to current timestamp
 */
export function addExpirationTime(minutes: number): admin.firestore.Timestamp {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + minutes);
  return createTimestamp(expirationDate);
}

/**
 * Check if timestamp is expired
 */
export function isExpired(timestamp: admin.firestore.Timestamp): boolean {
  return timestamp.toDate() < new Date();
}

/**
 * Format currency amount (CLP by default)
 */
export function formatCurrency(amount: number, currency: string = "CLP"): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate HTML response for tokenization completion callbacks
 */
export function generateTokenizationHTML(
  success: boolean, 
  message: string, 
  redirectUrl?: string,
  cardInfo?: { last4?: string; brand?: string }
): string {
  const statusIcon = success ? "✅" : "❌";
  const statusColor = success ? "#28a745" : "#dc3545";
  const statusTitle = success ? "¡Tokenización Exitosa!" : "Error en Tokenización";
  
  let cardInfoHtml = "";
  if (success && cardInfo) {
    cardInfoHtml = `
      <div style="margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
        <strong>Tarjeta registrada:</strong><br>
        ${"•".repeat(12)} ${cardInfo.last4 || "****"}<br>
        <small style="color: #6c757d;">${cardInfo.brand || "Tarjeta"}</small>
      </div>
    `;
  }

  const redirectScript = redirectUrl ? `
    <script>
      setTimeout(function() {
        window.location.href = "${redirectUrl}";
      }, 3000);
    </script>
  ` : "";

  const redirectMessage = redirectUrl ? 
    `<p style="color: #6c757d; font-size: 14px;">Redirigiendo automáticamente en 3 segundos...</p>` : "";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusTitle}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
                width: 100%;
            }
            .status-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }
            .title {
                color: ${statusColor};
                margin-bottom: 15px;
                font-size: 24px;
                font-weight: 600;
            }
            .message {
                color: #333;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            .redirect-button {
                background-color: ${statusColor};
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin-top: 10px;
            }
            .redirect-button:hover {
                opacity: 0.9;
            }
        </style>
        ${redirectScript}
    </head>
    <body>
        <div class="container">
            <div class="status-icon">${statusIcon}</div>
            <h1 class="title">${statusTitle}</h1>
            <div class="message">${message}</div>
            ${cardInfoHtml}
            ${redirectMessage}
            ${redirectUrl ? `<a href="${redirectUrl}" class="redirect-button">Continuar</a>` : ""}
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML response for webhook callbacks
 */
export function generateWebhookHTML(
  success: boolean,
  message: string,
  redirectUrl?: string,
  paymentInfo?: { amount?: number; currency?: string; paymentId?: string }
): string {
  const statusIcon = success ? "✅" : "❌";
  const statusColor = success ? "#28a745" : "#dc3545";
  const statusTitle = success ? "¡Pago Procesado!" : "Error en Pago";
  
  let paymentInfoHtml = "";
  if (success && paymentInfo) {
    paymentInfoHtml = `
      <div style="margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
        <strong>Pago procesado:</strong><br>
        ${paymentInfo.amount ? formatCurrency(paymentInfo.amount, paymentInfo.currency) : ""}<br>
        <small style="color: #6c757d;">ID: ${paymentInfo.paymentId || "N/A"}</small>
      </div>
    `;
  }

  const redirectScript = redirectUrl ? `
    <script>
      setTimeout(function() {
        window.location.href = "${redirectUrl}";
      }, 3000);
    </script>
  ` : "";

  const redirectMessage = redirectUrl ? 
    `<p style="color: #6c757d; font-size: 14px;">Redirigiendo automáticamente en 3 segundos...</p>` : "";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusTitle}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
                width: 100%;
            }
            .status-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }
            .title {
                color: ${statusColor};
                margin-bottom: 15px;
                font-size: 24px;
                font-weight: 600;
            }
            .message {
                color: #333;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            .redirect-button {
                background-color: ${statusColor};
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin-top: 10px;
            }
            .redirect-button:hover {
                opacity: 0.9;
            }
        </style>
        ${redirectScript}
    </head>
    <body>
        <div class="container">
            <div class="status-icon">${statusIcon}</div>
            <h1 class="title">${statusTitle}</h1>
            <div class="message">${message}</div>
            ${paymentInfoHtml}
            ${redirectMessage}
            ${redirectUrl ? `<a href="${redirectUrl}" class="redirect-button">Continuar</a>` : ""}
        </div>
    </body>
    </html>
  `;
}
