import { Schema } from "@effect/schema";
import { Context, Duration, Effect, Layer, Metric, Schedule } from "effect";

export interface Todos {
  readonly _: unique symbol;
}

export class Todo extends Schema.Class<Todo>()({
  title: Schema.string,
  createdAt: Schema.dateFromString(Schema.string),
}) {}

export class GetTodoError extends Schema.Class<GetTodoError>()({
  message: Schema.string,
}) {}

const retryPolicy = Schedule.exponential("10 millis").pipe(
  Schedule.compose(Schedule.elapsed),
  Schedule.whileOutput(Duration.lessThan("3 seconds"))
);

export const makeTodos = Effect.gen(function* (_) {
  return {
    getTodos: Effect.sync(() => [
      new Todo({ title: "Try Remix with Vite", createdAt: new Date() }),
      new Todo({ title: "Integrate Effect", createdAt: new Date() }),
      new Todo({ title: "Integrate OpenTelemetry", createdAt: new Date() }),
    ]).pipe(
      Effect.tap(() =>
        Math.random() > 0.5
          ? Effect.unit
          : Effect.fail(new GetTodoError({ message: "failure to get todos" }))
      ),
      Metric.trackErrorWith(Metric.counter("fetchTodosErrorCount"), () => 1),
      Effect.withSpan("fetchTodos"),
      Effect.retry(retryPolicy)
    ),
  };
});

export const Todos = Context.Tag<
  Todos,
  Effect.Effect.Success<typeof makeTodos>
>("@context/Hello");

export const TodosLive = Layer.effect(Todos, makeTodos);
