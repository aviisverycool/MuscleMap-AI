import { describe, expect, it } from "vitest";
import { normalizeMarkdownForRendering } from "./markdown";

const RAW_TABLE = [
  "| Exercise | Muscles |",
  "| --- | --- |",
  "| Squat | Quads and glutes |",
].join("\n");

describe("normalizeMarkdownForRendering", () => {
  it("leaves a raw GFM table unchanged", () => {
    expect(normalizeMarkdownForRendering(RAW_TABLE)).toBe(RAW_TABLE);
  });

  it("unwraps a fenced GFM table", () => {
    const fenced = `Here is the table:\n\n\`\`\`markdown\n${RAW_TABLE}\n\`\`\``;
    expect(normalizeMarkdownForRendering(fenced)).toBe(`Here is the table:\n\n${RAW_TABLE}`);
  });

  it("unwraps a table accidentally indented as code", () => {
    const indented = RAW_TABLE.split("\n").map((line) => `    ${line}`).join("\n");
    expect(normalizeMarkdownForRendering(indented)).toBe(RAW_TABLE);
  });

  it("preserves genuine fenced code blocks", () => {
    const code = "```js\nconst value = left | right;\n```";
    expect(normalizeMarkdownForRendering(code)).toBe(code);
  });
});
