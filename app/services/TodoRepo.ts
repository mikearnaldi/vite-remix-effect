import { Schema } from "@effect/schema";
import {
  Context,
  Data,
  Duration,
  Effect,
  Layer,
  Metric,
  Schedule,
} from "effect";
import { Sql, SqlLive } from "./Sql";

//
// Data Model
//

export class Todo extends Schema.Class<Todo>()({
  id: Schema.number,
  title: Schema.string,
  createdAt: Schema.dateFromString(Schema.string),
}) {}

export const TodoArray = Schema.array(Todo);

export class GetAllTodosError extends Data.TaggedError("GetAllTodosError")<{
  message: string;
}> {}

//
// Policies
//

const retryPolicy = Schedule.exponential("10 millis").pipe(
  Schedule.compose(Schedule.elapsed),
  Schedule.whileOutput(Duration.lessThan("3 seconds"))
);

//
// Metrics
//

const getAllTodosErrorCount = Metric.counter("getAllTodosErrorCount");
const addTodoErrorCount = Metric.counter("addTodoErrorCount");
const deleteTodoErrorCount = Metric.counter("deleteTodoErrorCount");

//
// Service Definition
//

export interface TodoRepo {
  readonly _: unique symbol;
}

export const TodoRepo = Context.Tag<
  TodoRepo,
  Effect.Effect.Success<typeof makeTodoRepo>
>("@context/Todos");

//
// Service Implementation
//

export const makeTodoRepo = Effect.gen(function* ($) {
  const sql = yield* $(Sql);

  const addTodo = (title: string) =>
    Effect.gen(function* ($) {
      const rows = yield* $(
        Effect.orDie(
          sql`INSERT INTO todos ${sql.insert([{ title }])} RETURNING *`
        ),
        Effect.withSpan("addTodoToDb")
      );
      const [todo] = yield* $(
        Effect.orDie(Schema.parse(Schema.tuple(Todo))(rows)),
        Effect.withSpan("parseResponse")
      );
      return todo;
    }).pipe(
      sql.withTransaction,
      Metric.trackErrorWith(addTodoErrorCount, () => 1),
      Effect.withSpan("addTodo")
    );

  const deleteTodo = (id: number) =>
    Effect.gen(function* ($) {
      yield* $(
        Effect.orDie(sql`DELETE FROM todos WHERE id = ${id}`),
        Effect.withSpan("deleteFromDb")
      );
    }).pipe(
      sql.withTransaction,
      Metric.trackErrorWith(deleteTodoErrorCount, () => 1),
      Effect.withSpan("deleteTodo")
    );

  const getAllTodos = Effect.gen(function* ($) {
    const rows = yield* $(
      Effect.orDie(sql`SELECT * from todos;`),
      Effect.withSpan("getFromDb")
    );
    const todos = yield* $(
      Effect.orDie(Schema.parse(TodoArray)(rows)),
      Effect.withSpan("parseTodos")
    );
    if (Math.random() > 0.5) {
      return yield* $(
        new GetAllTodosError({
          message: "failure to get todos",
        })
      );
    }
    return todos;
  }).pipe(
    Metric.trackErrorWith(getAllTodosErrorCount, () => 1),
    Effect.withSpan("getAllTodos"),
    Effect.retry(retryPolicy),
    Effect.withSpan("getAllTodosWithRetry")
  );

  return {
    getAllTodos,
    addTodo,
    deleteTodo,
  };
});

export const TodoRepoLive = Layer.provide(
  SqlLive,
  Layer.effect(TodoRepo, makeTodoRepo)
);
