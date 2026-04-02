import "@root/mapper/index";
import "@core/search/index";
import "@core/notification";

// Auto-load modules
import.meta.glob("@features/**/index.tsx", { eager: true });
// Auto-load form schemas
import.meta.glob("@features/**/schemas/*.schema.ts", { eager: true });
import.meta.glob("@features/**/schemas/*.schema.tsx", { eager: true });
import.meta.glob("@core/**/schemas/*.schema.ts", { eager: true });
import.meta.glob("@core/**/schemas/*.schema.tsx", { eager: true });
// Auto-load tables
import.meta.glob("@core/**/tables/*.table.ts", { eager: true });
import.meta.glob("@core/**/tables/*.table.tsx", { eager: true });
import.meta.glob("@features/**/tables/*.table.ts", { eager: true });
import.meta.glob("@features/**/tables/*.table.tsx", { eager: true });
// Auto-load widgets
import.meta.glob("@features/**/widgets/*.widget.tsx", { eager: true });
import.meta.glob("@core/**/widgets/*.widget.tsx", { eager: true });
// Auto-load auditlog
import.meta.glob("@features/**/config/*.auditlog.ts", { eager: true });