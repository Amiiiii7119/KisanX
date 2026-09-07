import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";

export default function MarketplacePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-6 py-16">
                <Link
                    href="/"
                    className="text-sm font-medium text-primary hover:underline"
                >
                    ← Back to KisanX
                </Link>

                <div className="mt-10 max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                        KisanX Marketplace
                    </p>

                    <h1 className="mt-3 text-5xl font-bold tracking-tight">
                        Connect verified harvests with buyers.
                    </h1>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        Farmers will be able to list upcoming harvests with field,
                        readiness and yield information. Buyers can discover and negotiate
                        suitable crops.
                    </p>
                </div>

                <div className="mt-12 grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-6">
                        <ShieldCheck className="size-6 text-primary" />

                        <h2 className="mt-5 font-semibold">Verified Listings</h2>

                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Harvest listings can include AI verification evidence, field
                            location, capture timestamp and estimated yield range.
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-6">
                        <MapPin className="size-6 text-primary" />

                        <h2 className="mt-5 font-semibold">Nearby Buyers</h2>

                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Match farmers and buyers using distance, quantity, timing and
                            negotiated price.
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-6">
                        <ArrowRight className="size-6 text-primary" />

                        <h2 className="mt-5 font-semibold">Simple Transactions</h2>

                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Buyer acceptance, negotiation, payment and delivery will be
                            connected later.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}