import * as Effect from "effect/Effect";
import * as Sql from "@sqlfx/sqlite/Client";

export default Effect.gen(function* (_) {
  const sql = yield* _(Sql.tag);

  yield* _(sql`INSERT INTO todos (title) VALUES ('Try Remix with Vite')`);
  yield* _(sql`INSERT INTO todos (title) VALUES ('Integrate Effect')`);
  yield* _(sql`INSERT INTO todos (title) VALUES ('Integrate OpenTelemetry')`);
});
