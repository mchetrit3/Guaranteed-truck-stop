'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const DEMO_ACCOUNTS = [
  { email: 'driver1@gts.demo', role: 'Driver', name: 'Mike Johnson' },
  { email: 'driver2@gts.demo', role: 'Driver', name: 'Sarah Williams' },
  { email: 'ops@gts.demo', role: 'Ops', name: 'Sam Operations' },
  { email: 'loc1@gts.demo', role: 'Location', name: 'Tom LocationMgr' },
  { email: 'loc2@gts.demo', role: 'Location', name: 'Jane LocationMgr' },
  { email: 'fleet@gts.demo', role: 'Fleet', name: 'Fleet Manager' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (acctEmail: string) => {
    setError('');
    setLoading(true);
    try {
      await login(acctEmail, 'demo1234');
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Guaranteed Truck Stop</h1>
          <p className="mt-2 text-gray-600">Reserve guaranteed parking along major corridors</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">BETA</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Demo Login</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                onClick={() => quickLogin(acct.email)}
                disabled={loading}
                className="text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border text-sm disabled:opacity-50"
              >
                <span className="font-medium text-gray-900 block">{acct.name}</span>
                <span className="text-gray-500 text-xs">{acct.role}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">All demo passwords: demo1234</p>
        </div>
      </div>
    </div>
  );
}
