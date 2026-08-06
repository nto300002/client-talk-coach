import { describe, expect, it } from "vitest";

import { buttonClassName, buttonVariantClassNames, designTokens } from "./design-system";

describe("design system", () => {
  it("exposes stable light-orange color tokens", () => {
    expect(designTokens.color.page).toBe("#fff7ed");
    expect(designTokens.color.orange).toBe("#c2410c");
    expect(designTokens.radius.panel).toBe("8px");
  });

  it("maps each action meaning to a reusable button variant", () => {
    expect(buttonClassName("primary")).toBe("primary-action");
    expect(buttonVariantClassNames.warning).toBe("warning-action");
    expect(buttonVariantClassNames.destructive).toBe("destructive-action");
  });
});
