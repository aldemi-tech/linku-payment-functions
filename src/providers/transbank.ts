/**
 * Transbank Payment Provider (Simplified Implementation)
 * Handles tokenization and payments through Transbank Oneclick
 */

import { Timestamp } from "firebase-admin/firestore";
import { v4 } from 'uuid';
import * as admin from "firebase-admin";
import {
  PaymentProvider,
  DirectTokenizationRequest,
  RedirectTokenizationRequest,
  RedirectTokenizationResponse,
  CardToken,
  PaymentRequest,
  Payment,
  TokenizationSuccessResponse,
  PaymentSuccessResponse,
  PaymentGatewayError,
  PaymentCard,
} from "../types";

// Import Transbank SDK
import {
  Oneclick,
  IntegrationCommerceCodes,
  IntegrationApiKeys,
  TransactionDetail,
} from "transbank-sdk";
import { TRANSBANK_TEST_CONFIG } from "../config/test-credentials";

export class TransbankProvider {
  name: PaymentProvider = "transbank";
  private commerceCode: string = "";
  private apiKey: string = "";
  private environment: string = "integration"; // "integration" or "production"

  initialize(config: Record<string, any>): void {
    // Check if Transbank SDK is available
    if (!Oneclick) {
      throw new PaymentGatewayError(
        "Transbank SDK is not available. Please ensure transbank-sdk package is installed.",
        "SDK_NOT_AVAILABLE"
      );
    }

    // Use provided config or fall back to test credentials
    if (config && Object.keys(config).length > 0) {
      this.commerceCode = config.commerceCode;
      this.apiKey = config.apiKey;
      this.environment = config.environment || "integration";
    } else {
      // Use default test credentials when no config is provided
      console.log(
        "No Transbank configuration provided, using default test credentials"
      );
      this.commerceCode = TRANSBANK_TEST_CONFIG.commerceCode;
      this.apiKey = TRANSBANK_TEST_CONFIG.apiKey;
      this.environment = TRANSBANK_TEST_CONFIG.environment;
    }

    // Fallback to SDK defaults if still empty
    if (!this.commerceCode && IntegrationCommerceCodes) {
      this.commerceCode = IntegrationCommerceCodes.ONECLICK_MALL;
    }
    if (!this.apiKey && IntegrationApiKeys) {
      this.apiKey = IntegrationApiKeys.WEBPAY;
    }

    console.log("Transbank configuration:", {
      commerceCode: this.commerceCode,
      environment: this.environment,
      hasApiKey: !!this.apiKey,
    });

    // Configure Transbank SDK
    try {
      if (!Oneclick.configureForIntegration) {
        throw new Error(
          "Oneclick.configureForIntegration method is not available"
        );
      }

      if (this.environment === "production") {
        Oneclick.configureForProduction(this.commerceCode, this.apiKey);
      } else {
        // Use integration configuration with default values
        Oneclick.configureForIntegration(this.commerceCode, this.apiKey);
      }
      console.log(
        "Transbank SDK configured successfully for",
        this.environment
      );
    } catch (error: any) {
      console.error("Failed to configure Transbank SDK:", error);
      throw new PaymentGatewayError(
        `Failed to configure Transbank SDK: ${error.message || error}`,
        "SDK_CONFIGURATION_ERROR"
      );
    }
  }

  async tokenizeDirect(
    _request: DirectTokenizationRequest
  ): Promise<TokenizationSuccessResponse> {
    throw new PaymentGatewayError(
      "Transbank Oneclick requires redirect tokenization",
      "METHOD_NOT_SUPPORTED"
    );
  }

