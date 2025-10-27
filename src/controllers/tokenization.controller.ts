import { Request, Response } from "express";
import {
    DirectTokenizationRequest,
    RedirectTokenizationRequest,
    PaymentProvider,
    ApiResponse,
    PaymentGatewayError,
} from "../types";
import { validateRequest } from "../utils";
import { TokenizationService } from "../services/tokenization.service";

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
 * Función base para completar tokenización que puede ser reutilizada por proveedor
 */
const completeTokenizationBase = async (req: Request, res: Response, provider: PaymentProvider) => {
  try {
    console.log("Received complete tokenization request", req.body, req.headers, req.method);

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
    const data: { session_id: string; callback_data: any; provider: PaymentProvider } = req.body;

    // Use service to handle business logic
    const result = await TokenizationService.completeTokenization(
      data.session_id,
      data.callback_data,
      provider,
      user.uid,
      metadata
    );

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
 * Completa el proceso de tokenización para Stripe
 */
export const completeTokenizationStripe = async (req: Request, res: Response) => {
  await completeTokenizationBase(req, res, "stripe");
};

/**
 * Completa el proceso de tokenización para Transbank
 */
export const completeTokenizationTransbank = async (req: Request, res: Response) => {
  await completeTokenizationBase(req, res, "transbank");
};

/**
 * Completa el proceso de tokenización para MercadoPago
 */
export const completeTokenizationMercadoPago = async (req: Request, res: Response) => {
  await completeTokenizationBase(req, res, "mercadopago");
};