import { Schema } from "@effect/schema";
import { json, type MetaFunction } from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { Effect } from "effect";
import { getFormData } from "~/services/Remix";
import { effectAction, effectLoader } from "~/services/Runtime";
import { TodoArray, TodoRepo, Todo } from "~/services/TodoRepo";

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

// Generator style
export const action = effectAction(
  Effect.gen(function* ($) {
    const { addTodo, deleteTodo } = yield* $(TodoRepo);
    const input = yield* $(getFormData(ActionInput));
    switch (input._tag) {
      case "AddTodo": {
        const todo = yield* $(addTodo(input.title), Effect.flatMap(Schema.encode(Todo)));
        return json(todo)
      }
      case "DeleteTodo": {
        yield* $(deleteTodo(input.id));
        return input.id
      }
    }

  })
);

// Pipeline style
export const loader = effectLoader(TodoRepo.pipe(
  Effect.flatMap(_ => _.getAllTodos),
  Effect.flatMap(Schema.encode(TodoArray)),
  Effect.map(json)
));

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
  return (
    <li>
      <div style={{ display: "flex", gap: "0.5em" }}>
        <div>
          {todo.title} ({todo.createdAt})
        </div>
        <div>
          <Form navigate={false} method="post">
            <input type="hidden" name="id" value={todo.id} />
            <button name="_tag" value="DeleteTodo" type="submit">Done</button>
          </Form>
        </div>
      </div>
    </li>
  );
}

export default function Index() {
  const todos = useLoaderData<typeof loader>();
  const navigation = useNavigation()
  const isAdding =
    navigation.formData?.get("_tag") === "AddTodo"

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Todos</h1>
      <ul>
        {todos.map((todo) => (
          <TodoRow todo={todo} key={todo.id} />
        ))}
      </ul>
      <h2>Add New Todo</h2>
      <Form
        key={String(isAdding)}
        replace
        method="post"
        style={{ display: "flex", gap: "0.5em" }}
      >
        <input type="text" size={50} name="title" />
        <button name="_tag" value="AddTodo" type="submit">Create Todo</button>
      </Form>
    </div>
  );
}
