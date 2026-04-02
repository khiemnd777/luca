import type { AuditRenderer } from "./types";

const _renderers: AuditRenderer[] = [];
const _registeredArrayRefs = new WeakSet<AuditRenderer[]>();
const _registeredFingerprints = new Set<string>();

const _autoRegistrarModules = import.meta.glob("@features/**/config/audit/*.ts", {
  eager: true,
});
void _autoRegistrarModules;

function rendererFingerprint(renderer: AuditRenderer): string {
  const fields =
    renderer.fields
      ?.map((field) => `${field.key}:${field.label ?? ""}:${field.hidden ? "1" : "0"}:${field.priority ?? ""}`)
      .join("|") ?? "";
  return [
    renderer.match.module,
    renderer.match.action,
    renderer.moduleLabel ?? "",
    fields,
    renderer.summary ? "s:1" : "s:0",
    renderer.actionLabel ? "a:1" : "a:0",
    renderer.renderDetail ? "d:1" : "d:0",
  ].join("::");
}

export function registerAuditRenderers(renderers: AuditRenderer[]): void {
  if (_registeredArrayRefs.has(renderers)) return;
  _registeredArrayRefs.add(renderers);

  for (const renderer of renderers) {
    const fingerprint = rendererFingerprint(renderer);
    if (_registeredFingerprints.has(fingerprint)) continue;
    _registeredFingerprints.add(fingerprint);
    _renderers.push(renderer);
  }
}

export function getAuditRenderers(): AuditRenderer[] {
  return [..._renderers];
}
