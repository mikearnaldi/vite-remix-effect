import { Schema } from "@effect/schema";
import type { MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { useEffect, useRef } from "react";
import { getFormData } from "~/services/Remix";
import { effectAction, effectLoader } from "~/services/Runtime";
import type { Todo } from "~/services/TodoRepo";
import { TodoArray, TodoRepo } from "~/services/TodoRepo";

const ActionInput = Schema.union(
  Schema.struct({
    _tag: Schema.literal("AddTodo"),
    title: Schema.string,
  }),
  Schema.struct({
    _tag: Schema.literal("DeleteTodo"),
    id: Schema.numberFromString(Schema.string),
  })
);

export const action = effectAction(
  Effect.gen(function* ($) {
    const { addTodo, deleteTodo } = yield* $(TodoRepo);
    const input = yield* $(getFormData(ActionInput));
    switch (input._tag) {
      case "AddTodo": {
        yield* $(addTodo(input.title));
        break;
      }
      case "DeleteTodo": {
        yield* $(deleteTodo(input.id));
        break;
      }
    }
    return input._tag;
  }).pipe(Effect.withSpan("indexAction"))
);

export const loader = effectLoader(
  Effect.gen(function* ($) {
    const { getAllTodos } = yield* $(TodoRepo);
    const result = yield* $(getAllTodos);
    return yield* $(
      result,
      Schema.encode(TodoArray),
      Effect.withSpan("encodeResponse")
    );
  }).pipe(Effect.withSpan("indexLoader"))
);

export const meta: MetaFunction = () => {
  return [
    { title: "Remixing Effect" },
    {
      name: "description",
      content: "Integrate Effect & Remix for the greater good!",
    },
  ];
};

function TodoRow({ todo }: { todo: Schema.Schema.From<typeof Todo> }) {
  const fetcher = useFetcher<typeof action>();
  const deleteTodoForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      switch (fetcher.data) {
        case "DeleteTodo": {
          deleteTodoForm.current?.reset();
          break;
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <li>
      <div style={{ display: "flex", gap: "0.5em" }}>
        <div>
          {todo.title} ({todo.createdAt})
        </div>
        <div>
          <fetcher.Form method="post" ref={deleteTodoForm} action="?index">
            <input type="hidden" name="_tag" value="DeleteTodo" />
            <input type="hidden" name="id" value={todo.id} />
            <button type="submit">Done</button>
          </fetcher.Form>
        </div>
      </div>
    </li>
  );
}

export default function Index() {
  const todos = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const addTodoForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      switch (fetcher.data) {
        case "AddTodo": {
          addTodoForm.current?.reset();
          break;
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Todos</h1>
      <ul>
        {todos.map((todo) => (
          <TodoRow todo={todo} key={todo.id} />
        ))}
      </ul>
      <h2>Add New Todo</h2>
      <fetcher.Form
        method="post"
        ref={addTodoForm}
        action="?index"
        style={{ display: "flex", gap: "0.5em" }}
      >
        <input type="hidden" name="_tag" value="AddTodo" />
        <input type="text" size={50} name="title" />
        <button type="submit">Create Todo</button>
      </fetcher.Form>
    </div>
  );
}
