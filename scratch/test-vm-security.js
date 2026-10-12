const vm = require('node:vm');

function runTest(name, code) {
  const sandbox = Object.create(null);
  sandbox.input = { name: "Raj", value: 42 };
  sandbox.steps = { "node-1": { message: "Hello" } };
  sandbox.console = Object.freeze({
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
  });

  const context = vm.createContext(sandbox);

  try {
    const wrappedCode = `(function(input, steps) { ${code} })(input, steps)`;
    const result = vm.runInContext(wrappedCode, context, {
      timeout: 2000,
      importModuleDynamically: () => {
        throw new Error("SECURITY_ERROR: Dynamic import() is disabled in Code Node sandbox.");
      },
    });
    console.log(`[${name}] SUCCESS:`, result);
  } catch (err) {
    console.log(`[${name}] BLOCKED/CAUGHT:`, err.message);
  }
}

console.log("--- VM SECURITY SUITE TEST (WITH IMPORT BLOCKER) ---");

runTest("1. process.env access", "return process.env;");
runTest("2. process.exit()", "process.exit(1);");
runTest("3. require('fs')", "return require('fs').readFileSync('package.json', 'utf8');");
runTest("4. import('fs')", "return import('fs');");
runTest("5. child_process", "return require('child_process').execSync('whoami');");
runTest("6. fetch()", "return fetch('http://127.0.0.1');");
runTest("7. globalThis.process", "return globalThis.process;");
runTest("8. Constructor escape", "return ({}).constructor.constructor('return process')();");
runTest("9. Infinite Loop while(true)", "while(true){}");
runTest("10. Legitimate code", "return { name: input.name, greeting: 'Hello ' + input.name, stepMsg: steps['node-1'].message };");
runTest("11. WebAssembly", "return WebAssembly;");
runTest("12. Buffer", "return Buffer;");
runTest("13. Worker", "return Worker;");
