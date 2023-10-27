import { Schema } from "@effect/schema";
import type { MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { useEffect, useRef } from "react";
import { useNavigation } from "react-router-dom";
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
  Effect.gen(function* (_) {
    const { addTodo, deleteTodo } = yield* _(TodoRepo);
    const input = yield* _(getFormData(ActionInput));
    switch (input._tag) {
      case "AddTodo": {
        yield* _(addTodo(input.title));
        break;
      }
      case "DeleteTodo": {
        yield* _(deleteTodo(input.id));
        break;
      }
    }
    return input._tag;
  }).pipe(Effect.withSpan("indexAction"))
);

export const loader = effectLoader(
  Effect.gen(function* (_) {
    const { getAllTodos } = yield* _(TodoRepo);
    const result = yield* _(getAllTodos);
    return yield* _(
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
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const deleteTodoForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (navigation.state === "idle" && actionData) {
      switch (actionData) {
        case "DeleteTodo": {
          deleteTodoForm.current?.reset();
          break;
        }
      }
    }
  }, [navigation.state, actionData]);

  return (
    <li>
      <div style={{ display: "flex", gap: "0.5em" }}>
        <div>
          {todo.title} ({todo.createdAt})
        </div>
        <div>
          <Form method="post" ref={deleteTodoForm}>
            <input type="hidden" name="_tag" value="DeleteTodo" />
            <input type="hidden" name="id" value={todo.id} />
            <button type="submit">Done</button>
          </Form>
        </div>
      </div>
    </li>
  );
}

export default function Index() {
  const todos = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const addTodoForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (navigation.state === "idle" && actionData) {
      switch (actionData) {
        case "AddTodo": {
          addTodoForm.current?.reset();
          break;
        }
      }
    }
  }, [navigation.state, actionData]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Todos ok</h1>
      <ul>
        {todos.map((todo) => (
          <TodoRow todo={todo} key={todo.id} />
        ))}
      </ul>
      <h2>Add New Todo</h2>
      <Form method="post" ref={addTodoForm}>
        <input type="hidden" name="_tag" value="AddTodo" />
        <input type="text" name="title" />
        <button type="submit">Create Todo</button>
      </Form>
    </div>
  );
}
