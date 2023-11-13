import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Effect, ExecutionStrategy, Exit, Layer, Runtime, Scope } from "effect";
import { pretty } from "effect/Cause";
import { makeFiberFailure } from "effect/Runtime";
import { ActionContext, LoaderContext } from "~/services/Remix";

const runtimeSymbol = Symbol.for("@globals/Runtime");
let disposePrevious: Effect.Effect<never, never, void>

export const remixRuntime = <E, A>(layer: Layer.Layer<never, E, A>) => {
  const makeRuntime = Runtime.runPromise((globalThis as any)[runtimeSymbol] as Runtime.Runtime<Scope.Scope>)(
    Effect.gen(function* ($) {
      const scope = yield* $(Effect.scope);
      const runtimeScope = yield* $(Scope.fork(scope, ExecutionStrategy.sequential))
      const runtime = yield* $(Layer.toRuntime(layer), Scope.extend(runtimeScope));
      const dispose = Scope.close(runtimeScope, Exit.unit)
      if (disposePrevious) {
        yield* $(disposePrevious);
      }
      disposePrevious = dispose;
      return {
        runtime,
        close: dispose,
      };
    })
  );

  const run = async <E, A>(
    body: Effect.Effect<Layer.Layer.Success<typeof layer>, E, A>
  ) => {
    const { runtime } = await makeRuntime;
    return await new Promise<A>((res, rej) => {
      const fiber = Runtime.runFork(runtime)(body);
      fiber.addObserver((exit) => {
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
