import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Effect, Exit, Fiber, Layer, Runtime, Scope } from "effect";
import { pretty } from "effect/Cause";
import { makeFiberFailure } from "effect/Runtime";
import { ActionContext, LoaderContext } from "~/services/Remix";

const runtimeSymbol = Symbol.for("@globals/Runtime");

export const remixRuntime = <E, A>(layer: Layer.Layer<never, E, A>) => {
  const fibers = new Set<Fiber.RuntimeFiber<any, any>>();

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

  const makeRuntime = Effect.runPromise(
    Effect.gen(function* ($) {
      const scope = yield* $(Scope.make());
      const runtime = yield* $(Layer.toRuntime(layer), Scope.extend(scope));
      const close = Scope.close(scope, Exit.unit);
      const closeLoop: Effect.Effect<never, never, void> = Effect.flatMap(
        Fiber.interruptAll(fibers),
        () => (fibers.size > 0 ? closeLoop : Effect.unit)
      );
      const finalClose = Effect.flatMap(
        Effect.flatMap(closeLoop, () => close),
        () =>
          Effect.sync(() => {
            process.removeListener("SIGTERM", onExit);
            process.removeListener("SIGINT", onExit);
          })
      );
      if (runtimeSymbol in globalThis) {
        yield* $((globalThis as any)[runtimeSymbol] as typeof finalClose);
      }
      // @ts-expect-error
      globalThis[runtimeSymbol] = finalClose;
      process.on("SIGINT", onExit);
      process.on("SIGTERM", onExit);
      return {
        runtime,
        close: finalClose,
      };
    })
  );

  const run = async <E, A>(
    body: Effect.Effect<Layer.Layer.Success<typeof layer>, E, A>
  ) => {
    const { runtime } = await makeRuntime;
    return await new Promise<A>((res, rej) => {
      const fiber = Runtime.runFork(runtime)(body);
      fibers.add(fiber);
      fiber.addObserver((exit) => {
        fibers.delete(fiber);
        if (Exit.isSuccess(exit)) {
          res(exit.value);
        } else {
          const failure = makeFiberFailure(exit.cause);
          const error = new Error();
          error.message = failure.message;
          error.name = failure.name;
          error.stack = pretty(exit.cause);
          rej(error);
        }
      });
    });
  };

  const effectLoader =
    <E, A>(
      body: Effect.Effect<
        Layer.Layer.Success<typeof layer> | LoaderContext,
        E,
        A
      >
    ) =>
    (...args: Parameters<LoaderFunction>): Promise<A> =>
      run(Effect.provideService(body, LoaderContext, args[0]));

  const effectAction =
    <E, A>(
      body: Effect.Effect<
        Layer.Layer.Success<typeof layer> | ActionContext,
        E,
        A
      >
    ) =>
    (...args: Parameters<ActionFunction>): Promise<A> =>
      run(Effect.provideService(body, ActionContext, args[0]));

  return {
    effectLoader,
    effectAction,
  };
};
