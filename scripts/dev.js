// @ts-check
import * as NodeRuntime from "@effect/platform-node/Runtime";
import { installGlobals } from "@remix-run/node";
import { Effect, Layer } from "effect";
import { createServer } from "vite";

installGlobals();

const runtimeSymbol = Symbol.for("@globals/Runtime");

const DevApp = Effect.gen(function* (_) {
  const vite = yield* _(Effect.promise(() => createServer()))
  const runtime = yield* _(Effect.runtime())
  global[runtimeSymbol] = runtime

  yield* _(Effect.promise(() => vite.listen()))
  vite.printUrls();
})

DevApp.pipe(
  Layer.scopedDiscard,
  Layer.launch,
  // @ts-expect-error
  NodeRuntime.runMain,
);
