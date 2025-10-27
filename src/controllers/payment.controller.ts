import { Request, Response } from "express";
import {
  PaymentRequest,
  ApiResponse,
  PaymentGatewayError,
} from "../types";
import { validateRequest } from "../utils";
import { PaymentService } from "../services/payment.service";

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
 * Procesa un pago con el proveedor correspondiente
 */
export const processPayment = async (req: Request, res: Response) => {
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
    const data: PaymentRequest = req.body;

    // Validate user_id matches authenticated user
    if (data.user_id !== user.uid) {
      throw new PaymentGatewayError("Unauthorized", "UNAUTHORIZED", 403);
    }

    // Use service to handle business logic
    const result = await PaymentService.processPayment(data, metadata);

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
 * Refund a payment
 */
export const refundPayment = async (req: Request, res: Response) => {
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
    const data: { payment_id: string; amount?: number } = req.body;

    // Use service to handle business logic
    const result = await PaymentService.refundPayment(
      data.payment_id,
      data.amount,
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