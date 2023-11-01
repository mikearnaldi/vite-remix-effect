import type {
  ActionFunctionArgs,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import type { Todo } from "~/services/Modes";
import { SpanStatusCode, tracer } from "~/services/Otel";
import { addTodo, deleteTodo, getAllTodos } from "~/services/TodoRepo";

const ActionInput = z.union([
  z.object({
    _tag: z.literal("AddTodo"),
    title: z.string(),
  }),
  z.object({
    _tag: z.literal("DeleteTodo"),
    id: z.string().pipe(z.coerce.number()),
  }),
]);

export const action = async ({ request }: ActionFunctionArgs) => {
  const input = ActionInput.parse(Object.fromEntries(await request.formData()));
  switch (input._tag) {
    case "AddTodo": {
      addTodo(input);
      break;
    }
    case "DeleteTodo": {
      deleteTodo(input);
      break;
    }
  }
  return input._tag;
};

export const loader = () => {
  const span = tracer.startSpan("indexLoader");
  try {
    return getAllTodos(span);
  } catch (e) {
    if (e instanceof Error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
    }
    throw e;
  } finally {
    span.end();
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: "Remixing Effect" },
    {
      name: "description",
      content: "Integrate Effect & Remix for the greater good!",
    },
  ];
};

function TodoRow({ todo }: { todo: SerializeFrom<Todo> }) {
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
          {todo.title} ({todo.created_at})
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
