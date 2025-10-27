import * as functions from "firebase-functions";
import { PaymentProviderFactory } from "../providers/factory";
import { PaymentProviderConfig } from "../types";

/**
 * Configuración centralizada de proveedores de pago
 * Maneja la inicialización lazy de todos los proveedores disponibles
 */
export class PaymentProvidersLoader {
  /**
   * Carga e inicializa las configuraciones de todos los proveedores disponibles
   */
  static loadProviderConfigurations(): void {
    const configs: PaymentProviderConfig[] = [];

    // Stripe configuration (if available)
    const stripeConfig = this.loadStripeConfig();
    if (stripeConfig) {
      configs.push(stripeConfig);
      console.log("Stripe configuration loaded");
    }

    // Transbank configuration (if available)
    const transbankConfig = this.loadTransbankConfig();
    if (transbankConfig) {
      configs.push(transbankConfig);
      console.log("Transbank configuration loaded");
    }

    // MercadoPago configuration (if available)
    const mercadoPagoConfig = this.loadMercadoPagoConfig();
    if (mercadoPagoConfig) {
      configs.push(mercadoPagoConfig);
      console.log("MercadoPago configuration loaded");
    }

    // Store configurations for lazy initialization
    PaymentProviderFactory.initialize(configs);
    console.log(`Payment gateway ready - ${configs.length} provider config(s) loaded`);
  }

  /**
   * Carga la configuración de Stripe desde variables de entorno o Firebase config
   */
  private static loadStripeConfig(): PaymentProviderConfig | null {
    const secretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      return null;
    }

    return {
      provider: "stripe",
      method: "direct",
      publicKey: functions.config().stripe?.public_key || process.env.STRIPE_PUBLIC_KEY,
      secretKey: secretKey,
      webhookSecret: functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET,
      enabled: true,
    };
  }

  /**
   * Carga la configuración de Transbank desde variables de entorno o Firebase config
   */
  private static loadTransbankConfig(): PaymentProviderConfig | null {
    const apiKey = functions.config().transbank?.api_key || process.env.TRANSBANK_API_KEY;
    
    if (!apiKey) {
      return null;
    }

    return {
      provider: "transbank",
      method: "redirect",
      commerceCode: functions.config().transbank?.commerce_code || process.env.TRANSBANK_COMMERCE_CODE,
      apiKey: apiKey,
      environment: functions.config().transbank?.environment || process.env.TRANSBANK_ENVIRONMENT || "integration",
      enabled: true,
    };
  }

  /**
   * Carga la configuración de MercadoPago desde variables de entorno o Firebase config
   */
  private static loadMercadoPagoConfig(): PaymentProviderConfig | null {
    const accessToken = functions.config().mercadopago?.access_token || process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      return null;
    }

    return {
      provider: "mercadopago",
      method: "direct",
      accessToken: accessToken,
      environment: functions.config().mercadopago?.environment || process.env.MERCADOPAGO_ENVIRONMENT || "sandbox",
      enabled: true,
    };
  }
}

/**
 * Inicializa automáticamente los proveedores al cargar el módulo
 */
PaymentProvidersLoader.loadProviderConfigurations();