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

const jawToothCodes = [upperToothCodes, lowerToothCodes] as const;

function isToothCode(code: number): code is ToothCode {
  return validToothCodes.has(code);
}

function uniqueCodesInOrder(codes: Iterable<number>): ToothCode[] {
  return Array.from(new Set(codes)).filter(isToothCode);
}

export function expandToothSelectionSegment(segment: ToothSelectionSegment): ToothCode[] {
  if (segment.kind === "single") return [segment.code];

  if (Math.floor(segment.start / 10) === Math.floor(segment.end / 10)) {
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

  const jawCodes = getSegmentJawCodes(segment.start, segment.end);
  if (!jawCodes) return [];

  const startIndex = jawCodes.indexOf(segment.start);
  const endIndex = jawCodes.indexOf(segment.end);
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return jawCodes.slice(from, to + 1);
}

export function expandToothSelectionSegments(segments: ToothSelectionSegment[]): ToothCode[] {
  return uniqueCodesInOrder(segments.flatMap(expandToothSelectionSegment));
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
      if (!isToothCode(start) || !isToothCode(end)) return [];
      if (!getSegmentJawCodes(start, end)) return [];
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
      const [start, end] = getFormattedBridgeEndpoints(segment.start, segment.end);
      return start === end ? `${start}` : `${start}-${end}`;
    })
    .join(",");
}

export function createBridgeSegments(codes: ToothCode[]): ToothSelectionSegment[] {
  const codeSet = new Set<number>(codes);
  const segments: ToothSelectionSegment[] = [];

  for (const jawCodes of jawToothCodes) {
    let start: ToothCode | null = null;
    let prev: ToothCode | null = null;

    for (const code of jawCodes) {
      if (!codeSet.has(code)) {
        if (start != null && prev != null) {
          segments.push(createBridgeSegment(start, prev));
        }
        start = null;
        prev = null;
        continue;
      }

      start ??= code;
      prev = code;
    }

    if (start != null && prev != null) {
      segments.push(createBridgeSegment(start, prev));
    }
  }

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
  const code = segment.kind === "single"
    ? segment.code
    : getFormattedBridgeEndpoints(segment.start, segment.end)[0];
  return code;
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

function getSegmentJawCodes(start: ToothCode, end: ToothCode): ToothCode[] | null {
  return jawToothCodes.find((codes) => codes.includes(start) && codes.includes(end)) ?? null;
}

function getFormattedBridgeEndpoints(start: ToothCode, end: ToothCode): [ToothCode, ToothCode] {
  if (start === end) return [start, end];

  const startQuadrant = Math.floor(start / 10);
  const endQuadrant = Math.floor(end / 10);
  if (startQuadrant === endQuadrant) {
    return start < end ? [start, end] : [end, start];
  }

  const jawCodes = getSegmentJawCodes(start, end);
  if (!jawCodes) return start < end ? [start, end] : [end, start];

  return jawCodes.indexOf(start) <= jawCodes.indexOf(end) ? [start, end] : [end, start];
}

function createBridgeSegment(start: ToothCode, end: ToothCode): ToothSelectionSegment {
  const [formattedStart, formattedEnd] = getFormattedBridgeEndpoints(start, end);
  return { kind: "bridge", start: formattedStart, end: formattedEnd };
}
