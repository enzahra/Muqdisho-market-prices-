export const ADMIN_CATEGORY_ROLES = ["animals", "water", "electricity"] as const;
export type AdminCategoryRole = (typeof ADMIN_CATEGORY_ROLES)[number];

export const LIVESTOCK_CATEGORY_SLUGS = ["geel", "lo", "ari"] as const;

export function categorySlugForRoleCheck(slug: string): string {
  const s = (slug || "").toLowerCase();
  if ((LIVESTOCK_CATEGORY_SLUGS as readonly string[]).includes(s)) return "animals";
  return s;
}

/** Parse stored adminRole — supports single slug, comma-separated slugs, or ALL. */
export function parseAdminRoles(role: unknown): string[] {
  if (role == null || String(role).trim() === "") return ["ALL"];
  const raw = String(role).trim();
  if (raw.toUpperCase() === "ALL") return ["ALL"];
  const parts = raw
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => ADMIN_CATEGORY_ROLES.includes(r as AdminCategoryRole));
  return parts.length > 0 ? [...new Set(parts)] : ["ALL"];
}

/** Encode role list for DB storage (sorted, deduped). */
export function encodeAdminRoles(roles: string[]): string {
  const normalized = [...new Set(roles.map((r) => r.trim().toLowerCase()))];
  if (normalized.includes("all") || normalized.length === 0) return "ALL";
  const valid = normalized.filter((r) =>
    ADMIN_CATEGORY_ROLES.includes(r as AdminCategoryRole)
  );
  if (valid.length === 0) return "ALL";
  return valid.sort().join(",");
}

export function getAdminNavCategories(role: unknown): AdminCategoryRole[] {
  const roles = parseAdminRoles(role);
  if (roles.includes("ALL")) return [...ADMIN_CATEGORY_ROLES];
  return roles.filter((r): r is AdminCategoryRole =>
    ADMIN_CATEGORY_ROLES.includes(r as AdminCategoryRole)
  );
}

export function canAdminModifyCategory(adminRole: string, categorySlug: string): boolean {
  return canAccessCategory(adminRole, categorySlug);
}

/** Primary super admin — cannot be demoted, deleted, or downgraded. */
export const PRIMARY_SUPER_ADMIN_EMAIL = "super@admin.com";

/** Normalize admin role for storage and guards. */
export function normalizeAdminRole(role: unknown): string {
  return encodeAdminRoles(parseAdminRoles(role));
}

export function isSuperAdmin(role: unknown): boolean {
  const roles = parseAdminRoles(role);
  return roles.length === 1 && roles[0] === "ALL";
}

export function canAccessCategory(role: unknown, categorySlug: string): boolean {
  const roles = parseAdminRoles(role);
  if (roles.includes("ALL")) return true;
  const cat = categorySlugForRoleCheck(categorySlug);
  return roles.includes(cat);
}

export function isPrimarySuperAdminEmail(email: unknown): boolean {
  return String(email ?? "").toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL;
}

/** Primary super admin account — admin access cannot be removed or downgraded. */
export function isProtectedSuperAdmin(user: { email?: unknown }): boolean {
  return isPrimarySuperAdminEmail(user.email);
}

/** True if account may use the admin panel (handles legacy rows missing isAdmin). */
export function isAdminAccount(user: {
  isAdmin?: unknown;
  adminRole?: unknown;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.isAdmin === false) return false;
  const role = user.adminRole;
  if (role == null || String(role).trim() === "") return false;
  const roles = parseAdminRoles(role);
  return (
    roles.includes("ALL") ||
    roles.some((r) => ADMIN_CATEGORY_ROLES.includes(r as AdminCategoryRole))
  );
}

export function toAdminSessionUser(user: {
  id: string;
  email: string;
  fullName?: string | null;
  isAdmin?: boolean | null;
  adminRole?: string | null;
}) {
  const adminRole = normalizeAdminRole(user.adminRole ?? "ALL");
  const isAdmin = isAdminAccount({ isAdmin: user.isAdmin, adminRole });
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName ?? null,
    isAdmin,
    adminRole,
  };
}
