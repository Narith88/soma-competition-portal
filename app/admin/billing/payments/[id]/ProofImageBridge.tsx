'use client';

import { useState } from 'react';
import ImageInput from '@/components/ImageInput';

/**
 * Wraps the reusable ImageInput so its current URL is also sent with the form
 * submit (the parent form posts `proof_url`).
 */
export default function ProofImageBridge({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial);
  return (
    <>
      <ImageInput value={url} onChange={setUrl} kind="choices" compact />
      <input type="hidden" name="proof_url" value={url} />
    </>
  );
}
