const vm = require('node:vm');

async function testCodeSnippet(name, rawCode, input = { name: "Raj" }, steps = { "node-1": { message: "Hello" } }) {
  try {
    const injectedInput = JSON.parse(JSON.stringify(input));
    const injectedSteps = JSON.parse(JSON.stringify(steps));

    const sandbox = Object.create(null);
    sandbox.input = injectedInput;
    sandbox.steps = injectedSteps;
    sandbox.console = Object.freeze({
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
    });
    sandbox.Math = Math;
    sandbox.JSON = JSON;
    sandbox.Array = Array;
    sandbox.Object = Object;
    sandbox.String = String;
    sandbox.Number = Number;
    sandbox.Boolean = Boolean;
    sandbox.Date = Date;
    sandbox.RegExp = RegExp;
    sandbox.parseInt = parseInt;
    sandbox.parseFloat = parseFloat;
    sandbox.isNaN = isNaN;
    sandbox.isFinite = isFinite;

    const vmContext = vm.createContext(sandbox);
    const wrappedCode = `(async function(input, steps) {\n${rawCode}\n})(input, steps)`;

    const script = new vm.Script(wrappedCode, {
      filename: "user-code.js",
    });

    const executionResultPromise = script.runInContext(vmContext, {
      timeout: 2000,
      displayErrors: true,
    });

    const asyncTimeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("CODE_TIMEOUT: Code node execution timed out after 5s.")),
        5000,
      ),
    );

    const rawResult = await Promise.race([
      Promise.resolve(executionResultPromise),
      asyncTimeoutPromise,
    ]);

    let formattedOutput;
    if (rawResult !== null && typeof rawResult === "object" && !Array.isArray(rawResult)) {
      formattedOutput = rawResult;
    } else {
      formattedOutput = { result: rawResult };
    }

    const serialized = JSON.stringify(formattedOutput);
    if (serialized.length > 1024 * 1024) {
      console.log(`[${name}] FAILED: CODE_OUTPUT_EXCEEDED: Exceeds 1MB limit.`);
      return;
    }

    console.log(`[${name}] SUCCESS:`, formattedOutput);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`[${name}] BLOCKED/CAUGHT:`, errorMsg);
  }
}

async function runAll() {
  console.log("=== CODE EXECUTOR SECURITY AUDIT SUITE ===");
  await testCodeSnippet("1. process.env", "return process.env;");
  await testCodeSnippet("2. process.exit()", "process.exit(1);");
  await testCodeSnippet("3. require('fs')", "return require('fs').readFileSync('package.json');");
  await testCodeSnippet("4. require('child_process')", "return require('child_process').execSync('whoami');");
  await testCodeSnippet("5. require('net')", "return require('net');");
  await testCodeSnippet("6. fetch()", "return fetch('http://127.0.0.1');");
  await testCodeSnippet("7. globalThis.process", "return globalThis.process;");
  await testCodeSnippet("8. Constructor escape", "return ({}).constructor.constructor('return process')();");
  await testCodeSnippet("9. Infinite Loop while(true)", "while(true){}");
  await testCodeSnippet("10. Runaway Async Loop", "while(true) await new Promise(r => setTimeout(r, 100));");
  await testCodeSnippet("11. Large output", "return Array(200000).fill({ a: 'too large payload' });");
  await testCodeSnippet("12. Legitimate workflow snippet", "return { name: input.name, greeting: 'Hello ' + input.name, msg: steps['node-1'].message };");
}

runAll();
