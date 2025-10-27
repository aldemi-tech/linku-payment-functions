import { Request, Response } from "express";
import express from "express";
import {
    DirectTokenizationRequest,
    RedirectTokenizationRequest,
    PaymentProvider,
    ApiResponse,
    PaymentGatewayError,
} from "../types";
import { validateRequest } from "../utils";
import { TokenizationService } from "../services/tokenization.service";
import { PaymentProviderFactory } from "../providers/factory";

const handleError = (error: any): PaymentGatewayError => {
    if (error instanceof PaymentGatewayError) {
        return error;
    }
    console.error("Unexpected error:", error);
    return new PaymentGatewayError(
        "An unexpected error occurred",
        "INTERNAL_ERROR",
        500,
        error
    );
};

/**
 * Tokeniza una tarjeta directamente sin sesión
 */
export const tokenizeCardDirect = async (req: Request, res: Response) => {
    try {
        // Validate request method
        if (req.method !== 'POST') {
            res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST method is allowed' }
            });
            return;
        }

        // Validate authentication and user agent
        const { user, metadata } = await validateRequest(req);
        const data: DirectTokenizationRequest = req.body;

        // Validate user_id matches authenticated user
        if (data.user_id !== user.uid) {
            throw new PaymentGatewayError("Unauthorized", "UNAUTHORIZED", 403);
        }

        // Use service to handle business logic
        const result = await TokenizationService.tokenizeDirect(data, metadata);

        const response: ApiResponse = {
            success: true,
            data: result,
        };

        res.status(200).json(response);
    } catch (error: any) {
        const gatewayError = handleError(error);
        const response: ApiResponse = {
            success: false,
            error: {
                code: gatewayError.code,
                message: gatewayError.message,
                details: gatewayError.details,
            },
        };
        res.status(gatewayError.statusCode || 500).json(response);
    }
};

/**
 * Crea una sesión de tokenización
 */
export const createTokenizationSession = async (req: Request, res: Response) => {
    try {
        console.log("Received tokenization session request", req.body, req.headers);
        // Validate request method
        if (req.method !== 'POST') {
            res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST method is allowed' }
            });
            return;
        }

        // Validate authentication and user agent
        const { user, metadata } = await validateRequest(req);
        const data: RedirectTokenizationRequest = req.body;

        console.log("Create tokenization session request", data, req.headers);

        // Validate user_id matches authenticated user
        if (data.user_id !== user.uid) {
            throw new PaymentGatewayError("Unauthorized", "UNAUTHORIZED", 403);
        }

        // Use service to handle business logic
        const result = await TokenizationService.createSession(data, metadata);

        const response: ApiResponse = {
            success: true,
            data: result,
        };

        res.status(200).json(response);
    } catch (error: any) {
        const gatewayError = handleError(error);
        const response: ApiResponse = {
            success: false,
            error: {
                code: gatewayError.code,
                message: gatewayError.message,
                details: gatewayError.details,
            },
        };
        res.status(gatewayError.statusCode || 500).json(response);
    }
};

/**
 * Completa el proceso de tokenización
 */
export const completeTokenization = express();
completeTokenization.use(express.json()); // importante para leer req.body
completeTokenization.post("/:provider", async (req: Request, res: Response) => {
    try {

        console.log("Received tokenization completion request", req.body, req.headers, req.params);
        const provider = req.params.provider?.toLowerCase() as PaymentProvider;

        if (!["stripe", "transbank", "mercadopago"].includes(provider)) {
            return res.status(400).json({
                error: "Invalid provider. Use: /webhook/{stripe|transbank|mercadopago}",
            });
        }

        if (!PaymentProviderFactory.isProviderAvailable(provider)) {
            return res.status(400).json({
                error: `Provider '${provider}' is not configured or available`,
            });
        }

        const paymentProvider = PaymentProviderFactory.getProvider(provider);

        if (provider === "stripe") {
            const signature = req.headers["stripe-signature"] as string;
            const payload = JSON.stringify(req.body);
            if (!paymentProvider.verifyWebhook(payload, signature)) {
                return res.status(401).json({ error: "Invalid signature" });
            }
        }

        await paymentProvider.handleWebhook(req.body);

        console.log(`${provider} webhook processed successfully`);
        return res.status(200).json({
            received: true,
            provider,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Webhook error:", error);
        return res.status(500).json({ 
            error: "Webhook processing failed", 
            message: error.message 
        });
    }
});