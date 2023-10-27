import * as Sqlfx from "@sqlfx/sqlite/node";
import * as Migrator from "@sqlfx/sqlite/Migrator";
import { Config, Layer } from "effect";

export const Sql = Sqlfx.tag;

const migrations = import.meta.glob("../migrations/*.ts");

export const SqlLive = Layer.provideMerge(
  Sqlfx.makeLayer({
    filename: Config.succeed("database/db.sqlite"),
    transformQueryNames: Config.succeed(Sqlfx.transform.camelToSnake),
    transformResultNames: Config.succeed(Sqlfx.transform.snakeToCamel),
  }),
  Migrator.makeLayer({
    loader: Migrator.fromGlob(migrations),
  })
).pipe(Layer.orDie);
