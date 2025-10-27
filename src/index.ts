/**
 * Payment Gateway Cloud Functions
 * Main entry point for all payment-related functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Import configuration loader - this will automatically initialize providers
import "./config/provider-config";

// Import controllers
import { 
  tokenizeCardDirect, 
  createTokenizationSession,
  completeTokenizationStripe,
  completeTokenizationTransbank,
  completeTokenizationMercadoPago
} from "./controllers/tokenization.controller";
import { 
  processPayment, 
  refundPayment 
} from "./controllers/payment.controller";
import { 
  handleWebhook,
  handleWebhookStripe,
  handleWebhookTransbank,
  handleWebhookMercadoPago
} from "./controllers/webhook.controller";
import { 
  getExecutionLocation, 
  getAvailableProviders 
} from "./controllers/utilities.controller";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// ==================== TOKENIZATION FUNCTIONS ====================

/**
 * Tokeniza una tarjeta directamente sin sesión
 */
export const paymentTokenizeCardDirect = functions.https.onRequest(tokenizeCardDirect);

/**
 * Crea una sesión de tokenización
 */
export const paymentCreateTokenizationSession = functions.https.onRequest(createTokenizationSession);

/**
 * Completa el proceso de tokenización para Stripe
 */
export const paymentCompleteTokenizationStripe = functions.https.onRequest(completeTokenizationStripe);

/**
 * Completa el proceso de tokenización para Transbank
 */
export const paymentCompleteTokenizationTransbank = functions.https.onRequest(completeTokenizationTransbank);

/**
 * Completa el proceso de tokenización para MercadoPago
 */
export const paymentCompleteTokenizationMercadoPago = functions.https.onRequest(completeTokenizationMercadoPago);

// ==================== PAYMENT FUNCTIONS ====================

/**
 * Procesa un pago con el proveedor correspondiente
 */
export const paymentProcessPayment = functions.https.onRequest(processPayment);

/**
 * Refund a payment
 */
export const paymentRefundPayment = functions.https.onRequest(refundPayment);

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get execution location and environment info
 */
export const paymentGetExecutionLocation = functions.https.onRequest(getExecutionLocation);

/**
 * Get available payment providers and their information
 */
export const paymentGetAvailableProviders = functions.https.onRequest(getAvailableProviders);

// ==================== WEBHOOK HANDLERS ====================

/**
 * Webhook handler for Stripe
 */
export const paymentWebhookStripe = functions.https.onRequest(handleWebhookStripe);

/**
 * Webhook handler for Transbank
 */
export const paymentWebhookTransbank = functions.https.onRequest(handleWebhookTransbank);

/**
 * Webhook handler for MercadoPago
 */
export const paymentWebhookMercadoPago = functions.https.onRequest(handleWebhookMercadoPago);

/**
 * Unified webhook handler for all payment providers (mantener compatibilidad)
 * Route: /webhook/{provider} where provider is: stripe, transbank, mercadopago
 */
export const paymentWebhook = functions.https.onRequest(handleWebhook);
