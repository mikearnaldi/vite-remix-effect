/* eslint-disable @typescript-eslint/consistent-type-imports */
import Module from "node:module";

const require = Module.createRequire(import.meta.url);

export const { OTLPTraceExporter } =
  require("@opentelemetry/exporter-trace-otlp-proto") as typeof import("@opentelemetry/exporter-trace-otlp-proto");

export const { OTLPMetricExporter } =
  require("@opentelemetry/exporter-metrics-otlp-proto") as typeof import("@opentelemetry/exporter-metrics-otlp-proto");

export const { BatchSpanProcessor } =
  require("@opentelemetry/sdk-trace-base") as typeof import("@opentelemetry/sdk-trace-base");

export const { PeriodicExportingMetricReader } =
  require("@opentelemetry/sdk-metrics") as typeof import("@opentelemetry/sdk-metrics");

export const { trace, metrics, context, SpanStatusCode } =
  require("@opentelemetry/api") as typeof import("@opentelemetry/api");

export { type Span } from "@opentelemetry/api";

export const { Resource } =
  require("@opentelemetry/resources") as typeof import("@opentelemetry/resources");

export const { SemanticResourceAttributes } =
  require("@opentelemetry/semantic-conventions") as typeof import("@opentelemetry/semantic-conventions");

export const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } =
  require("@opentelemetry/sdk-trace-base") as typeof import("@opentelemetry/sdk-trace-base");

if (process.env["HONEYCOMB_API_KEY"] && process.env["HONEYCOMB_SERVICE_NAME"]) {
  const provider = new BasicTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env["HONEYCOMB_SERVICE_NAME"],
    }),
  });
  const headers = {
    "x-honeycomb-team": process.env["HONEYCOMB_API_KEY"],
    "x-honeycomb-dataset": process.env["HONEYCOMB_SERVICE_NAME"],
  };
  const traceExporter = new OTLPTraceExporter({
    url: "https://api.honeycomb.io/v1/traces",
    headers,
  });
  provider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
  provider.register();
}

export const tracer = trace.getTracer("global-tracer");
