import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
        return NextResponse.json({ exists: false, error: 'Gmail-kan kuma dhex jiro website-ka.' }, { status: 404 })
    }

    return NextResponse.json({ exists: true })

  } catch (error: any) {
    console.error('Check Email Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
