import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { isAdminAccount } from '@/lib/admin-role'

export async function POST(request: Request) {
  try {
    const { email, newPassword, forAdmin } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 })
    }

    const lookupEmail = String(email).toLowerCase().trim()
    const plainPassword = String(newPassword).trim()

    if (plainPassword.length < 6) {
      return NextResponse.json({ error: 'Password-ka waa inuu ahaadaa ugu yaraan 6 xaraf' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: lookupEmail } })
    if (!user) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    if (forAdmin && !isAdminAccount(user)) {
      return NextResponse.json({ error: 'Koontadaadan ma ahan admin' }, { status: 403 })
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    await prisma.user.update({
      where: { email: lookupEmail },
      data: { password: hashedPassword }
    })

    // Log the security update
    await prisma.auditLog.create({
      data: {
        adminEmail: lookupEmail,
        action: 'Security Key Updated',
        details: 'Admin user updated their login credentials.'
      }
    })

    return NextResponse.json({ message: 'Password updated successfully' })

  } catch (error: any) {
    console.error('Password Update Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
