import { z } from "zod";

export const Todo = z.object({
  id: z.number(),
  title: z.string(),
  created_at: z.string().pipe(z.coerce.date()),
});

export type Todo = z.infer<typeof Todo>;
