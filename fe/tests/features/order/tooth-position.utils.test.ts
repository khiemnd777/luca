import { describe, expect, test } from "bun:test";
import {
  addBridgeToothSegments,
  createBridgeSegments,
  expandToothSelectionSegments,
  formatToothPositionSegments,
  formatToothPositionsByJaw,
  parseToothPositionSegments,
  replaceToothSelectionInAffectedJaws,
} from "../../../src/features/order/utils/tooth-position.utils";

describe("tooth position utilities", () => {
  test("preserves bridge ranges and individual teeth in formatted output", () => {
    const segments = parseToothPositionSegments("12-15,16,17,18");

    expect(formatToothPositionSegments(segments)).toBe("12-15,16,17,18");
    expect(formatToothPositionsByJaw("12-15,16,17,18")).toEqual({
      upper: "12-15,16,17,18",
      lower: "",
    });
  });

  test("does not collapse individually selected consecutive teeth into a bridge", () => {
    const segments = parseToothPositionSegments("12,13,14,15");

    expect(formatToothPositionSegments(segments)).toBe("12,13,14,15");
  });

  test("expands bridge ranges for chart selection", () => {
    const segments = parseToothPositionSegments("12-15,18");

    expect(expandToothSelectionSegments(segments)).toEqual([12, 13, 14, 15, 18]);
  });

  test("creates bridge segments for contiguous valid tooth groups", () => {
    expect(formatToothPositionSegments(createBridgeSegments([18, 17, 16, 15]))).toBe("15-18");
    expect(formatToothPositionSegments(createBridgeSegments([18, 17, 16, 15, 21, 22]))).toBe("15-18,21-22");
  });

  test("adds a dragged bridge without clearing existing single selections", () => {
    const existing = parseToothPositionSegments("16,17,18");
    const next = addBridgeToothSegments(existing, [12, 13, 14, 15]);

    expect(formatToothPositionSegments(next)).toBe("12-15,16,17,18");
  });

  test("new bridge takes precedence over overlapping existing single selections", () => {
    const existing = parseToothPositionSegments("12,13,16");
    const next = addBridgeToothSegments(existing, [12, 13, 14, 15]);

    expect(formatToothPositionSegments(next)).toBe("12-15,16");
  });

  test("replaces only the affected jaw when selecting a single tooth", () => {
    const existing = parseToothPositionSegments("12-15,36-38");
    const next = replaceToothSelectionInAffectedJaws(existing, [{ kind: "single", code: 11 }]);

    expect(formatToothPositionSegments(next)).toBe("11,36-38");
  });

  test("replaces only the affected jaw when dragging a bridge", () => {
    const existing = parseToothPositionSegments("12,13,36-38");
    const next = replaceToothSelectionInAffectedJaws(existing, createBridgeSegments([14, 15, 16]));

    expect(formatToothPositionSegments(next)).toBe("14-16,36-38");
  });
});
