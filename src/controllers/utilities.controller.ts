import { Request, Response } from "express";
import {
  ApiResponse,
  PaymentGatewayError,
} from "../types";
import { validateRequest } from "../utils";
import { UtilitiesService } from "../services/utilities.service";

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
 * Get execution location and environment info
 */
export const getExecutionLocation = async (req: Request, res: Response) => {
  try {
    // Validate request method
    if (req.method !== 'GET') {
      res.status(405).json({ 
        success: false, 
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET method is allowed' } 
      });
      return;
    }

    // Validate authentication and user agent
    const { user, metadata } = await validateRequest(req);

    console.log("Getting execution location", {
      user_id: user.uid,
      metadata: metadata,
    });

    // Use service to get location info
    const locationInfo = UtilitiesService.getExecutionLocationInfo(
      req.headers,
      req.ip || 'unknown',
      metadata.executionLocation || 'unknown'
    );

    const response: ApiResponse = {
      success: true,
      data: locationInfo,
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
 * Get available payment providers and their information
 */
export const getAvailableProviders = async (req: Request, res: Response) => {
  try {
    // Validate request method
    if (req.method !== 'GET') {
      res.status(405).json({
        success: false,
        error: "Method not allowed",
        message: "Only GET method is allowed",
      });
      return;
    }

    // Use service to get providers info
    const data = UtilitiesService.getAvailableProvidersInfo();

    const response: ApiResponse<{
      providers: any[];
      total: number;
      timestamp: string;
    }> = {
      success: true,
      data,
    };

    res.status(200).json(response);
  } catch (error: any) {
    const gatewayError = handleError(error);
    console.error("Get providers error:", gatewayError);

    res.status(gatewayError.statusCode || 500).json({
      success: false,
      error: gatewayError.code,
      message: gatewayError.message,
    });
  }
};