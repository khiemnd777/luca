// Auto-load mapper profiles from root mapper folder
import.meta.glob("@root/mapper/profiles/*.profile.ts", { eager: true });
// Auto-load mapper profiles from features
import.meta.glob("@features/**/mapper/*.profile.ts", { eager: true });
