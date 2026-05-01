import { TOOTH_SPRITES, type ToothCode } from "../components/teeth/tooth-sprite-map";

export const upperToothCodes: ToothCode[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const lowerToothCodes: ToothCode[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export type ToothSelectionKind = "bridge" | "single";

export type ToothSelectionSegment =
  | {
      kind: "bridge";
      start: ToothCode;
      end: ToothCode;
    }
  | {
      kind: "single";
      code: ToothCode;
    };

const validToothCodes = new Set<number>(
  Object.keys(TOOTH_SPRITES).map((code) => Number(code))
);

function isToothCode(code: number): code is ToothCode {
  return validToothCodes.has(code);
}

function uniqueSortedCodes(codes: Iterable<number>): ToothCode[] {
  return Array.from(new Set(codes))
    .filter(isToothCode)
    .sort((a, b) => a - b);
}

export function expandToothSelectionSegment(segment: ToothSelectionSegment): ToothCode[] {
  if (segment.kind === "single") return [segment.code];

  const rangeStart = Math.min(segment.start, segment.end);
  const rangeEnd = Math.max(segment.start, segment.end);
  const codes: ToothCode[] = [];

  for (let code = rangeStart; code <= rangeEnd; code += 1) {
    if (isToothCode(code)) {
      codes.push(code);
    }
  }

  return codes;
}

export function expandToothSelectionSegments(segments: ToothSelectionSegment[]): ToothCode[] {
  return uniqueSortedCodes(segments.flatMap(expandToothSelectionSegment));
}

export function parseToothPositionSegments(value?: string | null): ToothSelectionSegment[] {
  if (!value) return [];

  return value.split(",").flatMap((rawToken): ToothSelectionSegment[] => {
    const token = rawToken.trim();
    if (!token) return [];

    const parts = token.split("-").map((part) => part.trim());
    if (parts.length > 2) return [];

    const start = Number(parts[0]);
    const end = parts.length === 2 ? Number(parts[1]) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];

    if (parts.length === 2) {
      const rangeCodes = uniqueSortedCodes([start, end]);
      if (rangeCodes.length !== 2 && start !== end) return [];
      if (!isToothCode(start) || !isToothCode(end)) return [];
      return [{ kind: "bridge", start, end }];
    }

    if (!isToothCode(start)) return [];
    return [{ kind: "single", code: start }];
  });
}

export function formatToothPositionSegments(segments: ToothSelectionSegment[]): string {
  return sortToothSelectionSegments(segments)
    .map((segment) => {
      if (segment.kind === "single") return `${segment.code}`;
      const start = Math.min(segment.start, segment.end);
      const end = Math.max(segment.start, segment.end);
      return start === end ? `${start}` : `${start}-${end}`;
    })
    .join(",");
}

export function createBridgeSegments(codes: ToothCode[]): ToothSelectionSegment[] {
  const sorted = uniqueSortedCodes(codes);
  if (!sorted.length) return [];

  const segments: ToothSelectionSegment[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }

    segments.push({ kind: "bridge", start, end: prev });
    start = current;
    prev = current;
  }

  segments.push({ kind: "bridge", start, end: prev });
  return segments;
}

export function getToothSelectionKind(
  segments: ToothSelectionSegment[],
  code: ToothCode
): ToothSelectionKind | null {
  let hasSingle = false;

  for (const segment of segments) {
    const hasCode = expandToothSelectionSegment(segment).includes(code);
    if (!hasCode) continue;
    if (segment.kind === "bridge") return "bridge";
    hasSingle = true;
  }

  return hasSingle ? "single" : null;
}

export function addSingleToothSegment(
  segments: ToothSelectionSegment[],
  code: ToothCode
): ToothSelectionSegment[] {
  if (getToothSelectionKind(segments, code)) return segments;
  return sortToothSelectionSegments([...segments, { kind: "single", code }]);
}

export function addBridgeToothSegments(
  segments: ToothSelectionSegment[],
  codes: ToothCode[]
): ToothSelectionSegment[] {
  if (!codes.length) return sortToothSelectionSegments(segments);
  return sortToothSelectionSegments([
    ...removeToothCodesFromSegments(segments, codes),
    ...createBridgeSegments(codes),
  ]);
}

export function replaceToothSelectionInAffectedJaws(
  segments: ToothSelectionSegment[],
  nextSegments: ToothSelectionSegment[]
): ToothSelectionSegment[] {
  const nextCodes = expandToothSelectionSegments(nextSegments);
  const scopeCodes = getAffectedJawCodes(nextCodes);
  if (!scopeCodes.length) return sortToothSelectionSegments(segments);

  return sortToothSelectionSegments([
    ...removeToothCodesFromSegments(segments, scopeCodes),
    ...nextSegments,
  ]);
}

export function removeToothCodesFromSegments(
  segments: ToothSelectionSegment[],
  codesToRemove: ToothCode[]
): ToothSelectionSegment[] {
  const removeSet = new Set<number>(codesToRemove);

  return sortToothSelectionSegments(
    segments.flatMap((segment): ToothSelectionSegment[] => {
      if (segment.kind === "single") {
        return removeSet.has(segment.code) ? [] : [segment];
      }

      const remainingCodes = expandToothSelectionSegment(segment).filter(
        (code) => !removeSet.has(code)
      );
      return createBridgeSegments(remainingCodes);
    })
  );
}

export function sortToothSelectionSegments(
  segments: ToothSelectionSegment[]
): ToothSelectionSegment[] {
  return [...segments].sort((left, right) => segmentSortValue(left) - segmentSortValue(right));
}

export function formatToothPositionsByJaw(value?: string | null) {
  const segments = parseToothPositionSegments(value);
  const upperSet = new Set<number>(upperToothCodes);
  const lowerSet = new Set<number>(lowerToothCodes);

  return {
    upper: formatToothPositionSegments(filterSegmentsByCodes(segments, upperSet)),
    lower: formatToothPositionSegments(filterSegmentsByCodes(segments, lowerSet)),
  };
}

function filterSegmentsByCodes(
  segments: ToothSelectionSegment[],
  codeSet: Set<number>
): ToothSelectionSegment[] {
  return sortToothSelectionSegments(
    segments.flatMap((segment): ToothSelectionSegment[] => {
      if (segment.kind === "single") {
        return codeSet.has(segment.code) ? [segment] : [];
      }

      const codes = expandToothSelectionSegment(segment).filter((code) => codeSet.has(code));
      return createBridgeSegments(codes);
    })
  );
}

function segmentSortValue(segment: ToothSelectionSegment) {
  if (segment.kind === "single") return segment.code;
  return Math.min(segment.start, segment.end);
}

function getAffectedJawCodes(codes: ToothCode[]) {
  const codeSet = new Set<number>(codes);
  const affectedCodes: ToothCode[] = [];

  if (upperToothCodes.some((code) => codeSet.has(code))) {
    affectedCodes.push(...upperToothCodes);
  }
  if (lowerToothCodes.some((code) => codeSet.has(code))) {
    affectedCodes.push(...lowerToothCodes);
  }

  return affectedCodes;
}
