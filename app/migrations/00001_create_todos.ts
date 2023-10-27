import * as Effect from "effect/Effect";
import * as Sql from "@sqlfx/sqlite/Client";

export default Effect.gen(function* (_) {
  const sql = yield* _(Sql.tag);

  yield* _(sql`
    CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title VARCHAR(255) NOT NULL,
        created_at datetime NOT NULL DEFAULT current_timestamp
    )`);
});
