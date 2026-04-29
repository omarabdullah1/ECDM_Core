'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';
import LangSwitcher from '@/components/ui/LangSwitcher';
import { useT } from '@/i18n/useT';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const t = useT();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await login(email, password);
            // Keep spinner active while navigating to dashboard
            router.push('/dashboard');
        } catch (err: unknown) {
            setError((err as Error).message);
            setIsSubmitting(false); // Unlock button on failure
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#111111] p-4 text-[#111111]">
            <div className="w-full max-w-[400px] animate-fade-in rounded-3xl bg-white p-10 premium-shadow relative">
                
                {/* Logo and Titles */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#111111] text-2xl font-bold text-white mb-4 shadow-sm">
                        E
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight mb-1">ECDM_Core</h1>
                    <p className="text-sm text-[#6b7280]">Enterprise Resource Planning Suite</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-600 font-medium text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className={cn(
                                'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium',
                                'placeholder:text-gray-400 focus:border-[#111111]',
                                'focus:outline-none focus:ring-1 focus:ring-[#111111] transition-all hover:bg-gray-50'
                            )}
                            placeholder="user@ecdm.com"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700">Password</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} value={password}
                                onChange={(e) => setPassword(e.target.value)} required
                                className={cn(
                                    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm font-medium',
                                    'placeholder:text-gray-400 focus:border-[#111111]',
                                    'focus:outline-none focus:ring-1 focus:ring-[#111111] transition-all hover:bg-gray-50'
                                )}
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting}
                        className={cn(
                            'w-full rounded-xl bg-[#111111] px-4 py-3.5 text-sm font-bold text-white mt-2',
                            'hover:opacity-90 focus:outline-none focus:bg-black transition-all shadow-md',
                            'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                        )}>
                        {isSubmitting ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                            <>Sign In</>
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                        Secure Access Only
                    </p>
                </div>
            </div>
        </div>
    );
}

