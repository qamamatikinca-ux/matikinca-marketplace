const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = readFileSync(path.join(__dirname, "../lib/financeMath.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleRef = { exports: {} };
new Function("module", "exports", compiled)(moduleRef, moduleRef.exports);
const { paymentForLoan, buyingPowerForBudget } = moduleRef.exports;
const close = (actual, expected, tolerance = 0.001) => assert.ok(Math.abs(actual - expected) < tolerance, `expected ${expected}; received ${actual}`);

test("no-interest amortisation and balloon arithmetic", () => {
  close(paymentForLoan(120000, 0, 12, 0), 10000);
  close(paymentForLoan(120000, 0, 12, 24000), 8000);
  close(paymentForLoan(0, 12, 12, 0), 0);
});

test("fixed rate without balloon matches independently derived amortisation", () => {
  const principal = 500000, monthlyRate = 0.12 / 12, months = 60;
  const reference = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
  close(paymentForLoan(principal, 12, months, 0), reference);
});

test("balloon discount produces the correct repayment and remaining balance", () => {
  const principal = 800000, rate = 10.5, months = 72, balloon = 120000;
  const payment = paymentForLoan(principal, rate, months, balloon);
  let balance = principal;
  for (let i = 0; i < months; i++) balance = balance * (1 + rate / 1200) - payment;
  close(balance, balloon, 0.001);
});

test("buying power is consistent with the forward repayment", () => {
  for (const annualRate of [0, 10.5, 21]) {
    for (const balloonRatio of [0, 0.2, 0.4]) {
      const price = buyingPowerForBudget(15000, annualRate, 60, 35000, 5000, balloonRatio);
      const principal = price - 35000 + 5000;
      close(paymentForLoan(principal, annualRate, 60, price * balloonRatio), 15000);
    }
  }
});

test("invalid financial parameters are not silently accepted", () => {
  assert.ok(Number.isNaN(paymentForLoan(-10, 10, 60)));
  assert.ok(Number.isNaN(paymentForLoan(20000, 10, 0)));
  assert.ok(Number.isNaN(paymentForLoan(20000, 10, 60, 25000)));
  assert.ok(Number.isNaN(buyingPowerForBudget(1000, 10, 60, 0, 0, 0.7)));
});
