import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { toAdminSessionUser } from '@/lib/admin-role'
import { buildSessionCookie, createSessionToken } from '@/lib/admin-session'

export async function POST(request: Request) {
  try {
    const { email, password, forAdmin } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const lookupEmail = String(email).toLowerCase().trim()
    const plainPassword = String(password).trim()

    const user = await prisma.user.findUnique({
      where: { email: lookupEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
        adminRole: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(plainPassword, user.password)

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const sessionUser = toAdminSessionUser(user)

    if (forAdmin && !sessionUser.isAdmin) {
      return NextResponse.json(
        {
          error:
            'Koontadaadan ma ahan admin. Super admin ayaa kuu abuuri kara akoon cusub.',
        },
        { status: 403 }
      )
    }

    const response = NextResponse.json({
      message: 'Login successful',
      user: sessionUser,
    }, { status: 200 })

    if (sessionUser.isAdmin) {
      const token = createSessionToken(sessionUser)
      response.headers.set('Set-Cookie', buildSessionCookie(token))
    }

    return response

  } catch (error: any) {
    console.error('Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
