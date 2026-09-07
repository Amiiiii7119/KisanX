import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}

export async function logAccessToken() {
    const supabase = createClient();

    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Failed to get session:", error);
        return;
    }

    if (!data.session) {
        console.log("No active Supabase session. Please log in first.");
        return;
    }

    console.log("KisanX USER ACCESS TOKEN:");
    console.log(data.session.access_token);
}