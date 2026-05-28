export const ADMIN_CATEGORY_ROLES = ["animals", "water", "electricity"] as const;
export type AdminCategoryRole = (typeof ADMIN_CATEGORY_ROLES)[number];

export const LIVESTOCK_CATEGORY_SLUGS = ["geel", "lo", "ari"] as const;

export function categorySlugForRoleCheck(slug: string): string {
  const s = (slug || "").toLowerCase();
  if ((LIVESTOCK_CATEGORY_SLUGS as readonly string[]).includes(s)) return "animals";
  return s;
}

export function canAdminModifyCategory(adminRole: string, categorySlug: string): boolean {
  const role = normalizeAdminRole(adminRole);
  const cat = categorySlugForRoleCheck(categorySlug);
  return role === "ALL" || role === cat;
}

/** Primary super admin — cannot be demoted, deleted, or downgraded. */
export const PRIMARY_SUPER_ADMIN_EMAIL = "super@admin.com";

/** Normalize admin role for URL and guards (ALL vs category slugs). */
export function normalizeAdminRole(role: unknown): string {
  if (role == null || String(role).trim() === "") return "ALL";
  const s = String(role).trim();
  if (s.toUpperCase() === "ALL") return "ALL";
  return s.toLowerCase();
}

export function isSuperAdmin(role: unknown): boolean {
  return normalizeAdminRole(role) === "ALL";
}

export function canAccessCategory(role: unknown, categorySlug: string): boolean {
  const normalized = normalizeAdminRole(role);
  const slug = (categorySlug || "").toLowerCase();
  return normalized === "ALL" || normalized === slug;
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
  const normalized = normalizeAdminRole(role);
  return (
    normalized === "ALL" ||
    ADMIN_CATEGORY_ROLES.includes(normalized as AdminCategoryRole)
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
