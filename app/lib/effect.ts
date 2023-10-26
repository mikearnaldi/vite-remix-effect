import { LoaderFunction } from "@remix-run/node";
import { Layer, Effect, Scope, Exit, Runtime, Context, Either } from "effect";
import { TodosLive } from "~/services/Todos";
import * as Schema from "@effect/schema/Schema";

const layer = Layer.mergeAll(TodosLive);

const makeRuntime = Effect.runPromise(
  Effect.gen(function* ($) {
    const scope = yield* $(Scope.make());
    const runtime = yield* $(Layer.toRuntime(layer), Scope.extend(scope));
    const close = Scope.close(scope, Exit.unit);
    if ("runtimeClose" in globalThis) {
      yield* $((globalThis as any)["runtimeClose"] as typeof close);
    }
    // @ts-expect-error
    globalThis["runtimeClose"] = close;
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

type NoInfer<T> = [T][T extends any ? 0 : never];

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
      NoInfer<EA>,
      NoInfer<A>
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
      NoInfer<A>
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
      NoInfer<A>
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
