import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Context, Effect } from "effect";

export interface LoaderContext {
  readonly _: unique symbol;
}

export const LoaderContext = Context.Tag<
  LoaderContext,
  Parameters<LoaderFunction>[0]
>("@services/LoaderContext");

export interface ActionContext {
  readonly _: unique symbol;
}

export const ActionContext = Context.Tag<
  ActionContext,
  Parameters<ActionFunction>[0]
>("@services/ActionContext");

export const getFormDataEntries = ActionContext.pipe(
  Effect.flatMap(({ request }) => Effect.promise(() => request.formData())),
  Effect.map((formData) => Object.fromEntries(formData)),
  Effect.withSpan("getFormDataEntries")
);
