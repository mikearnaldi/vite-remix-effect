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
