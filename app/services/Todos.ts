import { Schema } from "@effect/schema";
import { Context, Duration, Effect, Layer, Metric, Schedule } from "effect";
import { Sql, SqlLive } from "./Sql";

export class Todo extends Schema.Class<Todo>()({
  id: Schema.number,
  title: Schema.string,
  createdAt: Schema.dateFromString(Schema.string),
}) {}

export const TodoArray = Schema.array(Todo);
export const parseTodoArray = Schema.parse(TodoArray);

export class GetTodoError extends Schema.Class<GetTodoError>()({
  _tag: Schema.literal("GetTodoError"),
  message: Schema.string,
}) {}

const retryPolicy = Schedule.exponential("10 millis").pipe(
  Schedule.compose(Schedule.elapsed),
  Schedule.whileOutput(Duration.lessThan("3 seconds"))
);

const fetchTodosErrorCount = Metric.counter("fetchTodosErrorCount");

export const makeTodos = Effect.gen(function* (_) {
  const sql = yield* _(Sql);

  const getTodos = Effect.gen(function* (_) {
    const rows = yield* _(Effect.orDie(sql`SELECT * from todos;`));
    const todos = yield* _(Effect.orDie(parseTodoArray(rows)));
    if (Math.random() > 0.5) {
      return yield* _(
        Effect.fail(
          new GetTodoError({
            _tag: "GetTodoError",
            message: "failure to get todos",
          })
        )
      );
    }
    return todos;
  }).pipe(
    Metric.trackErrorWith(fetchTodosErrorCount, () => 1),
    Effect.withSpan("fetchTodos"),
    Effect.retry(retryPolicy)
  );

  return {
    getTodos,
  };
});

export interface Todos {
  readonly _: unique symbol;
}

export const Todos = Context.Tag<
  Todos,
  Effect.Effect.Success<typeof makeTodos>
>("@context/Todos");

export const TodosLive = Layer.provide(SqlLive, Layer.effect(Todos, makeTodos));
