import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { PaymentProviderFactory } from "../providers/factory";
import {
  PaymentRequest,
  CardToken,
  PaymentGatewayError,
  PaymentCard,
} from "../types";

const db = admin.firestore();

// Utility functions
const validateRequiredFields = (data: any, fields: string[]) => {
  const missing = fields.filter((field) => !data[field]);
  if (missing.length > 0) {
    throw new PaymentGatewayError(
      `Missing required fields: ${missing.join(", ")}`,
      "VALIDATION_ERROR",
      400
    );
  }
};

const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
};

const createTimestamp = () => Timestamp.now();

export class PaymentService {
  /**
   * Procesa un pago con el proveedor correspondiente
   */
  static async processPayment(data: PaymentRequest, metadata: any) {
    // Validate required fields
    validateRequiredFields(data, [
      "user_id",
      "professional_id",
      "service_request_id",
      "amount",
      "currency",
      "provider",
      "description",
    ]);

    // Require either token_id or session_id
    if (!data.token_id && !data.session_id) {
      throw new PaymentGatewayError(
        "Either token_id or session_id is required",
        "VALIDATION_ERROR",
        400
      );
    }

    console.log("Processing payment", {
      user_id: data.user_id,
      amount: data.amount,
      provider: data.provider,
      metadata: metadata,
    });

    // Get or create payment record
    const paymentId = data.payment_id || generateId("payment");
    const paymentData = {
      ...data,
      payment_id: paymentId,
      status: "processing" as const,
      metadata: metadata,
      created_at: createTimestamp(),
      updated_at: createTimestamp(),
    };

    await db.collection("payments").doc(paymentId).set(paymentData);

    try {
      // Get payment card token
      const token = await this.getPaymentToken(data);

      // Process payment with provider
      const provider = PaymentProviderFactory.getProvider(data.provider);
      const result = await provider.processPayment(paymentData, token);

      return result;
    } catch (error) {
      // Update payment status to failed
      await db
        .collection("payments")
        .doc(paymentId)
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          updated_at: createTimestamp(),
        })
        .catch(() => {
          // Ignore errors updating payment
        });
      
      throw error;
    }
  }

  /**
   * Obtiene el token de pago desde token_id o session_id
   */
  private static async getPaymentToken(data: PaymentRequest): Promise<CardToken> {
    if (data.token_id) {
      return await this.getTokenFromCardId(data.token_id, data.user_id, data.provider);
    } else if (data.session_id) {
      return await this.getTokenFromSession(data.session_id, data.user_id, data.provider);
    } else {
      throw new PaymentGatewayError(
        "Either token_id or session_id is required",
        "VALIDATION_ERROR",
        400
      );
    }
  }

  /**
   * Obtiene el token desde card_id o payment_token
   */
  private static async getTokenFromCardId(tokenId: string, userId: string, provider: string): Promise<CardToken> {
    // Find card by card_id or payment_token
    let cardDoc = await db
      .collection("payment_cards")
      .doc(tokenId)
      .get();

    if (!cardDoc.exists) {
      // Try to find by payment_token
      const cardsSnapshot = await db
        .collection("payment_cards")
        .where("payment_token", "==", tokenId)
        .where("user_id", "==", userId)
        .limit(1)
        .get();

      if (cardsSnapshot.empty) {
        throw new PaymentGatewayError(
          "Payment card not found",
          "NOT_FOUND",
          404
        );
      }

      cardDoc = cardsSnapshot.docs[0];
    }

    const paymentCard = cardDoc.data() as PaymentCard;

    // Verify card belongs to user
    if (paymentCard.user_id !== userId) {
      throw new PaymentGatewayError("Unauthorized", "UNAUTHORIZED", 403);
    }

    return this.convertPaymentCardToToken(paymentCard, provider);
  }

  /**
   * Obtiene el token desde una sesión completada
   */
  private static async getTokenFromSession(sessionId: string, userId: string, provider: string): Promise<CardToken> {
    const sessionQuery = await db
      .collection("tokenization_sessions")
      .where("session_id", "==", sessionId)
      .where("status", "==", "completed")
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      throw new PaymentGatewayError(
        "Tokenization session not found or not completed",
        "NOT_FOUND",
        404
      );
    }

    const session = sessionQuery.docs[0].data();
    if (session.user_id !== userId) {
      throw new PaymentGatewayError("Unauthorized", "UNAUTHORIZED", 403);
    }

    if (!session.token_id) {
      throw new PaymentGatewayError(
        "No token available in session",
        "INVALID_STATE",
        400
      );
    }

    // Get token from session
    const cardDoc = await db
      .collection("payment_cards")
      .doc(session.token_id)
      .get();

    if (!cardDoc.exists) {
      throw new PaymentGatewayError(
        "Payment card not found",
        "NOT_FOUND",
        404
      );
    }

    const paymentCard = cardDoc.data() as PaymentCard;
    return this.convertPaymentCardToToken(paymentCard, provider);
  }

  /**
   * Convierte PaymentCard a CardToken compatible con providers
   */
  private static convertPaymentCardToToken(paymentCard: PaymentCard, provider: string): CardToken {
    return {
      token_id: paymentCard.payment_token || paymentCard.card_id,
      user_id: paymentCard.user_id,
      provider: provider as any,
      card_last4: paymentCard.card_last_four,
      card_brand: paymentCard.card_brand,
      card_exp_month: paymentCard.expiration_month,
      card_exp_year: paymentCard.expiration_year,
      card_holder_name: paymentCard.card_holder_name,
      is_default: paymentCard.is_default,
      created_at: paymentCard.created_at,
      updated_at: paymentCard.updated_at,
    };
  }

  /**
   * Procesa un reembolso
   */
  static async refundPayment(paymentId: string, amount: number | undefined, userId: string, metadata: any) {
    validateRequiredFields({ payment_id: paymentId }, ["payment_id"]);

    console.log("Refunding payment", { 
      payment_id: paymentId,
      metadata: metadata,
    });

    // Get payment
    const paymentDoc = await db
      .collection("payments")
      .doc(paymentId)
      .get();

    if (!paymentDoc.exists) {
      throw new PaymentGatewayError("Payment not found", "NOT_FOUND", 404);
    }

    const payment = paymentDoc.data() as PaymentRequest;

    // Verify user is authorized (either client or professional)
    if (
      payment.user_id !== userId &&
      payment.professional_id !== userId
    ) {
      throw new PaymentGatewayError("Unauthorized", "UNAUTHORIZED", 403);
    }

    const provider = PaymentProviderFactory.getProvider(payment.provider);
    await provider.refundPayment(paymentId, amount);

    // Update payment with refund metadata
    await paymentDoc.ref.update({
      refund_metadata: metadata,
      refunded_at: createTimestamp(),
      updated_at: createTimestamp(),
    });

    return {
      message: "Payment refunded successfully",
      payment_id: paymentId,
    };
  }
}