import { PaymentProviderFactory } from "../providers/factory";
import { PaymentProvider, PaymentGatewayError } from "../types";

export class WebhookService {
  /**
   * Procesa un webhook de proveedor de pago
   */
  static async processWebhook(
    provider: string,
    payload: any,
    signature?: string
  ): Promise<{ received: boolean; provider: string; timestamp: string }> {
    // Validate provider
    if (!provider || !["stripe", "transbank", "mercadopago"].includes(provider)) {
      throw new PaymentGatewayError(
        "Invalid provider. Use: /webhook/{stripe|transbank|mercadopago}",
        "VALIDATION_ERROR",
        400
      );
    }

    // Check if provider is available
    if (!PaymentProviderFactory.isProviderAvailable(provider as PaymentProvider)) {
      throw new PaymentGatewayError(
        `Provider '${provider}' is not configured or available`,
        "PROVIDER_NOT_AVAILABLE",
        400
      );
    }

    const paymentProvider = PaymentProviderFactory.getProvider(provider as PaymentProvider);

    // Handle Stripe signature verification
    if (provider === "stripe") {
      if (!signature) {
        throw new PaymentGatewayError(
          "Stripe signature is required",
          "VALIDATION_ERROR", 
          400
        );
      }

      const payloadString = JSON.stringify(payload);
      if (!paymentProvider.verifyWebhook(payloadString, signature)) {
        throw new PaymentGatewayError(
          "Invalid signature",
          "UNAUTHORIZED",
          401
        );
      }
    }

    // Process webhook
    await paymentProvider.handleWebhook(payload);

    console.log(`${provider} webhook processed successfully`);
    
    return {
      received: true,
      provider: provider,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extrae el proveedor desde la URL path
   */
  static extractProviderFromPath(path: string): string {
    const pathParts = path.split("/");
    return pathParts.at(-1)?.toLowerCase() || "";
  }
}