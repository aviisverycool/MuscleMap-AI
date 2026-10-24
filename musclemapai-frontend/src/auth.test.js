import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNT_EMAIL, resolveAuthEmail } from "./auth";

describe("resolveAuthEmail", () => {
  it("resolves the demo alias during sign-in", () => {
    expect(resolveAuthEmail(" demo ", "signin")).toBe(DEMO_ACCOUNT_EMAIL);
    expect(resolveAuthEmail("DEMO", "signin")).toBe(DEMO_ACCOUNT_EMAIL);
  });

  it("does not resolve the demo alias during sign-up or resend", () => {
    expect(resolveAuthEmail("demo", "signup")).toBe("demo");
    expect(resolveAuthEmail("demo", "resend")).toBe("demo");
  });

  it("trims regular email addresses without changing them", () => {
    expect(resolveAuthEmail(" user@example.com ", "signin")).toBe("user@example.com");
  });
});
