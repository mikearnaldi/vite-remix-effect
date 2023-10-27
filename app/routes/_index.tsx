import { Schema } from "@effect/schema";
import type { MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { useEffect, useRef } from "react";
import { useNavigation } from "react-router-dom";
import { getFormData } from "~/services/Remix";
import { effectAction, effectLoader } from "~/services/Runtime";
import { Todo, TodoArray, TodoRepo } from "~/services/TodoRepo";

export const action = effectAction(
  Effect.gen(function* (_) {
    const { addTodo } = yield* _(TodoRepo);
    const { title } = yield* _(
      getFormData(
        Schema.struct({
          title: Schema.string,
        })
      )
    );
    const todo = yield* _(addTodo(title));
    return yield* _(
      todo,
      Schema.encode(Todo),
      Effect.withSpan("encodeResponse")
    );
  }).pipe(Effect.withSpan("addTodoAction"))
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

export default function Index() {
  const todos = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (navigation.state === "idle" && actionData) {
      formRef.current?.reset();
    }
  }, [navigation.state, actionData]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Todos</h1>
      <ul>
        {todos.map((todo, i) => (
          <li key={i}>
            {todo.title} ({todo.createdAt})
          </li>
        ))}
      </ul>
      <h2>Add New Todo</h2>
      <Form method="post" ref={formRef}>
        <input type="text" name="title" />
        <button type="submit">Create Todo</button>
      </Form>
    </div>
  );
}
