import type { LoaderFunction } from "@remix-run/node";
import { Layer, Effect, Scope, Exit, Runtime, Context, Either } from "effect";
import { TodosLive } from "~/services/Todos";
import * as Schema from "@effect/schema/Schema";
import { TracingLive } from "~/services/Tracing";
import { SqlLive } from "~/services/Sql";

const layer = Layer.provide(TracingLive, Layer.mergeAll(TodosLive, SqlLive));
const runtimeSymbol = Symbol.for("@globals/Runtime");

const makeRuntime = Effect.runPromise(
  Effect.gen(function* ($) {
    const scope = yield* $(Scope.make());
    const runtime = yield* $(Layer.toRuntime(layer), Scope.extend(scope));
    const close = Scope.close(scope, Exit.unit);
    if (runtimeSymbol in globalThis) {
      yield* $((globalThis as any)[runtimeSymbol] as typeof close);
    }
    // @ts-expect-error
    globalThis[runtimeSymbol] = close;
    return {
      runtime,
      close: close,
    };
  })
);

let closed = false;

const onExit = () => {
  if (!closed) {
    closed = true;
    makeRuntime
      .then(({ close }) => Effect.runPromise(close))
      .then(() => {
        process.exit(0);
      });
  }
};

process.on("SIGINT", onExit);
process.on("SIGTERM", onExit);

export const runPromise = <E, A>(
  effect: Effect.Effect<Layer.Layer.Success<typeof layer>, E, A>
) => makeRuntime.then(({ runtime }) => Runtime.runPromise(runtime)(effect));

export interface RequestContext {
  readonly _: unique symbol;
}
export const LoaderContext = Context.Tag<
  RequestContext,
  Parameters<LoaderFunction>[0]
>("@services/LoaderContext");

export const effectLoader: {
  <I, A, EI, EA>(opts: {
    name: string;
    success: Schema.Schema<I, A>;
    error: Schema.Schema<EI, EA>;
  }): (
    body: Effect.Effect<
      Layer.Layer.Success<typeof layer> | RequestContext,
      EA,
      A
    >
  ) => (
    ...args: Parameters<LoaderFunction>
  ) => Promise<
    Schema.Schema.From<ReturnType<typeof Schema.either<EI, EA, I, A>>>
  >;
  <I, A>(opts: { name: string; success: Schema.Schema<I, A> }): (
    body: Effect.Effect<
      Layer.Layer.Success<typeof layer> | RequestContext,
      never,
      A
    >
  ) => (...args: Parameters<LoaderFunction>) => Promise<I>;
} =
  <I, A>(opts: {
    name: string;
    success: Schema.Schema<I, A>;
    error?: Schema.Schema<any, any>;
  }) =>
  (
    body: Effect.Effect<
      Layer.Layer.Success<typeof layer> | RequestContext,
      any,
      A
    >
  ) =>
  (...args: Parameters<LoaderFunction>): Promise<I> => {
    return makeRuntime.then(({ runtime }) => {
      let effect = body.pipe(
        Effect.provideService(LoaderContext, args[0]),
        Effect.withSpan(opts.name),
        Effect.flatMap((a) => Effect.orDie(Schema.encode(opts.success)(a)))
      );
      if (opts.error) {
        // @ts-expect-error
        effect = effect.pipe(
          Effect.map(Either.right),
          Effect.catchAll((e) =>
            Effect.map(
              // @ts-expect-error
              Effect.orDie(Schema.encode(opts.error)(e)),
              Either.left
            )
          )
        );
      }
      return Runtime.runPromise(runtime)(effect);
    });
  };
