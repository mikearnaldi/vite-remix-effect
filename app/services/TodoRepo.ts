import { z } from "zod";
import { db } from "./Db";
import { Todo } from "./Modes";
import type { Span } from "./Otel";
import { SpanStatusCode, context, trace, tracer } from "./Otel";

export const addTodo = (input: { _tag: "AddTodo"; title: string }) => {
  db.prepare("INSERT INTO todos (title) VALUES (?) RETURNING *").get(
    input.title
  );
};

export const deleteTodo = (input: { _tag: "DeleteTodo"; id: number }) => {
  db.prepare("DELETE FROM todos WHERE id = ?").run(input.id);
};

export const getAllTodos = (parent?: Span) => {
  const span = tracer.startSpan(
    "getAllTodos",
    undefined,
    parent ? trace.setSpan(context.active(), parent) : undefined
  );
  try {
    if (Math.random() > 0.5) {
      throw new Error("Error fetching todos");
    }
    return z.array(Todo).parse(db.prepare("SELECT * FROM todos").all());
  } catch (e) {
    if (e instanceof Error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
    }
    throw e;
  } finally {
    span.end();
  }
};
