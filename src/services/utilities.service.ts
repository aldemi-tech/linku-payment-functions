import { PaymentProviderFactory } from "../providers/factory";

export class UtilitiesService {
  /**
   * Obtiene información de ubicación de ejecución
   */
  static getExecutionLocationInfo(headers: any, ip: string, formattedLocation: string) {
    return {
      // App Engine location headers
      city: headers['x-appengine-city'] as string || null,
      region: headers['x-appengine-region'] as string || null,
      country: headers['x-appengine-country'] as string || null,
      datacenter: headers['x-appengine-datacenter'] as string || null,
      
      // Additional location info
      cloudflareCountry: headers['cf-ipcountry'] as string || null,
      cloudTraceContext: headers['x-cloud-trace-context'] as string || null,
      
      // Network info
      forwardedFor: headers['x-forwarded-for'] as string || null,
      realIp: headers['x-real-ip'] as string || null,
      clientIp: ip,
      
      // Server info
      serverName: headers['server'] as string || null,
      userAgent: headers['user-agent'] as string || null,
      
      // Formatted location
      formattedLocation: formattedLocation,
      
      // Timestamp
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtiene información de los proveedores disponibles
   */
  static getAvailableProvidersInfo() {
    const availableProviders = PaymentProviderFactory.getAvailableProviders();
    const providersInfo = availableProviders.map((provider) => {
      const config = PaymentProviderFactory.getConfig(provider);
      return {
        provider,
        method: config.method,
        enabled: config.enabled,
        isTestMode: !config.secretKey || !config.accessToken || !config.apiKey, // Rough indicator of test mode
      };
    });

    return {
      providers: providersInfo,
      total: availableProviders.length,
      timestamp: new Date().toISOString(),
    };
  }
}