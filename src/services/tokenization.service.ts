import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { PaymentProviderFactory } from "../providers/factory";
import {
  DirectTokenizationRequest,
  RedirectTokenizationRequest,
  PaymentProvider,
  PaymentGatewayError,
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

const createTimestamp = () => Timestamp.now();

export class TokenizationService {
  /**
   * Tokeniza una tarjeta directamente sin sesión
   */
  static async tokenizeDirect(data: DirectTokenizationRequest, metadata: any) {
    // Validate required fields
    validateRequiredFields(data, [
      "user_id",
      "provider",
      "card_number",
      "card_exp_month",
      "card_exp_year",
      "card_cvv",
      "card_holder_name",
    ]);

    console.log("Direct tokenization request", {
      user_id: data.user_id,
      provider: data.provider,
      metadata: metadata,
    });

    const provider = PaymentProviderFactory.getProvider(data.provider);
    const result = await provider.tokenizeDirect(data);

    // Save tokenization session with metadata
    if (result.token_id) {
      await db.collection("tokenization_sessions").add({
        user_id: data.user_id,
        provider: data.provider,
        token_id: result.token_id,
        type: 'direct',
        status: 'completed',
        metadata: metadata,
        created_at: createTimestamp(),
      });
    }

    return result;
  }

  /**
   * Crea una sesión de tokenización
   */
  static async createSession(data: RedirectTokenizationRequest, metadata: any) {
    console.log("Create tokenization session request", data);

    // Validate required fields
    validateRequiredFields(data, ["user_id", "provider", "return_url"]);

    console.log("Creating tokenization session", {
      user_id: data.user_id,
      provider: data.provider,
      metadata: metadata,
    });

    const provider = PaymentProviderFactory.getProvider(data.provider);
    const result = await provider.createTokenizationSession(data);

    // Save tokenization session with metadata
    if (result.session_id) {
      await db.collection("tokenization_sessions").doc(result.session_id).set({
        user_id: data.user_id,
        provider: data.provider,
        session_id: result.session_id,
        type: 'redirect',
        status: 'pending',
        return_url: data.return_url,
        set_as_default: data.set_as_default || false,
        metadata: metadata,
        created_at: createTimestamp(),
      });
    }

    return result;
  }

  /**
   * Completa el proceso de tokenización
   */
  static async completeTokenization(
    session_id: string,
    callbackData: any,
    provider: PaymentProvider,
    metadata: any
  ) {
    console.log("Complete tokenization called with", {
      session_id,
      callbackData,
      provider,
      metadata,
    });
    validateRequiredFields({ session_id, provider }, ["session_id", "provider"]);

    console.log("Completing tokenization", {
      session_id: session_id,
      provider: provider,
      metadata: metadata,
    });

    // Verify session belongs to authenticated user
    const sessionQuery = await db
      .collection("tokenization_sessions")
      .where("session_id", "==", session_id)
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      throw new PaymentGatewayError("Session not found", "NOT_FOUND", 404);
    }

    const sessionDoc = sessionQuery.docs[0];
    const session = sessionDoc.data();
    if (!session?.user_id) {
      throw new PaymentGatewayError("Unauthorized", "UNAUTHORIZED", 403);
    }

    const paymentProvider = PaymentProviderFactory.getProvider(provider);
    const result = await paymentProvider.completeTokenization(session_id, callbackData);

    // Note: Session status update is handled by the individual provider
    // Each provider manages its own completion logic and status updates
    
    return result;
  }

  /**
   * Valida que el proveedor sea válido para tokenización
   */
  static validateProvider(providerRequest: string | undefined): void {
    if (
      !providerRequest ||
      !["stripe", "transbank", "mercadopago"].includes(providerRequest)
    ) {
      throw new PaymentGatewayError(
        "Invalid provider. Use: {stripe|transbank|mercadopago}",
        "VALIDATION_ERROR",
        400
      );
    }
  }
}