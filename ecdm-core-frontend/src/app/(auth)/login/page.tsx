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
    const { login, isLoading } = useAuthStore();
    const t = useT();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError((err as Error).message);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left — Branding */}
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, hsl(217,91%,20%), hsl(280,60%,20%))' }}>
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-blue-500 blur-[120px]" />
                    <div className="absolute bottom-20 right-20 h-64 w-64 rounded-full bg-purple-500 blur-[120px]" />
                </div>
                <div className="relative z-10 p-12 text-center">
                    <Image src="/logo.png" alt="ECDM Solutions" width={80} height={80} className="mx-auto mb-8 rounded-2xl" />
                    <h1 className="text-4xl font-bold text-white mb-4">ECDM Core</h1>
                    <p className="text-lg text-white/60 max-w-sm">{t.auth.branding}</p>
                </div>
            </div>

            {/* Right — Login Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
                <div className="w-full max-w-md animate-fade-in">
                    {/* Mobile logo + lang switcher */}
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-3 lg:hidden">
                            <Image src="/logo.png" alt="ECDM" width={40} height={40} className="rounded-xl" />
                            <span className="text-xl font-bold">ECDM Core</span>
                        </div>
                        <div className="lg:ms-auto"><LangSwitcher /></div>
                    </div>

                    <h2 className="text-2xl font-bold mb-2">{t.auth.welcomeBack}</h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-8">{t.auth.signInContinue}</p>

                    {error && (
                        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.auth.email}</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className={cn(
                                    'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm',
                                    'placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]',
                                    'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all'
                                )}
                                placeholder="admin@ecdmsolutions.com"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.auth.password}</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password}
                                    onChange={(e) => setPassword(e.target.value)} required
                                    className={cn(
                                        'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 pr-12 text-sm',
                                        'placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]',
                                        'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all'
                                    )}
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading}
                            className={cn(
                                'w-full rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-white',
                                'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/50 transition-all',
                                'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                            )}>
                            {isLoading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                <><LogIn size={18} /> {t.auth.signIn}</>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        {t.auth.noAccount}{' '}
                        <Link href="/register" className="text-[hsl(var(--primary))] hover:underline font-medium">
                            <UserPlus size={14} className="inline mr-1" />{t.auth.createAccount}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
