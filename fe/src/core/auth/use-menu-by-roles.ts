import { useAuth } from "@core/auth/use-auth";
import type { MenuItem } from "@core/module/types";

// export type MenuItem = {
//   key: string;
//   label: string;
//   to: string;
//   roles?: string[];
//   requireAll?: boolean;
// };

/* Ví dụ sử dụng useMenuByRoles:
const RAW_ITEMS = [
  { key: "home", label: "Dashboard", to: "/" },
  { key: "posts", label: "Posts", to: "/posts", requireRoles: ["editor", "admin"] },
  { key: "admin", label: "Admin", to: "/admin", requireRoles: ["admin"] },
];

export function SideMenu() {
  const items = useMenuByRoles(RAW_ITEMS);
  return (
    <nav>
      {items.map((m) => (
        <Link key={m.key} to={m.to}>{m.label}</Link>
      ))}
    </nav>
  );
}
*/
export function useMenuByRoles(items: MenuItem[]) {
  const { hasRole } = useAuth();
  return items.filter((it) => {
    if (!it.roles?.length) return true;
    return it.requireAll
      ? it.roles.every(hasRole)
      : it.roles.some(hasRole);
  });
}
