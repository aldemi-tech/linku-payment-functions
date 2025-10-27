import { Request, Response } from "express";
import { WebhookService } from "../services/webhook.service";

/**
 * Función base para manejar webhooks que puede ser reutilizada por proveedor
 */
const handleWebhookBase = async (req: Request, res: Response, provider: string) => {
  try {
    console.log(`Received webhook for provider ${provider}`, req.body, req.headers, req.method);
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Get signature for Stripe
    const signature = req.headers["stripe-signature"] as string;

    // Use service to process webhook
    const result = await WebhookService.processWebhook(
      provider,
      req.body,
      signature
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error(`Webhook processing error:`, {
      provider: provider,
      error: error.message,
      stack: error.stack,
    });

    res.status(error.statusCode || 500).json({
      error: error.message || "Webhook processing failed",
      message: error.message,
    });
  }
};

/**
 * Webhook handler for Stripe
 */
export const handleWebhookStripe = async (req: Request, res: Response) => {
  await handleWebhookBase(req, res, "stripe");
};

/**
 * Webhook handler for Transbank
 */
export const handleWebhookTransbank = async (req: Request, res: Response) => {
  await handleWebhookBase(req, res, "transbank");
};

/**
 * Webhook handler for MercadoPago
 */
export const handleWebhookMercadoPago = async (req: Request, res: Response) => {
  await handleWebhookBase(req, res, "mercadopago");
};

/**
 * Unified webhook handler for all payment providers (mantener compatibilidad)
 * Route: /webhook/{provider} where provider is: stripe, transbank, mercadopago
 */
export const handleWebhook = async (req: Request, res: Response) => {
  // Extract provider from URL path
  const provider = WebhookService.extractProviderFromPath(req.path);
  await handleWebhookBase(req, res, provider);
};