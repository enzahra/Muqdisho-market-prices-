import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { normalizeAdminRole, toAdminSessionUser } from '@/lib/admin-role'
import { requireAdmin } from '@/lib/admin-api-auth'

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, { superOnly: true })
    if (!auth.ok) return auth.response

    const { email, password, fullName, adminRole } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const lookupEmail = String(email).toLowerCase().trim()
    const plainPassword = String(password).trim()
    if (!plainPassword) {
      return NextResponse.json({ error: 'Password cannot be empty' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: lookupEmail }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    if (!adminRole || String(adminRole).trim() === '') {
      return NextResponse.json(
        { error: 'Admin role is required. Create admins from User Management (super admin only).' },
        { status: 403 }
      )
    }
    const resolvedRole = normalizeAdminRole(adminRole)
    if (resolvedRole !== 'ALL' && !['animals', 'water', 'electricity'].some((r) => resolvedRole.includes(r))) {
      return NextResponse.json(
        { error: 'Admin role is invalid. Use ALL or one/more of: animals, water, electricity.' },
        { status: 403 }
      )
    }

    const user = await prisma.user.create({
      data: {
        email: lookupEmail,
        password: hashedPassword,
        fullName: fullName?.trim() || null,
        isAdmin: true,
        adminRole: resolvedRole,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
        adminRole: true,
      },
    })

    return NextResponse.json({
      message: 'User created successfully',
      user: toAdminSessionUser(user),
    }, { status: 201 })

  } catch (error: any) {
    console.error('Registration Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
