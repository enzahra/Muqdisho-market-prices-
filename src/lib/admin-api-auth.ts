import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canAccessCategory,
  canAdminModifyCategory,
  isAdminAccount,
  isSuperAdmin,
  toAdminSessionUser,
} from "@/lib/admin-role";
import { parseSessionCookie, type AdminSessionUser } from "@/lib/admin-session";

const UNAUTHORIZED = NextResponse.json(
  { error: "Fadlan ku gal admin ahaan marka hore." },
  { status: 401 }
);

const FORBIDDEN = NextResponse.json(
  { error: "Ma haysid ogolaanshaha ficilkan." },
  { status: 403 }
);

type AuthOk = { ok: true; admin: AdminSessionUser };
type AuthFail = { ok: false; response: NextResponse };

export async function requireAdmin(
  request: Request,
  options?: { superOnly?: boolean; categorySlug?: string }
): Promise<AuthOk | AuthFail> {
  const payload = parseSessionCookie(request.headers.get("cookie"));
  if (!payload) return { ok: false, response: UNAUTHORIZED };

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      isAdmin: true,
      adminRole: true,
    },
  });

  if (!dbUser || !isAdminAccount(dbUser)) {
    return { ok: false, response: UNAUTHORIZED };
  }

  const admin = toAdminSessionUser(dbUser);

  if (options?.superOnly && !isSuperAdmin(admin.adminRole)) {
    return { ok: false, response: FORBIDDEN };
  }

  if (
    options?.categorySlug &&
    !canAccessCategory(admin.adminRole, options.categorySlug)
  ) {
    return { ok: false, response: FORBIDDEN };
  }

  return { ok: true, admin };
}

export async function requireItemAccess(
  request: Request,
  itemId: string
): Promise<
  | { ok: true; admin: AdminSessionUser; categorySlug: string }
  | AuthFail
  | { ok: false; response: NextResponse; notFound?: boolean }
> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { category: { select: { slug: true } } },
  });

  if (!item) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Item not found" }, { status: 404 }),
      notFound: true,
    };
  }

  if (!canAdminModifyCategory(auth.admin.adminRole, item.category.slug)) {
    return { ok: false, response: FORBIDDEN };
  }

  return { ok: true, admin: auth.admin, categorySlug: item.category.slug };
}

export async function requireCategoryAccess(
  request: Request,
  categoryId: string
): Promise<
  | { ok: true; admin: AdminSessionUser; categorySlug: string }
  | AuthFail
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  });

  if (!category) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Category not found" }, { status: 404 }),
    };
  }

  if (!canAdminModifyCategory(auth.admin.adminRole, category.slug)) {
    return { ok: false, response: FORBIDDEN };
  }

  return { ok: true, admin: auth.admin, categorySlug: category.slug };
}