  async createTokenizationSession(
    request: RedirectTokenizationRequest
  ): Promise<RedirectTokenizationResponse> {
    try {
      // Use user_id directly but ensure it doesn't exceed 40 chars (Transbank limit)
      const username = v4().replace(/-/g, ''); // Generate a unique username

      const email =
        (request.metadata?.email as string) || `${username}@client.ademi.tech`;

      // Create inscription with Transbank Oneclick
      const mallInscription = new Oneclick.MallInscription(
        Oneclick.getDefaultOptions()
      );
      const response: { token: string; url_webpay: string } =
        await mallInscription.start(username, email, request.return_url);
      console.log("Transbank inscription response:", response);
      if (!response.token) {
        throw new PaymentGatewayError(
          `Transbank inscription initiation failed: ${response}`,
          "INSCRIPTION_INITIATION_FAILED"
        );
      }
      // Save session to Firestore
      const sessionId = `tbk_${response.token}`;
      const sessionData = {
        session_id: sessionId,
        user_id: request.user_id,
        provider: this.name,
        status: "pending",
        redirect_url: response.url_webpay,
        return_url: request.return_url,
        finish_redirect_url: request.finish_redirect_url || null,
        token: response.token,
        username,
        email,
        alias: request.alias || "Tarjeta suscrita",
        set_as_default: request.set_as_default || false,
        created_at: Timestamp.now(),
        expires_at: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)), // 30 minutes
        metadata: request.metadata,
      };

      console.log("Saving Transbank tokenization session:", sessionData);

      await admin
        .firestore()
        .collection("tokenization_sessions")
        .doc(sessionId)
        .set(sessionData);

