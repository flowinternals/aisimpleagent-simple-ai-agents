import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCookies } from "./parseCookies.js";

describe("parseCookies", () => {
  it("returns empty object for missing header", () => {
    assert.deepEqual(parseCookies(undefined), {});
  });

  it("parses single and multiple cookies", () => {
    assert.deepEqual(parseCookies("a=1"), { a: "1" });
    assert.deepEqual(parseCookies("a=1; b=two"), { a: "1", b: "two" });
  });

  it("decodes URI-encoded values", () => {
    assert.deepEqual(parseCookies("tdg_demo_session=hello%2Fworld"), {
      tdg_demo_session: "hello/world",
    });
  });
});
