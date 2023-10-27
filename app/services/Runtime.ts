import { Layer } from "effect";
import { SqlLive } from "./Sql";
import { TodoRepoLive } from "./TodoRepo";
import { TracingLive } from "./Tracing";
import { remixRuntime } from "~/lib/effect";

export const { effectLoader, effectAction } = remixRuntime(
  Layer.provide(TracingLive, Layer.mergeAll(TodoRepoLive, SqlLive))
);
