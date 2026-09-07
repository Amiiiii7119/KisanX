"use client";

import {
    ChangeEvent,
    KeyboardEvent,
    useEffect,
    useState,
} from "react";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================

type Farm = {
    id: string;
    name: string;
    village?: string | null;
    district?: string | null;
};

type Plot = {
    id: string;
    name: string;
    farm_id: string;
};

type Prediction = {
    disease: string;
    confidence: number;
    class_probabilities?: Record<string, number>;
    severity?: number | null;
};

type AdvisoryEvidence = {
    title?: string;
    source_name?: string;
    source_url?: string | null;
    similarity?: number;
    content?: string;
};

type Advisory = {
    answer: string;
    confidence?: string;
    evidence_sufficient?: boolean;
    needs_more_information?: boolean;
    follow_up_question?: string | null;
    sources?: number[];
    retrieved_documents?: number;
    evidence?: AdvisoryEvidence[];
};

type ScanRecord = {
    id: string;
    image_url?: string | null;
    farm_id?: string | null;
    plot_id?: string | null;
    crop_cycle_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    created_at?: string | null;
};

type ScanResponse = {
    success: boolean;
    scan_id: string;
    scan: ScanRecord;
    prediction: Prediction;
    advisory: Advisory;
};

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

// ============================================================
// API
// ============================================================

const API_URL =
    process.env.NEXT_PUBLIC_KISANX_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000";

// ============================================================
// COMPONENT
// ============================================================

