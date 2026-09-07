import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";


type Farm = {
    id: string;
    name: string;
    village: string | null;
    district: string | null;
    area_acres: number;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
};


export default async function DashboardPage() {

    const supabase = await createClient();

    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    const {
        data: {
            user,
        },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }


    // ---------------------------------------------------------
    // PROFILE
    // ---------------------------------------------------------

    const {
        data: profile,
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();


    // ---------------------------------------------------------
    // FARMS
    // ---------------------------------------------------------

    const {
        data: farms,
        error: farmsError,
    } = await supabase
        .from("farms")
        .select(
            "id, name, village, district, area_acres, latitude, longitude, created_at"
        )
        .eq(
            "owner_id",
            user.id
        )
        .order(
            "created_at",
            {
                ascending: false,
            }
        );


    const farmList: Farm[] =
        farms ?? [];


    // ---------------------------------------------------------
    // STATS
    // ---------------------------------------------------------

    const totalFarms =
        farmList.length;

    const totalArea =
        farmList.reduce(
            (
                total,
                farm
            ) =>
                total +
                Number(
                    farm.area_acres || 0
                ),
            0
        );


    // ---------------------------------------------------------
    // USER NAME
    // ---------------------------------------------------------

    const metadata =
        user.user_metadata ?? {};

    const displayName =
        profile?.full_name ||
        metadata.full_name ||
        metadata.name ||
        user.email?.split("@")[0] ||
        "Farmer";


    return (
        <main className="min-h-screen bg-[#07100b] text-white">

            {/* =====================================================
          NAVBAR
      ===================================================== */}

            <header className="border-b border-white/10 bg-[#07100b]/95">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

                    <Link
                        href="/dashboard"
                        className="text-2xl font-semibold tracking-tight"
                    >
                        Kisan<span className="text-orange-500">X</span>
                    </Link>


                    <div className="flex items-center gap-3">

                        <span className="hidden text-sm text-white/50 sm:block">
                            {user.email}
                        </span>

                        <form action="/auth/logout" method="post">

                            <button
                                type="submit"
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                            >
                                Logout
                            </button>

                        </form>

                    </div>

                </div>

            </header>


            {/* =====================================================
          CONTENT
      ===================================================== */}

            <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">


                {/* ===================================================
            WELCOME
        =================================================== */}

                <section className="mb-8">

                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-400">
                        KisanX Dashboard
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Welcome, {displayName}
                    </h1>

                    <p className="mt-2 max-w-2xl text-white/50">
                        Manage your farms, monitor crop health,
                        and use AI-powered intelligence to make
                        better farming decisions.
                    </p>

                </section>


                {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

                <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">


                    {/* ADD FARM */}

                    <Link
                        href="/dashboard/farm/new"
                        className="group rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5 transition hover:border-orange-500/40 hover:bg-orange-500/15"
                    >

                        <div className="flex items-start justify-between">

                            <div>

                                <p className="text-xs uppercase tracking-[0.18em] text-orange-400">
                                    Farm
                                </p>

                                <h2 className="mt-2 text-lg font-semibold">
                                    Add Farm
                                </h2>

                                <p className="mt-1 text-sm text-white/45">
                                    Register a new farm or plot.
                                </p>

                            </div>

                            <span className="text-2xl transition group-hover:translate-x-1">
                                +
                            </span>

                        </div>

                    </Link>


                    {/* SCAN CROP */}

                    <Link
                        href="/dashboard/scan"
                        className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
                    >

                        <div className="flex items-start justify-between">

                            <div>

                                <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">
                                    AI Health
                                </p>

                                <h2 className="mt-2 text-lg font-semibold">
                                    Scan Crop
                                </h2>

                                <p className="mt-1 text-sm text-white/45">
                                    Check a sugarcane leaf for disease.
                                </p>

                            </div>

                            <span className="text-2xl transition group-hover:scale-110">
                                🌿
                            </span>

                        </div>

                    </Link>


                    {/* RISK */}

                    <Link
                        href="/dashboard/risk"
                        className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
                    >

                        <div className="flex items-start justify-between">

                            <div>

                                <p className="text-xs uppercase tracking-[0.18em] text-yellow-400">
                                    Forecast
                                </p>

                                <h2 className="mt-2 text-lg font-semibold">
                                    Crop Risk
                                </h2>

                                <p className="mt-1 text-sm text-white/45">
                                    View upcoming crop risks.
                                </p>

                            </div>

                            <span className="text-2xl transition group-hover:scale-110">
                                ◈
                            </span>

                        </div>

                    </Link>


                    {/* MARKET */}

                    <Link
                        href="/market"
                        className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
                    >

                        <div className="flex items-start justify-between">

                            <div>

                                <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                                    Market
                                </p>

                                <h2 className="mt-2 text-lg font-semibold">
                                    Market Intelligence
                                </h2>

                                <p className="mt-1 text-sm text-white/45">
                                    Explore prices and buyers.
                                </p>

                            </div>

                            <span className="text-2xl transition group-hover:translate-x-1">
                                ↗
                            </span>

                        </div>

                    </Link>

                </section>


                {/* ===================================================
            STATS
        =================================================== */}

                <section className="mb-8 grid gap-4 sm:grid-cols-3">


                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">

                        <p className="text-sm text-white/45">
                            Registered Farms
                        </p>

                        <p className="mt-2 text-3xl font-semibold">
                            {totalFarms}
                        </p>

                    </div>


                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">

                        <p className="text-sm text-white/45">
                            Total Farm Area
                        </p>

                        <p className="mt-2 text-3xl font-semibold">
                            {totalArea.toFixed(1)}
                            <span className="ml-2 text-base font-normal text-white/40">
                                acres
                            </span>
                        </p>

                    </div>


                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">

                        <p className="text-sm text-white/45">
                            Crop
                        </p>

                        <p className="mt-2 text-3xl font-semibold">
                            Sugarcane
                        </p>

                    </div>

                </section>


                {/* ===================================================
            FARMS
        =================================================== */}

                <section>

                    <div className="mb-5 flex items-center justify-between">

                        <div>

                            <p className="text-xs uppercase tracking-[0.2em] text-orange-400">
                                Your Land
                            </p>

                            <h2 className="mt-2 text-2xl font-semibold">
                                My Farms
                            </h2>

                        </div>


                        <Link
                            href="/dashboard/farm/new"
                            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400"
                        >
                            + Add Farm
                        </Link>

                    </div>


                    {/* DATABASE ERROR */}

                    {farmsError && (

                        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">

                            <p className="font-medium text-red-300">
                                Could not load your farms.
                            </p>

                            <p className="mt-2 text-sm text-red-300/70">
                                {farmsError.message}
                            </p>

                        </div>

                    )}


                    {/* NO FARMS */}

                    {!farmsError &&
                        farmList.length === 0 && (

                            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 py-14 text-center">

                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl">
                                    🌾
                                </div>

                                <h3 className="mt-5 text-xl font-semibold">
                                    No farms registered yet
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
                                    Add your first farm to start using
                                    KisanX crop health and farm
                                    intelligence features.
                                </p>

                                <Link
                                    href="/dashboard/farm/new"
                                    className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
                                >
                                    Register My Farm
                                </Link>

                            </div>

                        )}


                    {/* FARM CARDS */}

                    {!farmsError &&
                        farmList.length > 0 && (

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                                {farmList.map(
                                    (farm) => (

                                        <div
                                            key={farm.id}
                                            className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
                                        >

                                            <div className="flex items-start justify-between">

                                                <div>

                                                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">
                                                        Sugarcane Farm
                                                    </p>

                                                    <h3 className="mt-2 text-xl font-semibold">
                                                        {farm.name}
                                                    </h3>

                                                </div>

                                                <span className="text-2xl">
                                                    🌱
                                                </span>

                                            </div>


                                            {/* LOCATION */}

                                            <div className="mt-6 space-y-3">

                                                {(farm.village ||
                                                    farm.district) && (

                                                        <div className="flex items-start gap-3">

                                                            <span className="mt-0.5 text-white/30">
                                                                ◉
                                                            </span>

                                                            <div>

                                                                <p className="text-xs text-white/35">
                                                                    Location
                                                                </p>

                                                                <p className="text-sm text-white/65">
                                                                    {[
                                                                        farm.village,
                                                                        farm.district,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(
                                                                            ", "
                                                                        )}
                                                                </p>

                                                            </div>

                                                        </div>

                                                    )}


                                                {/* AREA */}

                                                <div className="flex items-start gap-3">

                                                    <span className="mt-0.5 text-white/30">
                                                        ▣
                                                    </span>

                                                    <div>

                                                        <p className="text-xs text-white/35">
                                                            Farm Area
                                                        </p>

                                                        <p className="text-sm text-white/65">
                                                            {Number(
                                                                farm.area_acres
                                                            ).toFixed(2)}
                                                            {" "}
                                                            acres
                                                        </p>

                                                    </div>

                                                </div>


                                                {/* GPS */}

                                                {farm.latitude !== null &&
                                                    farm.longitude !== null && (

                                                        <div className="flex items-start gap-3">

                                                            <span className="mt-0.5 text-white/30">
                                                                ◎
                                                            </span>

                                                            <div>

                                                                <p className="text-xs text-white/35">
                                                                    GPS
                                                                </p>

                                                                <p className="text-xs text-white/50">
                                                                    {Number(
                                                                        farm.latitude
                                                                    ).toFixed(5)}
                                                                    ,{" "}
                                                                    {Number(
                                                                        farm.longitude
                                                                    ).toFixed(5)}
                                                                </p>

                                                            </div>

                                                        </div>

                                                    )}

                                            </div>


                                            {/* ACTION */}

                                            <div className="mt-6 border-t border-white/10 pt-5">

                                                <Link
                                                    href="/dashboard/scan"
                                                    className="flex items-center justify-between text-sm font-medium text-orange-400 transition hover:text-orange-300"
                                                >
                                                    <span>
                                                        Scan this crop
                                                    </span>

                                                    <span className="transition group-hover:translate-x-1">
                                                        →
                                                    </span>

                                                </Link>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                </section>


                {/* ===================================================
            FOOTER INFO
        =================================================== */}

                <section className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-6 sm:p-8">

                    <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">

                        <div>

                            <p className="text-xs uppercase tracking-[0.2em] text-orange-400">
                                KisanX Intelligence
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                Detect → Predict → Protect
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                                Your farm data will power crop health
                                detection, risk forecasting, harvest
                                intelligence, and market decisions as
                                these modules become available.

                            </p>

                        </div>


                        <Link
                            href="/dashboard/scan"
                            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
                        >
                            Start Crop Scan →
                        </Link>

                    </div>

                </section>

            </div>

        </main>
    );
}