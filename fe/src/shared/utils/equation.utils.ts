export function extractVars(expr: string): string[] {
  return Array.from(expr.matchAll(/[a-zA-Z_][a-zA-Z0-9_]*/g)).map(m => m[0]);
}
