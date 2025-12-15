// src/utils/telemetry/telemetry.ts
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

/**
 * Initialize Application Insights telemetry with OpenTelemetry
 * This MUST be called before importing Express or any other HTTP libraries
 * Note: Uses console directly since logger depends on telemetry being initialized
 */
export function initTelemetry(): void {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn("No Application Insights connection string found. Telemetry disabled.");
    return;
  }

  try {
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString,
      },
      instrumentationOptions: {
        http: { enabled: true },
        azureSdk: { enabled: true },
      },
    });

    console.log("Application Insights telemetry initialized");    
  } catch (error) {
    console.error("Failed to initialize Application Insights:", error);
  }
}


