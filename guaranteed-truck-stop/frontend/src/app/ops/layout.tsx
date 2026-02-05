'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Nav from '@/components/Nav';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'OPS')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
