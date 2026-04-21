import { describe, expect, test } from "bun:test";
import { formatCodeNameLabel } from "../src/shared/utils/code-name-label.utils";
import { materialDisplayLabel } from "../src/features/material/utils/material.utils";

describe("formatCodeNameLabel", () => {
  test("returns only name when both code and name are present", () => {
    expect(formatCodeNameLabel({ code: "SP001", name: "Abutment" })).toBe("Abutment");
  });

  test("trims whitespace and ignores code", () => {
    expect(formatCodeNameLabel({ code: "  SP001  ", name: "  Abutment  " })).toBe("Abutment");
  });

  test("returns name when only name is present", () => {
    expect(formatCodeNameLabel({ name: "Abutment" })).toBe("Abutment");
  });

  test("returns empty string when only code is present", () => {
    expect(formatCodeNameLabel({ code: "SP001" })).toBe("");
  });

  test("returns empty string when no usable value exists", () => {
    expect(formatCodeNameLabel({ code: "   ", name: "   " })).toBe("");
    expect(formatCodeNameLabel()).toBe("");
  });
});

describe("materialDisplayLabel", () => {
  test("delegates to the shared code-name formatter", () => {
    expect(materialDisplayLabel({ code: "VT001", name: "Scanbody" })).toBe("Scanbody");
    expect(materialDisplayLabel({ name: "Scanbody" })).toBe("Scanbody");
    expect(materialDisplayLabel({ code: "VT001" })).toBe("");
  });
});