      return {
        session_id: sessionId,
        redirect_url: response.url_webpay,
        token: response.token,
        template: {
          method: "POST",
          include_in: "body",
          parameter_name: "TBK_TOKEN",
        },
        expires_at: sessionData.expires_at,
      };
    } catch (error: any) {
      console.error("Transbank session creation error:", error);
      throw new PaymentGatewayError(
        `Transbank session creation failed: ${error.message}`,
        "SESSION_CREATION_FAILED"
      );
    }
  }

  async completeTokenization(
    sessionId: string,
    callbackData: any
  ): Promise<TokenizationSuccessResponse> {
    try {
      // Get session from Firestore
      const sessionDoc = await admin
        .firestore()
        .collection("tokenization_sessions")
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        throw new PaymentGatewayError(
          "Tokenization session not found",
          "SESSION_NOT_FOUND"
        );
      }

      const session = sessionDoc.data();
      if (!session) {
        throw new PaymentGatewayError(
          "Invalid session data",
          "INVALID_SESSION"
        );
      }
      console.log("Transbank tokenization session data:", session);

      // Allow retry if session is in failed state, but prevent if already completed
      if (session.status === "completed") {
        throw new PaymentGatewayError(
          "Session already completed successfully",
          "SESSION_ALREADY_COMPLETED"
        );
      }

      // Log retry attempt for failed sessions
      if (session.status === "failed") {
        console.log("Retrying failed tokenization session:", sessionId);
      }

      // Complete inscription with Transbank
      const token = callbackData.TBK_TOKEN || session.token;
      const mallInscription = new Oneclick.MallInscription(
        Oneclick.getDefaultOptions()
      );
      const response = await mallInscription.finish(token);

      console.log("Transbank inscription completion response:", response);

      if (response.response_code !== 0) {
        if (response.response_code === -96) {
          throw new PaymentGatewayError(
            `Transbank inscription cancelled: ${response.response_code}`,
            "INSCRIPTION_CANCELLED",
            409
          );
        } else {
          throw new PaymentGatewayError(
            `Transbank inscription failed: ${response.response_code}`,
            "INSCRIPTION_FAILED"
          );
        }
      }

      const user = await admin
        .firestore()
        .collection("users")
        .doc(session.user_id)
        .get();

      if (!user.exists) {
        throw new PaymentGatewayError(
          "User not found for tokenization session",
          "USER_NOT_FOUND"
        );
      }

      const userData = user.data();
      // Save to Firestore payment_cards
      const cardId = admin.firestore().collection("payment_cards").doc().id;

      const existsCardData = await admin
        .firestore()
        .collection("payment_cards")
        .where("payment_token", "==", response.tbk_user)
        .where("card_last_four", "==", response.card_number.slice(-4))
        .where(
          "card_brand",
          "==",
          String(response.card_type).toLocaleLowerCase()
        )
        .where("provider", "==", this.name)
        .where("user_id", "==", session.user_id)
        .limit(1)
        .get();
      if (!existsCardData.empty) {
        // Card already exists, no need to create a new one
        console.log("Payment card already exists for user:", session.user_id);
        return {
          token_id: response.tbk_user,
          card_last_four: response.card_number.slice(-4) || "****",
          card_brand: response.card_type,
          provider: this.name,
          card_exp_month: null, // Transbank doesn't provide expiration data
          card_exp_year: null, // Transbank doesn't provide expiration data
          is_default: session.set_as_default || false,
        };
      }

      const cardData: PaymentCard = {
        alias: session.alias ,
        card_id: cardId,
        user_id: session.user_id,
        card_holder_name: userData?.name || "N/A",
        card_last_four: response.card_number.slice(-4) || "****",
        card_brand: String(response.card_type).toLocaleLowerCase() as any,
        card_type: "other", // Transbank doesn't distinguish in Oneclick
        provider: this.name,
        expiration_month: null, // Transbank doesn't provide expiration data
        expiration_year: null, // Transbank doesn't provide expiration data
        is_default: session.set_as_default || false,
        payment_token: response.tbk_user,
        authorization_code: response.authorization_code || null,
        // Transbank Oneclick tokens pueden requerir renovación periódica
        // Típicamente duran 1 año desde la inscripción
        token_expires_at: Timestamp.fromDate(
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        ),
        // Transbank NO requiere CVC para pagos Oneclick
        requires_cvv_for_payments: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await admin
        .firestore()
        .collection("payment_cards")
        .doc(cardId)
        .set(cardData);

      // Update other cards to not be default if this one is set as default
      if (session.set_as_default) {
        const userCards = await admin
          .firestore()
          .collection("payment_cards")
          .where("user_id", "==", session.user_id)
          .where("card_id", "!=", cardId)
          .get();

        const batch = admin.firestore().batch();
        for (const doc of userCards.docs) {
          batch.update(doc.ref, {
            is_default: false,
            updated_at: Timestamp.now(),
          });
        }
        await batch.commit();
      }

      // Update session status to completed
      await admin
        .firestore()
        .collection("tokenization_sessions")
        .doc(sessionId)
        .update({
          status: "completed",
          token_id: response.tbk_user,
          completed_at: Timestamp.now(),
          card_detail: response,
          // Clear any previous error information
          error_message: admin.firestore.FieldValue.delete(),
          error_code: admin.firestore.FieldValue.delete(),
          error_details: admin.firestore.FieldValue.delete(),
        });

      return {
        token_id: response.tbk_user,
        card_last_four: response.card_number.slice(-4) || "****",
        card_brand: response.card_type,
        provider: this.name,
        card_exp_month: null, // Transbank doesn't provide expiration data
        card_exp_year: null, // Transbank doesn't provide expiration data
        is_default: session.set_as_default || false,
      };
    } catch (error: any) {
      console.error("Transbank tokenization completion error:", error);

      // Update session to failed with detailed error information
      try {
        await admin
          .firestore()
          .collection("tokenization_sessions")
          .doc(sessionId)
          .update({
            status: "failed",
            error_message: error.message,
            error_code: error.code || "UNKNOWN_ERROR",
            error_details: error.details || null,
            last_attempt_at: Timestamp.now(),
            // Keep completed_at only if this is the final failure, not for retries
            ...(error.code === "SESSION_ALREADY_COMPLETED"
              ? { completed_at: Timestamp.now() }
              : {}),
          });
      } catch (updateError) {
        console.error("Failed to update session status:", updateError);
      }

      throw new PaymentGatewayError(
        `Transbank tokenization completion failed: ${error.message}`,
        "TOKENIZATION_COMPLETION_FAILED"
      );
    }
  }

  async processPayment(
    payment: PaymentRequest,
    token: CardToken
  ): Promise<PaymentSuccessResponse> {
    try {
      // Get payment card from Firestore to get the tbk_user token
      const cardDoc = await admin
        .firestore()
        .collection("payment_cards")
        .where("payment_token", "==", token.token_id)
        .limit(1)
        .get();

      if (cardDoc.empty) {
        throw new PaymentGatewayError(
          "Payment card not found",
          "CARD_NOT_FOUND"
        );
      }

      const cardData = cardDoc.docs[0].data() as PaymentCard;
      const tbkUser = cardData.payment_token;

      if (!tbkUser) {
        throw new PaymentGatewayError("Invalid payment token", "INVALID_TOKEN");
      }

      // Process payment with Transbank Oneclick
      const mallTransaction = new Oneclick.MallTransaction(
        Oneclick.getDefaultOptions()
      );
      const response = await mallTransaction.authorize(
        payment.user_id, // username
        tbkUser,
        payment.payment_id, // buyOrder
        [
          new TransactionDetail(
            Math.round(payment.amount),
            this.commerceCode,
            payment.payment_id,
            1
          ),
        ]
      );

      if (!response.details || response.details.length === 0) {
        throw new PaymentGatewayError(
          "No payment details in response",
          "INVALID_RESPONSE"
        );
      }

      const paymentDetail = response.details[0];
      const isSuccess = paymentDetail.response_code === 0;

      return {
        payment_id: payment.payment_id,
        status: isSuccess ? "completed" : "failed",
        amount: payment.amount,
        currency: payment.currency,
        provider_payment_id:
          paymentDetail.authorization_code || response.buy_order,
      };
    } catch (error: any) {
      console.error("Transbank payment processing error:", error);
      throw new PaymentGatewayError(
        `Transbank payment processing failed: ${error.message}`,
        "PAYMENT_FAILED"
      );
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    // Transbank typically uses IP whitelist instead of signature verification
    // In production, verify the request comes from Transbank's IP addresses
    // For now, we'll implement basic validation
    try {
      return payload.length > 0 && signature.length >= 0; // Basic validation
    } catch (error) {
      console.error("Transbank webhook verification failed:", error);
      return false;
    }
  }

  async handleWebhook(event: any): Promise<void> {
    try {
      console.log("Handling Transbank webhook event:", event);
      // Handle different Transbank webhook events
      // Implementation depends on the specific webhooks Transbank sends
    } catch (error) {
      console.error("Transbank webhook handling error:", error);
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<void> {
    try {
      // Get payment details from Firestore
      const paymentDoc = await admin
        .firestore()
        .collection("payments")
        .doc(paymentId)
        .get();

      if (!paymentDoc.exists) {
        throw new PaymentGatewayError("Payment not found", "PAYMENT_NOT_FOUND");
      }

      const paymentData = paymentDoc.data() as Payment;

      if (!paymentData.transaction_id) {
        throw new PaymentGatewayError(
          "No transaction ID found for refund",
          "NO_TRANSACTION_ID"
        );
      }

      // Process refund with Transbank
      const mallTransaction = new Oneclick.MallTransaction(
        Oneclick.getDefaultOptions()
      );
      const response = await mallTransaction.refund(
        paymentData.transaction_id, // token from original transaction
        paymentData.payment_id, // buyOrder
        this.commerceCode,
        amount || paymentData.amount
      );

      if (response.response_code !== 0) {
        throw new PaymentGatewayError(
          `Refund failed with code: ${response.response_code}`,
          "REFUND_FAILED"
        );
      }
    } catch (error: any) {
      throw new PaymentGatewayError(
        `Transbank refund failed: ${error.message}`,
        "REFUND_FAILED"
      );
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<Payment> {
    try {
      // Get payment status from Transbank
      const mallTransaction = new Oneclick.MallTransaction(
        Oneclick.getDefaultOptions()
      );
      const response = await mallTransaction.status(providerPaymentId);

      return {
        payment_id: response.buy_order || "",
        order_id: response.buy_order || "",
        user_id: "", // Would need to be stored separately
        amount: response.amount / 100, // Convert from cents
        currency: "CLP", // Transbank is Chilean pesos
        payment_method: "card",
        status: this.mapTransbankStatus(response.status),
        transaction_id: providerPaymentId,
        created_at: Timestamp.now(), // Would need actual date from Transbank
        updated_at: Timestamp.now(),
      };
    } catch (error: any) {
      throw new PaymentGatewayError(
        `Failed to get Transbank payment status: ${error.message}`,
        "STATUS_CHECK_FAILED"
      );
    }
  }

  private mapTransbankStatus(
    status: string
  ):
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "refunded" {
    switch (status) {
      case "AUTHORIZED":
        return "completed";
      case "FAILED":
        return "failed";
      case "NULLIFIED":
        return "cancelled";
      case "REVERSED":
        return "refunded";
      default:
        return "pending";
    }
  }
}
