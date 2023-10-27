import type { LoaderFunction } from "@remix-run/node";
import { Context } from "effect";

export interface LoaderFunctionArg {
  readonly _: unique symbol;
}

export const LoaderFunctionArg = Context.Tag<
  LoaderFunctionArg,
  Parameters<LoaderFunction>[0]
>("@services/LoaderFunctionArg");
