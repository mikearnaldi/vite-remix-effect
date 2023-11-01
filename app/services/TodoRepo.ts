import { z } from "zod";
import { db } from "./Db";
import { Todo } from "./Modes";

export const addTodo = (input: { _tag: "AddTodo"; title: string }) => {
  db.prepare("INSERT INTO todos (title) VALUES (?) RETURNING *").get(
    input.title
  );
};

export const deleteTodo = (input: { _tag: "DeleteTodo"; id: number }) => {
  db.prepare("DELETE FROM todos WHERE id = ?").run(input.id);
};

export const getAllTodos = () => {
  if (Math.random() > 0.5) {
    throw new Error("Error fetching todos");
  }
  return z.array(Todo).parse(db.prepare("SELECT * FROM todos").all());
};
