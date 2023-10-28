import { redirect } from "@remix-run/node";
import { Effect } from "effect";
import { effectLoader } from "~/services/Runtime";

export const loader = effectLoader(Effect.sync(() => redirect("/")));
