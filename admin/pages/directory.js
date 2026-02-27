import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Directory() {
  const router = useRouter();
  useEffect(() => { router.replace('/tools'); }, []);
  return null;
}
