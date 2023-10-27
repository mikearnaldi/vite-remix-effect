import type { LoaderFunction } from "@remix-run/node";
import type { Fiber } from "effect";
import { Context, Effect, Exit, Layer, Runtime, Scope } from "effect";
import { makeFiberFailure } from "effect/Runtime";

const runtimeSymbol = Symbol.for("@globals/Runtime");

export interface RequestContext {
  readonly _: unique symbol;
}

export const LoaderContext = Context.Tag<
  RequestContext,
  Parameters<LoaderFunction>[0]
>("@services/LoaderContext");

export const remixRuntime = <E, A>(layer: Layer.Layer<never, E, A>) => {
  const fibers = new Set<Fiber.RuntimeFiber<any, any>>();
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

  const effectLoader: {
    <E, A>(
      body: Effect.Effect<
        Layer.Layer.Success<typeof layer> | RequestContext,
        E,
        A
      >
    ): (...args: Parameters<LoaderFunction>) => Promise<A>;
  } =
    <E, A>(
      body: Effect.Effect<
        Layer.Layer.Success<typeof layer> | RequestContext,
        E,
        A
      >
    ) =>
    async (...args: Parameters<LoaderFunction>): Promise<A> => {
      const { runtime } = await makeRuntime;
      let effect = body.pipe(Effect.provideService(LoaderContext, args[0]));
      return await new Promise((res, rej) => {
        const fiber = Runtime.runFork(runtime)(effect);
        fibers.add(fiber);
        fiber.addObserver((exit) => {
          fibers.delete(fiber);
          if (Exit.isSuccess(exit)) {
            res(exit.value);
          } else {
            rej(makeFiberFailure(exit.cause));
          }
        });
      });
    };

  return {
    effectLoader,
  };
};
