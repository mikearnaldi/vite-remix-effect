import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import {
  Config,
  ConfigSecret,
  Context,
  Duration,
  Effect,
  Either,
  Layer,
} from "effect";
import {
  BatchSpanProcessor,
  OTLPMetricExporter,
  OTLPTraceExporter,
  PeriodicExportingMetricReader,
} from "~/lib/otel";

export const HoneycombConfig = Config.nested("HONEYCOMB")(
  Config.all({
    apiKey: Config.secret("API_KEY"),
    serviceName: Config.string("SERVICE_NAME"),
  })
);

export const TracingLive = Layer.unwrapEffect(
  Effect.gen(function* ($) {
    const config = yield* $(Effect.either(Effect.config(HoneycombConfig)));
    if (Either.isLeft(config)) {
      return Layer.succeedContext(Context.empty());
    }
    const { apiKey, serviceName } = config.right;
    const headers = {
      "x-honeycomb-team": ConfigSecret.value(apiKey),
      "x-honeycomb-dataset": serviceName,
    };
    const traceExporter = new OTLPTraceExporter({
      url: "https://api.honeycomb.io/v1/traces",
      headers,
    });
    const metricExporter = new OTLPMetricExporter({
      url: "https://api.honeycomb.io/v1/metrics",
      headers,
    });
    return NodeSdk.layer(() => ({
      resource: { serviceName },
      spanProcessor: new BatchSpanProcessor(traceExporter, {
        scheduledDelayMillis: Duration.toMillis("1 seconds"),
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: Duration.toMillis("5 seconds"),
      }),
    }));
  })
);
