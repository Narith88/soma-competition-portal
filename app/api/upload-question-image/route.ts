import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp']);

export async function POST(request: Request) {
  // 1) Authenticate: must be logged in.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // 2) Read the uploaded file and target folder kind.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  const kindRaw = (formData.get('kind') as string | null) ?? 'questions';
  const folder =
    kindRaw === 'choices' ? 'choices' : kindRaw === 'proof' ? 'proof' : 'questions';

  // 3) For question/choice uploads, require org editor role. Proof uploads are
  //    allowed for any logged-in user (it's their own payment screenshot).
  if (folder !== 'proof') {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }
  }

  // 3) Validate type and size. Reject SVG and anything not allowed.
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED.has(file.type) || !ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: 'Only PNG, JPG, JPEG, or WEBP images are allowed.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image too large. Maximum size is 5 MB.' }, { status: 400 });
  }

  // 4) Upload to Supabase Storage using the service role client.
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET || 'question-images';
  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${fileName}`;

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}. Make sure the "${bucket}" bucket exists and is public.` },
      { status: 500 }
    );
  }

  const { data: publicUrl } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl.publicUrl });
}
