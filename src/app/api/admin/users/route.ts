import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  normalizeAdminRole,
  isProtectedSuperAdmin,
  isSuperAdmin,
} from '@/lib/admin-role'
import { requireAdmin } from '@/lib/admin-api-auth'

const PROTECTED_MSG =
  'Super admin-ka lama demote-gareyn karo, lama tirtiri karo, doorkiisana lama beddeli karo.'

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request, { superOnly: true })
    if (!auth.ok) return auth.response

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
        adminRole: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Fetch Users Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request, { superOnly: true })
    if (!auth.ok) return auth.response

    const { userId, isAdmin, adminRole } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (isProtectedSuperAdmin(target)) {
      if (
        isAdmin === false ||
        adminRole === null ||
        (adminRole != null && !isSuperAdmin(adminRole))
      ) {
        return NextResponse.json({ error: PROTECTED_MSG }, { status: 403 })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin,
        adminRole: adminRole != null ? normalizeAdminRole(adminRole) : null
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Update User Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request, { superOnly: true })
    if (!auth.ok) return auth.response

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (isProtectedSuperAdmin(target)) {
      return NextResponse.json({ error: PROTECTED_MSG }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Delete User Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
