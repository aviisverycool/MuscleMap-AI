import { describe, expect, it } from "vitest";
import {
  DEMO_ACCOUNT_EMAIL,
  isDemoAccountIdentifier,
  isDemoAlias,
  resolveAuthAction,
  resolveAuthEmail,
} from "./auth";

describe("resolveAuthEmail", () => {
  it("resolves the demo alias to the configured email during sign-in", () => {
    if (!DEMO_ACCOUNT_EMAIL) {
      expect(resolveAuthEmail(" demo ", "signin")).toBe("");
      return;
    }
    expect(resolveAuthEmail(" demo ", "signin")).toBe(DEMO_ACCOUNT_EMAIL);
    expect(resolveAuthEmail("DEMO", "signin")).toBe(DEMO_ACCOUNT_EMAIL);
  });

  it("does not resolve the demo alias during sign-up or resend", () => {
    expect(resolveAuthEmail("demo", "resend")).toBe("demo");
  });

  it("trims regular email addresses without changing them", () => {
    expect(resolveAuthEmail(" user@example.com ", "signin")).toBe("user@example.com");
  });
});

describe("resolveAuthAction", () => {
  it("signs the demo alias or account email in from the sign-up screen", () => {
    expect(resolveAuthAction(" demo ", "signup")).toBe("signin");
    expect(resolveAuthAction("demo", "signin")).toBe("signin");
    if (DEMO_ACCOUNT_EMAIL) {
      expect(resolveAuthAction(DEMO_ACCOUNT_EMAIL, "signup")).toBe("signin");
      expect(resolveAuthAction(` ${DEMO_ACCOUNT_EMAIL.toUpperCase()} `, "signup")).toBe("signin");
    }
  });

  it("keeps normal sign-up and resend behavior unchanged", () => {
    expect(resolveAuthAction("user@example.com", "signup")).toBe("signup");
    expect(resolveAuthAction("demo", "resend")).toBe("resend");
  });
});

describe("isDemoAccountIdentifier", () => {
  it("matches the alias and full demo email", () => {
    expect(isDemoAccountIdentifier(" DEMO ")).toBe(true);
    if (DEMO_ACCOUNT_EMAIL) {
      expect(isDemoAccountIdentifier(` ${DEMO_ACCOUNT_EMAIL.toUpperCase()} `)).toBe(true);
    }
    expect(isDemoAccountIdentifier("user@example.com")).toBe(false);
  });
});

describe("isDemoAlias", () => {
  it("matches demo case-insensitively and ignores surrounding spaces", () => {
    expect(isDemoAlias(" DEMO ")).toBe(true);
    expect(isDemoAlias("user@example.com")).toBe(false);
  });
});
