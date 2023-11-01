import { Layer } from "effect";
import { SqlLive } from "./Sql";
import { TodoRepoLive } from "./TodoRepo";
import { remixRuntime } from "~/lib/effect";

export const { effectLoader, effectAction } = remixRuntime(
  Layer.mergeAll(TodoRepoLive, SqlLive)
);
