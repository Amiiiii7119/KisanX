"use client";

import { useRouter } from "next/navigation";
import { AuthUI } from "@/components/ui/auth_ui";
import { createClient } from "@/lib/supabase/client";

type UserRole = "FARMER" | "BUYER" | "EXPERT";

export default function AuthPage() {
    const router = useRouter();
    const supabase = createClient();

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new Error(error.message);
        }

        router.push("/dashboard");
        router.refresh();
    };

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        role: UserRole,
    ) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role,
                },
            },
        });

        if (error) {
            throw new Error(error.message);
        }

        if (!data.user) {
            throw new Error("Account could not be created.");
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
                id: data.user.id,
                full_name: fullName,
                role,
            });

        if (profileError) {
            throw new Error(profileError.message);
        }

        router.push("/auth?registered=true");
        router.refresh();
    };

    const googleSignIn = async () => {
        const origin = window.location.origin;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${origin}/auth/confirm?next=/dashboard`,
            },
        });

        if (error) {
            throw new Error(error.message);
        }
    };

    return (
        <AuthUI
            onSignIn={signIn}
            onSignUp={signUp}
            onGoogleSignIn={googleSignIn}
        />
    );
}