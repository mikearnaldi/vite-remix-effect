import { Schema } from "@effect/schema";
import type { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { effectLoader } from "~/lib/effect";
import { GetTodoError, Todo, Todos } from "~/services/Todos";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = effectLoader({
  name: "indexLoader",
  success: Schema.array(Todo),
  error: GetTodoError,
})(
  Effect.gen(function* (_) {
    const { getTodos } = yield* _(Todos);
    return yield* _(getTodos);
  })
);

export default function Index() {
  const todos = useLoaderData<typeof loader>();
  if (todos._tag === "Left") {
    return <div>{todos.left.message}</div>;
  }
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Todos</h1>
      <ul>
        {todos.right.map((todo, i) => (
          <li key={i}>
            {todo.title} ({todo.createdAt})
          </li>
        ))}
      </ul>
    </div>
  );
}
