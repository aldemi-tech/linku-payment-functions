import { Request, Response } from "express";
import {
  DirectTokenizationRequest,
  RedirectTokenizationRequest,
  PaymentProvider,
  ApiResponse,
  PaymentGatewayError,
} from "../types";
import { validateRequest, validateRequestCallbacks, generateTokenizationHTML } from "../utils";
import { TokenizationService } from "../services/tokenization.service";
import * as admin from "firebase-admin";

const handleError = (error: any): PaymentGatewayError => {
  if (error instanceof PaymentGatewayError) {
    return error;
  }
  console.error("Unexpected error:", error);
  return new PaymentGatewayError(
    "An unexpected error occurred",
    "INTERNAL_ERROR",
    error.statusCode || 500,
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
    console.log("Received complete tokenization request", req.body, req.query, req.headers, req.method);

    // Validate request method
    if (req.method !== 'POST' && req.method !== 'GET') {
      res.status(405).json({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST and GET methods are allowed' }
      });
      return;
    }

    // Validate authentication and user agent
    const { metadata } = await validateRequestCallbacks(req);
    
    // Handle different provider callback formats
    let sessionId: string;
    let callbackData: any;
    
    if (provider === "transbank") {
      const tbkData = req.query as { TBK_ID_SESION: string; TBK_ORDEN_COMPRA: string; TBK_TOKEN: string };
      sessionId = `tbk_${tbkData.TBK_TOKEN}`;
      callbackData = tbkData;
    } else {
      // For Stripe and MercadoPago, session_id is passed directly
      const genericData = req.query as { session_id?: string; [key: string]: any };
      sessionId = genericData.session_id || "";
      callbackData = genericData;
    }
    
    console.log("Complete tokenization data", { sessionId, callbackData, provider });
    
    // Use service to handle business logic
    const result = await TokenizationService.completeTokenization(
      sessionId,
      callbackData,
      provider,
      metadata
    );

    // Get session to retrieve finish_redirect_url
    const sessionDoc = await admin.firestore().collection("tokenization_sessions").doc(sessionId).get();
    const sessionData = sessionDoc.data();
    const finishRedirectUrl = sessionData?.finish_redirect_url;

    // Generate HTML response for user-facing callback
    const html = generateTokenizationHTML(
      true,
      "Tu tarjeta ha sido registrada exitosamente.",
      finishRedirectUrl,
      {
        last4: result.card_last_four,
        brand: result.card_brand
      }
    );

    res.status(200).set('Content-Type', 'text/html').send(html);
  } catch (error: any) {
    console.error("Error completing tokenization:", error);
    const gatewayError = handleError(error);
    
    // Try to get session for redirect URL even on error
    let finishRedirectUrl;
    try {
      // Determine session ID based on provider
      let errorSessionId: string;
      if (provider === "transbank") {
        const tbkData = req.query as { TBK_TOKEN?: string };
        errorSessionId = `tbk_${tbkData.TBK_TOKEN}`;
      } else {
        const genericData = req.query as { session_id?: string };
        errorSessionId = genericData.session_id || "";
      }
      
      const sessionDoc = await admin.firestore().collection("tokenization_sessions").doc(errorSessionId).get();
      const sessionData = sessionDoc.data();
      finishRedirectUrl = sessionData?.finish_redirect_url;
    } catch {
      // Ignore errors when retrieving session
    }

    // Generate HTML error response for user-facing callback
    const html = generateTokenizationHTML(
      false,
      `Error al registrar la tarjeta: ${gatewayError.message}`,
      finishRedirectUrl
    );

    res.status(gatewayError.statusCode || 500).set('Content-Type', 'text/html').send(html);
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