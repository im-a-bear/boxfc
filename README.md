# About BOXFC

![Static Badge](https://img.shields.io/badge/boxfc-started_project-magneta?style=for-the-badge)

A frontend language that's lightning quick, loads html on request, extremely small bundles. ⚡(More on this later)

# Installing it

```bash
pnpm add @boxfc/core
```

The current version of this package is built with PNPM. PNPM is recommended package manager. Later support will be added for other package managers. (This is to avoid bugs)

# Example

```ts
import { readFile, dumpcj, makeServer, runServer, boxList } from '@boxfc/core';

const gab = await readFile('./office.bfg');

await dumpcj('.test/dumped/ans.box', gab.compilerrc);

boxList(['dumped/ans.box']);

await runServer(await makeServer());
``` 

__office.bfg__:

```html
@docs boxfc this-is-my-app;

html main {
    <h1>Hello, World!</h1>
}
```

# Version info

Version 0.0.3