import assert from "node:assert";
import { eventFor, eventScript } from "./events";

const at = (m: number, d: number) => new Date(2026, m - 1, d);
assert.equal(eventFor("auto", at(10, 14)), null);
assert.equal(eventFor("auto", at(10, 15)), "halloween");
assert.equal(eventFor("auto", at(11, 2)), "halloween");
assert.equal(eventFor("auto", at(11, 3)), null);
assert.equal(eventFor("auto", at(12, 1)), "noel");
assert.equal(eventFor(null, at(1, 6)), "noel");
assert.equal(eventFor("auto", at(1, 7)), null);
assert.equal(eventFor("off", at(10, 31)), null);
assert.equal(eventFor("noel", at(7, 1)), "noel");
new Function(eventScript("auto").replace("document.documentElement.setAttribute", "(()=>{})"))();
console.log("events ok");
