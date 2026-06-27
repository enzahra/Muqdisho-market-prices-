import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api-auth';
import { importLivestockExcel } from '@/lib/livestock-dataset';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin(request, { categorySlug: 'animals' });
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Fayl lama helin.' }, { status: 400 });
    }

    const fileName = file instanceof File ? file.name : 'upload.xlsx';
    if (!/\.xlsx?$/i.test(fileName)) {
      return NextResponse.json(
        { error: 'Fadlan soo rar fayl Excel (.xlsx ama .xls).' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await importLivestockExcel(buffer);

    await prisma.auditLog.create({
      data: {
        action: 'LIVESTOCK_UPLOAD',
        details: `Excel upload by ${auth.admin.email}: ${summary.items} breeds across ${summary.categories} categories`,
        adminEmail: auth.admin.email || 'Admin',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Waa la soo raray! ${summary.items} nooc oo xoolo ah ayaa la cusbooneysiiyay.`,
      ...summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
