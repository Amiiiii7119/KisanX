"use client";

import * as React from "react";
import Link from "next/link";
import {
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    Loader2,
    LockKeyhole,
    Mail,
    UserRound,
} from "lucide-react";

type AuthMode = "signin" | "signup";

type AuthRole = "FARMER" | "BUYER" | "EXPERT";

interface AuthUIProps {
    onSignIn?: (email: string, password: string) => Promise<void> | void;
    onSignUp?: (
        email: string,
        password: string,
        fullName: string,
        role: AuthRole,
    ) => Promise<void> | void;
    onGoogleSignIn?: () => Promise<void> | void;
}

const roles: {
    value: AuthRole;
    title: string;
    description: string;
}[] = [
        {
            value: "FARMER",
            title: "Farmer",
            description: "Manage your fields, crop health and harvest.",
        },
        {
            value: "BUYER",
            title: "Buyer",
            description: "Discover verified crops and connect with farmers.",
        },
        {
            value: "EXPERT",
            title: "Agriculture Expert",
            description: "Review cases and help validate field observations.",
        },
    ];

export function AuthUI({
    onSignIn,
    onSignUp,
    onGoogleSignIn,
}: AuthUIProps) {
    const [mode, setMode] = React.useState<AuthMode>("signin");
    const [fullName, setFullName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [role, setRole] = React.useState<AuthRole>("FARMER");
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [googleLoading, setGoogleLoading] = React.useState(false);
    const [message, setMessage] = React.useState("");
    const [error, setError] = React.useState("");

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            if (mode === "signin") {
                await onSignIn?.(email, password);
            } else {
                await onSignUp?.(email, password, fullName, role);
            }
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : "Something went wrong. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    const googleSignIn = async () => {
        setGoogleLoading(true);
        setError("");
        setMessage("");

        try {
            await onGoogleSignIn?.();
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : "Google sign-in failed. Please try again.",
            );
        } finally {
            setGoogleLoading(false);
        }
    };

    const switchMode = (nextMode: AuthMode) => {
        setMode(nextMode);
        setError("");
        setMessage("");
    };

    return (
        <main className="min-h-screen bg-[#030604] text-white">
            <div className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
                <section className="relative hidden overflow-hidden border-r border-[#1d2b20] lg:flex">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(33,86,43,.38),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(216,109,34,.12),transparent_25%)]" />

                    <div
                        className="absolute inset-0 opacity-[0.12]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(119,153,121,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(119,153,121,.2) 1px, transparent 1px)",
                            backgroundSize: "76px 76px",
                            maskImage:
                                "radial-gradient(ellipse at 35% 40%, black, transparent 75%)",
                            WebkitMaskImage:
                                "radial-gradient(ellipse at 35% 40%, black, transparent 75%)",
                        }}
                    />

                    <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-16">
                        <Link
                            href="/"
                            className="w-fit text-2xl font-semibold tracking-[-0.05em]"
                        >
                            Kisan<span className="text-[#e87524]">X</span>
                        </Link>

                        <div className="max-w-xl">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e87524]">
                                Crop intelligence platform
                            </p>

                            <h1 className="mt-6 text-6xl font-semibold leading-[0.9] tracking-[-0.06em] xl:text-8xl">
                                Your field.
                                <br />
                                <span className="text-[#789b7b]">Understood.</span>
                            </h1>

                            <p className="mt-7 max-w-lg text-base leading-7 text-[#7f8d82]">
                                Detect crop health issues, understand field risk, verify
                                harvest readiness and move from farm intelligence to market.
                            </p>

                            <div className="mt-10 flex flex-wrap gap-2">
                                {["Crop Vision", "Risk Forecast", "Harvest", "Marketplace"].map(
                                    (item) => (
                                        <span
                                            key={item}
                                            className="rounded-full border border-[#2b402f] bg-[#09120b]/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#7e8e81]"
                                        >
                                            {item}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-[#4f5d52]">
                            KisanX · AI-Powered Crop Health, Harvest & Market Intelligence
                        </p>
                    </div>
                </section>

                <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(31,75,39,.2),transparent_32%)]" />

                    <div className="relative z-10 w-full max-w-md">
                        <div className="mb-8 flex items-center justify-between lg:hidden">
                            <Link
                                href="/"
                                className="text-2xl font-semibold tracking-[-0.05em]"
                            >
                                Kisan<span className="text-[#e87524]">X</span>
                            </Link>

                            <Link
                                href="/"
                                className="text-xs text-[#78847b] hover:text-white"
                            >
                                Back home
                            </Link>
                        </div>

                        <div className="rounded-[2rem] border border-[#293b2d] bg-[#071009]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-8">
                            <div className="mb-8">
                                <div className="mb-6 flex h-11 w-fit items-center rounded-xl border border-[#314734] bg-[#0b170d] px-3">
                                    <span className="text-lg font-semibold tracking-[-0.04em]">
                                        Kisan<span className="text-[#e87524]">X</span>
                                    </span>
                                </div>

                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e87524]">
                                    {mode === "signin" ? "Welcome back" : "Join KisanX"}
                                </p>

                                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
                                    {mode === "signin"
                                        ? "Enter your field."
                                        : "Start with your field."}
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-[#758279]">
                                    {mode === "signin"
                                        ? "Sign in to continue to your KisanX workspace."
                                        : "Create an account and bring your farm intelligence together."}
                                </p>
                            </div>

                            <div className="mb-6 grid grid-cols-2 rounded-xl border border-[#27372b] bg-[#050a06] p-1">
                                <button
                                    type="button"
                                    onClick={() => switchMode("signin")}
                                    className={`rounded-lg py-2.5 text-sm font-medium transition ${mode === "signin"
                                            ? "bg-[#16251a] text-white shadow"
                                            : "text-[#6f7d73] hover:text-white"
                                        }`}
                                >
                                    Sign in
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode("signup")}
                                    className={`rounded-lg py-2.5 text-sm font-medium transition ${mode === "signup"
                                            ? "bg-[#16251a] text-white shadow"
                                            : "text-[#6f7d73] hover:text-white"
                                        }`}
                                >
                                    Create account
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={googleSignIn}
                                disabled={googleLoading || loading}
                                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#344438] bg-[#0a120c] text-sm font-medium text-[#d5ddd6] transition hover:border-[#526657] hover:bg-[#0e180f] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {googleLoading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <span className="flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#4285f4]">
                                        G
                                    </span>
                                )}
                                Continue with Google
                            </button>

                            <div className="my-6 flex items-center gap-3">
                                <div className="h-px flex-1 bg-[#243228]" />
                                <span className="text-[10px] uppercase tracking-[0.18em] text-[#536057]">
                                    or
                                </span>
                                <div className="h-px flex-1 bg-[#243228]" />
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                {mode === "signup" && (
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-medium text-[#aeb8b0]">
                                            Full name
                                        </span>
                                        <div className="relative">
                                            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5f6d63]" />
                                            <input
                                                required
                                                value={fullName}
                                                onChange={(event) => setFullName(event.target.value)}
                                                placeholder="Your name"
                                                className="h-12 w-full rounded-xl border border-[#2a3c2e] bg-[#050a06] pl-11 pr-4 text-sm text-white outline-none placeholder:text-[#4e5a51] focus:border-[#66836a]"
                                            />
                                        </div>
                                    </label>
                                )}

                                <label className="block">
                                    <span className="mb-2 block text-xs font-medium text-[#aeb8b0]">
                                        Email
                                    </span>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5f6d63]" />
                                        <input
                                            required
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder="you@example.com"
                                            className="h-12 w-full rounded-xl border border-[#2a3c2e] bg-[#050a06] pl-11 pr-4 text-sm text-white outline-none placeholder:text-[#4e5a51] focus:border-[#66836a]"
                                        />
                                    </div>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-medium text-[#aeb8b0]">
                                        Password
                                    </span>
                                    <div className="relative">
                                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5f6d63]" />
                                        <input
                                            required
                                            minLength={6}
                                            type={showPassword ? "text" : "password"}
                                            autoComplete={
                                                mode === "signin" ? "current-password" : "new-password"
                                            }
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            placeholder="Enter your password"
                                            className="h-12 w-full rounded-xl border border-[#2a3c2e] bg-[#050a06] pl-11 pr-11 text-sm text-white outline-none placeholder:text-[#4e5a51] focus:border-[#66836a]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#66746a] hover:text-white"
                                            aria-label={
                                                showPassword ? "Hide password" : "Show password"
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff className="size-4" />
                                            ) : (
                                                <Eye className="size-4" />
                                            )}
                                        </button>
                                    </div>
                                </label>

                                {mode === "signup" && (
                                    <div>
                                        <span className="mb-2 block text-xs font-medium text-[#aeb8b0]">
                                            I am joining as
                                        </span>

                                        <div className="grid gap-2">
                                            {roles.map((item) => {
                                                const selected = role === item.value;

                                                return (
                                                    <button
                                                        key={item.value}
                                                        type="button"
                                                        onClick={() => setRole(item.value)}
                                                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${selected
                                                                ? "border-[#6a814d] bg-[#101d12]"
                                                                : "border-[#26372a] bg-[#050a06] hover:border-[#3b4e3e]"
                                                            }`}
                                                    >
                                                        <span
                                                            className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${selected
                                                                    ? "border-[#e87524] bg-[#e87524] text-white"
                                                                    : "border-[#4a584d]"
                                                                }`}
                                                        >
                                                            {selected && <Check className="size-2.5" />}
                                                        </span>
                                                        <span>
                                                            <span className="block text-xs font-semibold text-[#dbe1dc]">
                                                                {item.title}
                                                            </span>
                                                            <span className="mt-0.5 block text-[11px] leading-4 text-[#68756b]">
                                                                {item.description}
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">
                                        {error}
                                    </div>
                                )}

                                {message && (
                                    <div className="rounded-xl border border-[#315139] bg-[#0b1b0e] px-4 py-3 text-xs leading-5 text-[#9cbb9f]">
                                        {message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || googleLoading}
                                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d96d22] text-sm font-semibold text-white shadow-[0_12px_35px_rgba(217,109,34,.16)] transition hover:-translate-y-0.5 hover:bg-[#e57a2c] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>
                                            {mode === "signin" ? "Enter KisanX" : "Create KisanX account"}
                                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="mt-6 text-center text-[11px] leading-5 text-[#59665d]">
                                By continuing, you agree to use KisanX responsibly and provide
                                accurate field information.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default AuthUI;