export default function CropScanPage() {
    const supabase = createClient();

    // ----------------------------------------------------------
    // FARM / PLOT
    // ----------------------------------------------------------

    const [farms, setFarms] = useState<Farm[]>([]);
    const [plots, setPlots] = useState<Plot[]>([]);

    const [selectedFarm, setSelectedFarm] = useState("");
    const [selectedPlot, setSelectedPlot] = useState("");

    // ----------------------------------------------------------
    // IMAGE
    // ----------------------------------------------------------

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [previewUrl, setPreviewUrl] =
        useState("");

    // ----------------------------------------------------------
    // LOCATION
    // ----------------------------------------------------------

    const [latitude, setLatitude] =
        useState<number | null>(null);

    const [longitude, setLongitude] =
        useState<number | null>(null);

    const [locationLoading, setLocationLoading] =
        useState(false);

    // ----------------------------------------------------------
    // LANGUAGE
    // ----------------------------------------------------------

    const [language, setLanguage] =
        useState("en");

    // ----------------------------------------------------------
    // SCAN
    // ----------------------------------------------------------

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    const [scanResult, setScanResult] =
        useState<ScanResponse | null>(null);

    // ----------------------------------------------------------
    // CHAT
    // ----------------------------------------------------------

    const [chatMessages, setChatMessages] =
        useState<ChatMessage[]>([]);

    const [chatInput, setChatInput] =
        useState("");

    const [chatLoading, setChatLoading] =
        useState(false);

    const [chatError, setChatError] =
        useState("");

    // ==========================================================
    // LOAD FARMS
    // ==========================================================

    useEffect(() => {
        let mounted = true;

        async function loadFarms() {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user || !mounted) {
                    return;
                }

                const {
                    data,
                    error: farmError,
                } = await supabase
                    .from("farms")
                    .select(
                        "id, name, village, district"
                    )
                    .eq("owner_id", user.id)
                    .order("created_at", {
                        ascending: false,
                    });

                if (farmError) {
                    console.error(
                        "FARM LOAD ERROR:",
                        farmError
                    );

                    if (mounted) {
                        setError(
                            "Could not load your farms."
                        );
                    }

                    return;
                }

                if (mounted) {
                    setFarms(data || []);
                }
            } catch (err) {
                console.error(
                    "LOAD FARMS ERROR:",
                    err
                );

                if (mounted) {
                    setError(
                        "Could not load your farms."
                    );
                }
            }
        }

        loadFarms();

        return () => {
            mounted = false;
        };
    }, []);

    // ==========================================================
    // LOAD PLOTS
    // ==========================================================

    useEffect(() => {
        let mounted = true;

        async function loadPlots() {
            if (!selectedFarm) {
                setPlots([]);
                setSelectedPlot("");
                return;
            }

            try {
                const {
                    data,
                    error: plotError,
                } = await supabase
                    .from("plots")
                    .select(
                        "id, name, farm_id"
                    )
                    .eq(
                        "farm_id",
                        selectedFarm
                    )
                    .order("name", {
                        ascending: true,
                    });

                if (plotError) {
                    console.error(
                        "PLOT LOAD ERROR:",
                        plotError
                    );

                    if (mounted) {
                        setError(
                            "Could not load plots."
                        );
                    }

                    return;
                }

                if (mounted) {
                    setPlots(data || []);

                    if (
                        data &&
                        data.length === 1
                    ) {
                        setSelectedPlot(
                            data[0].id
                        );
                    }
                }
            } catch (err) {
                console.error(
                    "LOAD PLOTS ERROR:",
                    err
                );

                if (mounted) {
                    setError(
                        "Could not load plots."
                    );
                }
            }
        }

        loadPlots();

        return () => {
            mounted = false;
        };
    }, [selectedFarm]);

    // ==========================================================
    // PREVIEW CLEANUP
    // ==========================================================

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(
                    previewUrl
                );
            }
        };
    }, [previewUrl]);

    // ==========================================================
    // FILE CHANGE
    // ==========================================================

    function handleFileChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (
            !allowedTypes.includes(
                file.type.toLowerCase()
            )
        ) {
            setError(
                "Please select a JPG, PNG or WebP image."
            );

            event.target.value = "";
            return;
        }

        if (
            file.size >
            10 * 1024 * 1024
        ) {
            setError(
                "Image must be smaller than 10 MB."
            );

            event.target.value = "";
            return;
        }

        if (previewUrl) {
            URL.revokeObjectURL(
                previewUrl
            );
        }

        const url =
            URL.createObjectURL(file);

        setSelectedFile(file);
        setPreviewUrl(url);

        setError("");
        setMessage("");
        setScanResult(null);

        setChatMessages([]);
        setChatInput("");
        setChatError("");
    }

    // ==========================================================
    // REMOVE IMAGE
    // ==========================================================

    function removeImage() {
        if (previewUrl) {
            URL.revokeObjectURL(
                previewUrl
            );
        }

        setSelectedFile(null);
        setPreviewUrl("");

        setScanResult(null);

        setMessage("");
        setError("");

        setChatMessages([]);
        setChatInput("");
        setChatError("");
    }

    // ==========================================================
    // LOCATION
    // ==========================================================

    function getLocation() {
        setError("");
        setLocationLoading(true);

        if (!navigator.geolocation) {
            setLocationLoading(false);

            setError(
                "Location is not supported by this browser."
            );

            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(
                    position.coords.latitude
                );

                setLongitude(
                    position.coords.longitude
                );

                setLocationLoading(false);
            },

            () => {
                setLocationLoading(false);

                setError(
                    "Could not get your location. Please allow location access."
                );
            },

            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }

    // ==========================================================
    // SUBMIT SCAN
    // ==========================================================

    async function submitScan() {
        setError("");
        setMessage("");
        setScanResult(null);

        setChatMessages([]);
        setChatError("");

        if (!selectedFile) {
            setError(
                "Please select a sugarcane leaf image first."
            );

            return;
        }

        if (!selectedFarm) {
            setError(
                "Please select your farm."
            );

            return;
        }

        if (!selectedPlot) {
            setError(
                "Please select your plot."
            );

            return;
        }

        setLoading(true);

        try {
            // ==================================================
            // GET LOGGED-IN USER SESSION
            // ==================================================

            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
                throw new Error(
                    sessionError.message
                );
            }

            if (!session) {
                throw new Error(
                    "Your session has expired. Please sign in again."
                );
            }

            // ==================================================
            // FORM DATA
            // ==================================================

            const formData =
                new FormData();

            // Backend expects "file"
            formData.append(
                "file",
                selectedFile
            );

            formData.append(
                "farm_id",
                selectedFarm
            );

            formData.append(
                "plot_id",
                selectedPlot
            );

            formData.append(
                "language",
                language
            );

            if (
                latitude !== null
            ) {
                formData.append(
                    "latitude",
                    latitude.toString()
                );
            }

            if (
                longitude !== null
            ) {
                formData.append(
                    "longitude",
                    longitude.toString()
                );
            }

            // ==================================================
            // CALL FASTAPI
            // ==================================================

            const response =
                await fetch(
                    `${API_URL}/api/scans/create`,
                    {
                        method: "POST",

                        headers: {
                            Authorization:
                                `Bearer ${session.access_token}`,
                        },

                        body: formData,
                    }
                );

            // ==================================================
            // READ RESPONSE
            // ==================================================

            let data: any = null;

            try {
                data =
                    await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.detail ||
                    data?.message ||
                    "Crop scan failed."
                );
            }

            setScanResult(
                data as ScanResponse
            );

            setMessage(
                "Crop scan completed successfully."
            );
        } catch (err) {
            console.error(
                "SCAN ERROR:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while analyzing the crop."
            );
        } finally {
            setLoading(false);
        }
    }

    // ==========================================================
    // CHAT
    // ==========================================================

    async function askAssistant(
        questionOverride?: string
    ) {
        const question =
            (
                questionOverride ??
                chatInput
            ).trim();

        if (!question) {
            return;
        }

        if (!scanResult) {
            setChatError(
                "Complete a crop scan before asking follow-up questions."
            );

            return;
        }

        if (chatLoading) {
            return;
        }

        setChatError("");
        setChatInput("");

        const userMessage: ChatMessage = {
            role: "user",
            content: question,
        };

        const previousMessages =
            [...chatMessages];

        setChatMessages([
            ...previousMessages,
            userMessage,
        ]);

        setChatLoading(true);

        try {
            // ==================================================
            // GET SESSION
            // ==================================================

            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
                throw new Error(
                    sessionError.message
                );
            }

            if (!session) {
                throw new Error(
                    "Your session has expired. Please sign in again."
                );
            }

            // ==================================================
            // CALL ASSISTANT
            // ==================================================

            const response =
                await fetch(
                    `${API_URL}/api/assistant/chat`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${session.access_token}`,
                        },

                        body: JSON.stringify({
                            question,

                            crop: "Sugarcane",

                            disease:
                                scanResult
                                    .prediction
                                    .disease,

                            classifier_confidence:
                                scanResult
                                    .prediction
                                    .confidence,

                            language,

                            // ----------------------------------
                            // STEP 2:
                            // Use the actual scan context returned
                            // by the backend.
                            // ----------------------------------

                            farm_id:
                                scanResult.scan.farm_id ??
                                selectedFarm,

                            plot_id:
                                scanResult.scan.plot_id ??
                                selectedPlot,

                            crop_cycle_id:
                                scanResult.scan.crop_cycle_id ??
                                undefined,

                            scan_id:
                                scanResult.scan_id,

                            // ----------------------------------
                            // IMPORTANT:
                            // Do NOT send fake text such as:
                            // "Farm ID: ...; Plot ID: ..."
                            //
                            // Backend Farm Memory now loads the
                            // real structured context.
                            // ----------------------------------

                            history:
                                previousMessages,
                        }),
                    }
                );

            // ==================================================
            // RESPONSE
            // ==================================================

            let data: any = null;

            try {
                data =
                    await response.json();
            } catch {
                throw new Error(
                    "The assistant returned an invalid response."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.detail ||
                    "Crop Assistant failed."
                );
            }

            // ==================================================
            // HANDLE CURRENT BACKEND RESPONSE
            // ==================================================

            const answer =
                data?.answer?.answer ??
                data?.answer ??
                data?.response;

            if (
                !answer ||
                typeof answer !== "string"
            ) {
                throw new Error(
                    "The assistant returned no answer."
                );
            }

            const assistantMessage:
                ChatMessage = {
                role: "assistant",
                content: answer,
            };

            setChatMessages(
                (current) => [
                    ...current,
                    assistantMessage,
                ]
            );
        } catch (err) {
            setChatMessages(
                (current) => {
                    const copy =
                        [...current];

                    const lastIndex =
                        copy.length - 1;

                    if (
                        copy[lastIndex]?.role ===
                        "user"
                    ) {
                        copy.splice(
                            lastIndex,
                            1
                        );
                    }

                    return copy;
                }
            );

            setChatInput(question);

            setChatError(
                err instanceof Error
                    ? err.message
                    : "Could not get an answer."
            );
        } finally {
            setChatLoading(false);
        }
    }

    // ==========================================================
    // CHAT ENTER KEY
    // ==========================================================

    function handleChatKeyDown(
        event: KeyboardEvent<HTMLTextAreaElement>
    ) {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            askAssistant();
        }
    }

    // ==========================================================
    // HELPERS
    // ==========================================================

    function formatDiseaseName(
        disease: string
    ) {
        if (!disease) {
            return "Unknown";
        }

        return disease
            .replaceAll("_", " ")
            .replaceAll("-", " ");
    }

    function getConfidenceText(
        confidence: number
    ) {
        if (confidence >= 0.9) {
            return "High";
        }

        if (confidence >= 0.7) {
            return "Moderate";
        }

        return "Low";
    }

    function formatAdvisoryConfidence(
        confidence?: string
    ) {
        if (!confidence) {
            return "Not available";
        }

        return (
            confidence.charAt(0).toUpperCase() +
            confidence.slice(1)
        );
    }

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
        <main className="min-h-screen bg-[#07100b] text-white">

            <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">

                {/* HEADER */}

                <div className="mb-8 flex items-center justify-between">

                    <div>

                        <Link
                            href="/dashboard"
                            className="mb-3 inline-block text-sm text-white/50 transition hover:text-white"
                        >
                            ← Back to Dashboard
                        </Link>

                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            Scan Your Crop
                        </h1>

                        <p className="mt-2 max-w-2xl text-white/55">
                            Take a clear photo of a sugarcane
                            leaf and let KisanX analyze its
                            health.
                        </p>

                    </div>

                    <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right sm:block">

                        <p className="text-xs uppercase tracking-[0.2em] text-orange-400">
                            KisanX AI
                        </p>

                        <p className="mt-1 text-sm text-white/60">
                            Sugarcane Health
                        </p>

                    </div>

                </div>

                {/* MAIN GRID */}

                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">

                    {/* LEFT */}

                    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-7">

                        <div className="mb-6">

                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-400">
                                Step 01
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                Add a leaf photo
                            </h2>

                        </div>

                        {/* IMAGE */}

                        <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/15 bg-black/20">

                            {previewUrl ? (

                                <div className="relative">

                                    <img
                                        src={previewUrl}
                                        alt="Selected sugarcane leaf"
                                        className="h-[360px] w-full object-cover"
                                    />

                                    {loading && (

                                        <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">

                                            <div className="text-center">

                                                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-orange-400" />

                                                <p className="font-medium">
                                                    Analyzing your crop...
                                                </p>

                                                <p className="mt-1 text-sm text-white/50">
                                                    KisanX is checking the leaf
                                                    and preparing your advisory.
                                                </p>

                                            </div>

                                        </div>

                                    )}

                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        disabled={loading}
                                        className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-sm backdrop-blur transition hover:bg-black disabled:opacity-50"
                                    >
                                        Remove
                                    </button>

                                </div>

                            ) : (

                                <label className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center px-6 text-center">

                                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl">
                                        🌿
                                    </div>

                                    <p className="text-lg font-medium">
                                        Upload a sugarcane leaf
                                    </p>

                                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
                                        Use a clear photo with the
                                        leaf visible and well lit.
                                    </p>

                                    <span className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400">
                                        Take / Choose Image
                                    </span>

                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />

                                </label>

                            )}

                        </div>

                        <p className="mt-3 text-xs text-white/35">
                            JPG, PNG or WebP • Maximum 10 MB
                        </p>

                        {/* LOCATION */}

                        <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                <div>

                                    <p className="font-medium">
                                        Field location
                                    </p>

                                    <p className="mt-1 text-sm text-white/45">
                                        Helps KisanX associate the
                                        scan with your field.
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    onClick={getLocation}
                                    disabled={
                                        locationLoading ||
                                        loading
                                    }
                                    className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
                                >
                                    {locationLoading
                                        ? "Getting location..."
                                        : latitude !== null
                                            ? "✓ Location Added"
                                            : "Use My Location"}
                                </button>

                            </div>

                            {latitude !== null &&
                                longitude !== null && (

                                    <p className="mt-3 text-xs text-white/35">
                                        GPS:{" "}
                                        {latitude.toFixed(6)}
                                        ,{" "}
                                        {longitude.toFixed(6)}
                                    </p>

                                )}

                        </div>

                    </section>

                    {/* RIGHT */}

                    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-7">

                        <div className="mb-6">

                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-400">
                                Step 02
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                Tell us where this photo came from
                            </h2>

                        </div>

                        {/* FARM */}

                        <label className="block">

                            <span className="mb-2 block text-sm text-white/70">
                                Farm
                            </span>

                            <select
                                value={selectedFarm}
                                onChange={(event) => {

                                    setSelectedFarm(
                                        event.target.value
                                    );

                                    setSelectedPlot("");

                                    setScanResult(null);
                                    setMessage("");
                                    setError("");
                                    setChatMessages([]);
                                    setChatInput("");
                                    setChatError("");

                                }}
                                disabled={loading}
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60 disabled:opacity-50"
                            >

                                <option
                                    value=""
                                    className="bg-[#07100b]"
                                >
                                    Select your farm
                                </option>

                                {farms.map(
                                    (farm) => (

                                        <option
                                            key={farm.id}
                                            value={farm.id}
                                            className="bg-[#07100b]"
                                        >
                                            {farm.name}
                                            {farm.village
                                                ? ` — ${farm.village}`
                                                : ""}
                                        </option>

                                    )
                                )}

                            </select>

                        </label>

                        {/* PLOT */}

                        <label className="mt-5 block">

                            <span className="mb-2 block text-sm text-white/70">
                                Plot
                            </span>

                            <select
                                value={selectedPlot}
                                onChange={(event) =>
                                    setSelectedPlot(
                                        event.target.value
                                    )
                                }
                                disabled={
                                    !selectedFarm ||
                                    loading
                                }
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60 disabled:opacity-40"
                            >

                                <option
                                    value=""
                                    className="bg-[#07100b]"
                                >
                                    {selectedFarm
                                        ? "Select your plot"
                                        : "Select a farm first"}
                                </option>

                                {plots.map(
                                    (plot) => (

                                        <option
                                            key={plot.id}
                                            value={plot.id}
                                            className="bg-[#07100b]"
                                        >
                                            {plot.name}
                                        </option>

                                    )
                                )}

                            </select>

                        </label>

                        {/* LANGUAGE */}

                        <label className="mt-5 block">

                            <span className="mb-2 block text-sm text-white/70">
                                Advisory & chat language
                            </span>

                            <select
                                value={language}
                                onChange={(event) =>
                                    setLanguage(
                                        event.target.value
                                    )
                                }
                                disabled={loading}
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60 disabled:opacity-50"
                            >

                                <option
                                    value="en"
                                    className="bg-[#07100b]"
                                >
                                    English
                                </option>

                                <option
                                    value="hi"
                                    className="bg-[#07100b]"
                                >
                                    हिंदी
                                </option>

                                <option
                                    value="mr"
                                    className="bg-[#07100b]"
                                >
                                    मराठी
                                </option>

                            </select>

                        </label>

                        {/* CHECKLIST */}

                        <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">

                            <p className="text-sm font-medium">
                                For a better result
                            </p>

                            <div className="mt-4 space-y-3">

                                {[
                                    "Use a clear leaf photo",
                                    "Avoid very dark or blurry images",
                                    "Show the affected part of the leaf",
                                    "Use natural light when possible",
                                ].map(
                                    (item) => (

                                        <div
                                            key={item}
                                            className="flex items-start gap-3 text-sm text-white/55"
                                        >

                                            <span className="mt-0.5 text-orange-400">
                                                ✓
                                            </span>

                                            <span>
                                                {item}
                                            </span>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>

                        {/* STATUS */}

                        {message && (

                            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
                                {message}
                            </div>

                        )}

                        {error && (

                            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                                {error}
                            </div>

                        )}

                        {/* RESULT */}

                        {scanResult && (

                            <div className="mt-5 space-y-4">

                                {/* DISEASE */}

                                <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-5">

                                    <p className="text-xs uppercase tracking-[0.2em] text-orange-300">
                                        AI Crop Analysis
                                    </p>

                                    <h3 className="mt-3 text-2xl font-semibold">
                                        {formatDiseaseName(
                                            scanResult.prediction.disease
                                        )}
                                    </h3>

                                    <p className="mt-2 text-sm text-white/45">
                                        The model detected a possible
                                        crop-health issue from this
                                        sugarcane leaf.
                                    </p>

                                    <div className="mt-5 grid grid-cols-2 gap-3">

                                        <div className="rounded-xl bg-black/20 p-3">

                                            <p className="text-xs text-white/40">
                                                Model confidence
                                            </p>

                                            <p className="mt-1 text-lg font-semibold">
                                                {(
                                                    scanResult
                                                        .prediction
                                                        .confidence *
                                                    100
                                                ).toFixed(1)}
                                                %
                                            </p>

                                            <p className="mt-1 text-xs text-white/40">
                                                {getConfidenceText(
                                                    scanResult
                                                        .prediction
                                                        .confidence
                                                )}
                                            </p>

                                        </div>

                                        <div className="rounded-xl bg-black/20 p-3">

                                            <p className="text-xs text-white/40">
                                                Disease severity
                                            </p>

                                            <p className="mt-1 text-lg font-semibold">
                                                Not assessed yet
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-white/40">
                                                This scan does not use a
                                                validated severity score.
                                            </p>

                                        </div>

                                    </div>

                                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">

                                        <p className="text-xs leading-5 text-white/45">
                                            ⚠️ This is an AI-assisted
                                            prediction. It is not a
                                            confirmed laboratory diagnosis.
                                        </p>

                                    </div>

                                </div>

                                {/* ADVISORY */}

                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                                    <div className="flex items-start justify-between gap-4">

                                        <div>

                                            <p className="text-xs uppercase tracking-[0.2em] text-orange-400">
                                                KisanX Advisory
                                            </p>

                                            <h3 className="mt-2 text-lg font-semibold">
                                                What you should do
                                            </h3>

                                        </div>

                                        {scanResult.advisory
                                            .confidence && (

                                                <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/50">
                                                    Evidence{" "}
                                                    {formatAdvisoryConfidence(
                                                        scanResult
                                                            .advisory
                                                            .confidence
                                                    )}
                                                </span>

                                            )}

                                    </div>

                                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/70">
                                        {
                                            scanResult
                                                .advisory
                                                .answer
                                        }
                                    </p>

                                    {scanResult.advisory
                                        .follow_up_question && (

                                            <div className="mt-5 rounded-xl border border-orange-400/20 bg-orange-400/5 p-4">

                                                <p className="text-xs uppercase tracking-[0.15em] text-orange-300">
                                                    KisanX wants to know
                                                </p>

                                                <p className="mt-2 text-sm leading-6 text-white/65">
                                                    {
                                                        scanResult
                                                            .advisory
                                                            .follow_up_question
                                                    }
                                                </p>

                                            </div>

                                        )}

                                </div>

                                {/* EVIDENCE */}

                                {scanResult.advisory
                                    .evidence &&
                                    scanResult.advisory
                                        .evidence.length > 0 && (

                                        <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                                            <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.2em] text-white/40">
                                                Evidence used
                                            </summary>

                                            <div className="mt-4 space-y-3">

                                                {scanResult.advisory
                                                    .evidence
                                                    .map(
                                                        (
                                                            item,
                                                            index
                                                        ) => (

                                                            <div
                                                                key={`${item.title}-${index}`}
                                                                className="rounded-xl border border-white/10 bg-black/20 p-4"
                                                            >

                                                                <p className="font-medium">
                                                                    {item.title ||
                                                                        `Source ${index + 1}`}
                                                                </p>

                                                                {item.source_name && (

                                                                    <p className="mt-1 text-xs text-white/40">
                                                                        {
                                                                            item.source_name
                                                                        }
                                                                    </p>

                                                                )}

                                                                {item.source_url && (

                                                                    <a
                                                                        href={
                                                                            item.source_url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="mt-2 inline-block text-xs text-orange-400 hover:text-orange-300"
                                                                    >
                                                                        View source →
                                                                    </a>

                                                                )}

                                                            </div>

                                                        )
                                                    )}

                                            </div>

                                        </details>

                                    )}

                                {/* CHAT */}

                                <div className="rounded-2xl border border-orange-400/20 bg-[#0b1710] p-5">

                                    <div className="flex items-start justify-between gap-4">

                                        <div>

                                            <p className="text-xs uppercase tracking-[0.2em] text-orange-400">
                                                Crop Doctor
                                            </p>

                                            <h3 className="mt-2 text-xl font-semibold">
                                                Ask about this scan
                                            </h3>

                                            <p className="mt-2 text-sm leading-6 text-white/45">
                                                Ask follow-up questions about
                                                the detected crop issue. KisanX
                                                will retrieve agricultural
                                                evidence for each question.
                                            </p>

                                        </div>

                                        <div className="hidden rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/40 sm:block">
                                            RAG + Gemma
                                        </div>

                                    </div>

                                    {/* SUGGESTED QUESTIONS */}

                                    <div className="mt-5 flex flex-wrap gap-2">

                                        {[
                                            "What should I check today?",
                                            "How can I tell if it is getting worse?",
                                            "What action is supported by the evidence?",
                                        ].map(
                                            (question) => (

                                                <button
                                                    key={question}
                                                    type="button"
                                                    onClick={() =>
                                                        askAssistant(
                                                            question
                                                        )
                                                    }
                                                    disabled={
                                                        chatLoading
                                                    }
                                                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/55 transition hover:border-orange-400/30 hover:bg-orange-400/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {question}
                                                </button>

                                            )
                                        )}

                                    </div>

                                    {/* CHAT MESSAGES */}

                                    {chatMessages.length > 0 && (

                                        <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">

                                            {chatMessages.map(
                                                (
                                                    chatMessage,
                                                    index
                                                ) => (

                                                    <div
                                                        key={`${chatMessage.role}-${index}`}
                                                        className={
                                                            chatMessage.role ===
                                                                "user"
                                                                ? "flex justify-end"
                                                                : "flex justify-start"
                                                        }
                                                    >

                                                        <div
                                                            className={
                                                                chatMessage.role ===
                                                                    "user"
                                                                    ? "max-w-[88%] rounded-2xl rounded-br-md bg-orange-500 px-4 py-3 text-sm leading-6 text-black"
                                                                    : "max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/70"
                                                            }
                                                        >
                                                            {chatMessage.content}
                                                        </div>

                                                    </div>

                                                )
                                            )}

                                            {chatLoading && (

                                                <div className="flex justify-start">

                                                    <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-4 py-3">

                                                        <div className="flex items-center gap-2">

                                                            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />

                                                            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400 [animation-delay:150ms]" />

                                                            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400 [animation-delay:300ms]" />

                                                        </div>

                                                        <p className="mt-2 text-xs text-white/35">
                                                            Checking trusted evidence...
                                                        </p>

                                                    </div>

                                                </div>

                                            )}

                                        </div>

                                    )}

                                    {/* CHAT ERROR */}

                                    {chatError && (

                                        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                                            {chatError}
                                        </div>

                                    )}

                                    {/* CHAT INPUT */}

                                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-2">

                                        <textarea
                                            value={chatInput}
                                            onChange={(event) =>
                                                setChatInput(
                                                    event.target.value
                                                )
                                            }
                                            onKeyDown={
                                                handleChatKeyDown
                                            }
                                            disabled={
                                                chatLoading
                                            }
                                            placeholder={
                                                language === "hi"
                                                    ? "इस स्कैन के बारे में कुछ पूछें..."
                                                    : language === "mr"
                                                        ? "या स्कॅनबद्दल काही विचारा..."
                                                        : "Ask anything about this scan..."
                                            }
                                            rows={3}
                                            maxLength={2000}
                                            className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/25 disabled:opacity-50"
                                        />

                                        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-2 pt-2">

                                            <p className="text-[11px] text-white/25">
                                                Enter to send • Shift + Enter
                                                for a new line
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    askAssistant()
                                                }
                                                disabled={
                                                    chatLoading ||
                                                    !chatInput.trim()
                                                }
                                                className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {chatLoading
                                                    ? "Thinking..."
                                                    : "Ask →"}
                                            </button>

                                        </div>

                                    </div>

                                    <p className="mt-3 text-center text-[11px] leading-5 text-white/25">
                                        KisanX uses retrieved agricultural
                                        evidence for each question and
                                        avoids unsupported treatment claims.
                                    </p>

                                </div>

                            </div>

                        )}

                        {/* ANALYZE BUTTON */}

                        <button
                            type="button"
                            onClick={
                                scanResult
                                    ? () => {
                                        setScanResult(null);
                                        setMessage("");
                                        setError("");
                                        setChatMessages([]);
                                        setChatInput("");
                                        setChatError("");
                                    }
                                    : submitScan
                            }
                            disabled={
                                loading ||
                                (
                                    !scanResult &&
                                    (
                                        !selectedFile ||
                                        !selectedFarm ||
                                        !selectedPlot
                                    )
                                )
                            }
                            className="mt-7 w-full rounded-2xl bg-orange-500 px-5 py-4 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading
                                ? "Analyzing Crop..."
                                : scanResult
                                    ? "Start Another Scan →"
                                    : "Analyze Crop →"}
                        </button>

                        <p className="mt-4 text-center text-xs leading-5 text-white/30">
                            KisanX provides AI-assisted crop
                            health analysis. Final agricultural
                            decisions should be verified when
                            necessary.
                        </p>

                    </section>

                </div>

            </div>

        </main>
    );
}