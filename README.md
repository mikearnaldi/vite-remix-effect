# Using Effect with Remix

- [Remix Docs](https://remix.run/docs)
- [Effect Docs](https://effect.website/docs/introduction)
- [Vite Docs](https://vitejs.dev/guide/)

## Project Goals

Prototype an integration of Remix + Effect in such a way that the Effect runtime is only ever executed in the backend while keeping the frontend code minimal and fully type safe.

This project aims to demonstrate integration of Effect in one typical setup where the user is not in control of the program entrypoints that are delegated to frameworks, similar scenarios are for example the usage of Next.js or equivalent frameworks.

## Development

From your terminal:

```sh
pnpm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

First, build your app for production:

```sh
pnpm run build
```

Then run the app in production mode:

```sh
pnpm run start
```

Now you'll need to pick a host to deploy it to.

## Telemetry

If you want to see telemetry data this project is configured to work with [https://www.honeycomb.io/](https://www.honeycomb.io/), create an account if you don't have one (they have a very nice free tier) and write your project name & api key in a file called `.env`, follow the template `.env.template`

Note: if you want to change the backend you use for tracing, for example using your own [grafana tempo](https://grafana.com/oss/tempo/) you'll need to edit `/services/Tracing.ts` accordingly (see [https://github.com/Effect-TS/opentelemetry](https://github.com/Effect-TS/opentelemetry)).

## Project Setup

This project uses a nightly build of remix in order to use it together with vite. Apart from that it looks like a normal vite project.

The key configurations for vite are found in the `vite.config.ts` file that looks like:

```ts
import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    babel({
      filter: new RegExp(/\.tsx?$/),
    }),
    remix(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "build",
    copyPublicDir: false,
    minify: "terser",
  },
  publicDir: "./public",
});
```

Namely here we are setting up Remix together with babel, in babel we use a plugin to annotate pure calls so that we can tree-shake loaders and actions that use higher order functions.

In short this setup enables us to use and tree-shake the following pattern:

```tsx
export const loader = effectLoader(effect);
export const action = effectAction(effect);

export default function Component() {
  // plain component
}
```

## Code Structure

The project uses 4 main libraries of the effect ecosystem:

- `effect` to handle all effectful operations
- `@effect/schema` to define data models and handle serialization
- `@effect/opentelemetry` to integrate with a telemetry dashboard
- `@sqlfx/sqlite` to integrate with sqlite

As of telemetry for simplicity we are using [https://www.honeycomb.io/](https://www.honeycomb.io/) but any open telemetry compatible service will work with minor changes to the code

The directories are structured in the following way:

- `/app` contains all the app code
  - `/lib` contains integration code with effect (and a temporary hack to load opentelemetry from esm due to improper es modules)
  - `/migrations` contains all the database migration code, those are automatically loaded by the sql client
  - `/routes` contains the remix routes, loaders and actions
  - `/services` contains the business logic encapsulated in effect services
- `/database` contains the sqlite files
