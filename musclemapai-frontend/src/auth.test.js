import { describe, expect, it } from "vitest";
import {
  DEMO_ACCOUNT_EMAIL,
  isDemoAlias,
  resolveAuthAction,
  resolveAuthEmail,
} from "./auth";

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

describe("resolveAuthAction", () => {
  it("signs the demo alias in directly, even from the sign-up screen", () => {
    expect(resolveAuthAction(" demo ", "signup")).toBe("signin");
    expect(resolveAuthAction("demo", "signin")).toBe("signin");
  });

  it("keeps normal sign-up and resend behavior unchanged", () => {
    expect(resolveAuthAction("user@example.com", "signup")).toBe("signup");
    expect(resolveAuthAction("demo", "resend")).toBe("resend");
  });
});

describe("isDemoAlias", () => {
  it("matches demo case-insensitively and ignores surrounding spaces", () => {
    expect(isDemoAlias(" DEMO ")).toBe(true);
    expect(isDemoAlias("user@example.com")).toBe(false);
  });
});
