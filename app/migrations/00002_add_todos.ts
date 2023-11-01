import * as Effect from "effect/Effect";
import * as Sql from "@sqlfx/sqlite/Client";

export default Effect.gen(function* ($) {
  const sql = yield* $(Sql.tag);

  yield* $(sql`INSERT INTO todos (title) VALUES ('Try Remix with Vite')`);
  yield* $(sql`INSERT INTO todos (title) VALUES ('Integrate Effect')`);
  yield* $(sql`INSERT INTO todos (title) VALUES ('Integrate OpenTelemetry')`);
});
