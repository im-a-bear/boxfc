import { readFile, dumpcj, makeServer, defaultBoxesSet, setPort, boxList, runServer } from '../dist/main.js';
import * as fs from 'fs';

const gab = await readFile('.test/main.bfg');
const avada = await readFile('.test/pa.bfg');

await dumpcj('.test/dumped/ans.box', gab.compilerrc);
await dumpcj('.test/dumped/poop.box', avada.compilerrc);

boxList(['.test/dumped/ans.box', '.test/dumped/poop.box']);
// defaultBoxesSet({
//     "ntfound": '.test/dumped/custom_404.box'
// });

await runServer(await makeServer());
