'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import Link from 'next/link';
import LangSwitcher from '@/components/ui/LangSwitcher';
import { useT } from '@/i18n/useT';

export default function RegisterPage() {
    const router = useRouter();
    const { register, isLoading } = useAuthStore();
    const t = useT();
    const r = t.auth.register;
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await register(form);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError((err as Error).message);
        }
    };

    const inputCls = cn(
        'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm',
        'placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]',
        'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all'
    );

    return (
        <div className="flex min-h-screen">
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, hsl(280,60%,20%), hsl(217,91%,20%))' }}>
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-purple-500 blur-[120px]" />
                    <div className="absolute bottom-20 left-20 h-64 w-64 rounded-full bg-blue-500 blur-[120px]" />
                </div>
                <div className="relative z-10 p-12 text-center">
                    <Image src="/logo.png" alt="ECDM Solutions" width={80} height={80} className="mx-auto mb-8 rounded-2xl" />
                    <h1 className="text-4xl font-bold text-white mb-4">{r.joinTitle}</h1>
                    <p className="text-lg text-white/60 max-w-sm">{r.branding}</p>
                </div>
            </div>

            <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="lg:hidden" />
                        <LangSwitcher className="ms-auto" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">{r.title}</h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-8">{r.subtitle}</p>

                    {error && (
                        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{r.firstName}</label>
                                <input type="text" value={form.firstName} onChange={update('firstName')} required
                                    className={inputCls} placeholder="Ahmed" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{r.lastName}</label>
                                <input type="text" value={form.lastName} onChange={update('lastName')} required
                                    className={inputCls} placeholder="Admin" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.auth.email}</label>
                            <input type="email" value={form.email} onChange={update('email')} required
                                className={inputCls} placeholder="you@ecdmsolutions.com" />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.auth.password}</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={form.password}
                                    onChange={update('password')} required minLength={8}
                                    className={cn(inputCls, 'pr-12')} placeholder="Min. 8 characters" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-white">
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
                                <><UserPlus size={18} /> {r.title}</>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        {r.alreadyAccount}{' '}
                        <Link href="/login" className="text-[hsl(var(--primary))] hover:underline font-medium">{r.signIn}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
