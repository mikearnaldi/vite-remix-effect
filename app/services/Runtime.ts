import { Layer } from "effect";
import { SqlLive } from "./Sql";
import { TodosLive } from "./Todos";
import { TracingLive } from "./Tracing";
import { remixRuntime } from "~/lib/effect";

export const { effectLoader } = remixRuntime(
  Layer.provide(TracingLive, Layer.mergeAll(TodosLive, SqlLive))
);
