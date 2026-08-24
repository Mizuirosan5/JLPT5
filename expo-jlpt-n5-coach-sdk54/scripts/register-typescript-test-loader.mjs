import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./scripts/typescript-test-loader.mjs', pathToFileURL('./'));
