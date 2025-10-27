import { Request, Response } from "express";
import { WebhookService } from "../services/webhook.service";

/**
 * Unified webhook handler for all payment providers
 * Route: /webhook/{provider} where provider is: stripe, transbank, mercadopago
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Extract provider from URL path
    const provider = WebhookService.extractProviderFromPath(req.path);

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
      provider: req.path,
      error: error.message,
      stack: error.stack,
    });

    res.status(error.statusCode || 500).json({
      error: error.message || "Webhook processing failed",
      message: error.message,
    });
  }
};