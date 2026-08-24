import fs from 'node:fs';
import ts from 'typescript';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      for (const extension of ['.ts', '.tsx']) {
        const url = new URL(`${specifier}${extension}`, context.parentURL);
        if (fs.existsSync(url)) return { url: url.href, shortCircuit: true };
      }
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts') && !url.endsWith('.tsx')) return nextLoad(url, context);
  const source = fs.readFileSync(new URL(url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      sourceMap: true,
    },
    fileName: new URL(url).pathname,
  });
  return { format: 'module', source: output.outputText, shortCircuit: true };
}
