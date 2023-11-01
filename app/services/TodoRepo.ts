import { Schema } from "@effect/schema";
import { Context, Data, Effect, Layer, Metric } from "effect";
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
        sql`INSERT INTO todos ${sql.insert([{ title }])} RETURNING *`,
        Effect.withSpan("addTodoToDb")
      );
      const [todo] = yield* $(
        Schema.parse(Schema.tuple(Todo))(rows),
        Effect.withSpan("parseResponse")
      );
      return todo;
    }).pipe(
      Metric.trackErrorWith(addTodoErrorCount, () => 1),
      Effect.withSpan("addTodo")
    );

  const deleteTodo = (id: number) =>
    Effect.gen(function* ($) {
      yield* $(
        sql`DELETE FROM todos WHERE id = ${id}`,
        Effect.withSpan("deleteFromDb")
      );
    }).pipe(
      Metric.trackErrorWith(deleteTodoErrorCount, () => 1),
      Effect.withSpan("deleteTodo")
    );

  const getAllTodos = Effect.gen(function* ($) {
    const rows = yield* $(
      sql`SELECT * from todos;`,
      Effect.withSpan("getFromDb")
    );
    const todos = yield* $(
      Schema.parse(TodoArray)(rows),
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
    Effect.withSpan("getAllTodos")
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
