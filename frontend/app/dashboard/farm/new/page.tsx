"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Language = "en" | "hi" | "mr";

type FormData = {
    farmName: string;
    village: string;
    district: string;
    farmArea: string;
    latitude: string;
    longitude: string;
    plotName: string;
    plotArea: string;
    variety: string;
    cropStage: string;
    plantingDate: string;
    soilType: string;
};

const initialForm: FormData = {
    farmName: "",
    village: "",
    district: "",
    farmArea: "",
    latitude: "",
    longitude: "",
    plotName: "",
    plotArea: "",
    variety: "",
    cropStage: "",
    plantingDate: "",
    soilType: "",
};

const translations = {
    en: {
        language: "English",
        title: "Register Your Farm",
        subtitle:
            "Tell us a little about your field. This helps KisanX understand your crop and give you better advice.",
        farm: "Your Farm",
        farmDescription: "Basic information about your farm.",
        farmName: "What would you like to call your farm?",
        farmNamePlaceholder: "Example: My Sugarcane Farm",
        village: "Village",
        villagePlaceholder: "Enter your village",
        district: "District",
        districtPlaceholder: "Enter your district",
        area: "How big is your field?",
        areaPlaceholder: "Example: 5",
        location: "Where is your field?",
        locationDescription:
            "Use your phone's GPS to automatically find your field location.",
        locationButton: "Use My Location",
        gettingLocation: "Getting Location...",
        latitude: "Latitude",
        longitude: "Longitude",
        plot: "Your Field Section",
        plotDescription:
            "If your farm has different sections, you can name this one.",
        plotName: "What should we call this field section?",
        plotNamePlaceholder: "Example: Main Field",
        plotArea: "How big is this field section?",
        sugarcane: "Your Sugarcane",
        sugarcaneDescription: "A few simple details about your sugarcane.",
        variety: "Which type of sugarcane are you growing?",
        varietyHint:
            "If you don't know the variety, simply choose 'I don't know'.",
        stage: "How is your sugarcane growing right now?",
        stageHint:
            "Choose the option that looks closest to your crop.",
        planting: "When did you plant this sugarcane?",
        soil: "What kind of soil is in your field?",
        soilHint:
            "If you're not sure, choose 'I don't know'.",
        create: "Create My Farm",
        creating: "Creating Your Farm...",
        success: "Your farm has been registered successfully!",
        back: "Back to Dashboard",
        required: "Please fill in all required fields.",
        locationError:
            "We could not get your location. Please allow location access and try again.",
        sessionError: "Your login session has expired. Please sign in again.",
        networkError:
            "Unable to connect to KisanX. Please make sure the KisanX server is running.",
        unknownError: "Something went wrong. Please try again.",
        varieties: {
            co86032: "Co 86032",
            com0265: "CoM 0265",
            co0238: "Co 0238",
            coc671: "CoC 671",
            other: "Other",
            unknown: "I don't know",
        },
        stages: {
            planted: "Just planted",
            small: "Small / still growing",
            growing: "Growing well",
            almost: "Almost ready",
            ready: "Ready for harvest",
            unknown: "I'm not sure",
        },
        soils: {
            black: "Black soil",
            red: "Red soil",
            alluvial: "Alluvial soil",
            laterite: "Laterite soil",
            other: "Other",
            unknown: "I don't know",
        },
    },

    hi: {
        language: "हिंदी",
        title: "अपना खेत दर्ज करें",
        subtitle:
            "अपने खेत के बारे में थोड़ी जानकारी दें। इससे KisanX आपकी फसल को बेहतर समझकर सही सलाह देने में मदद करेगा।",
        farm: "आपका खेत",
        farmDescription: "आपके खेत की सामान्य जानकारी।",
        farmName: "आप अपने खेत का क्या नाम रखना चाहते हैं?",
        farmNamePlaceholder: "उदाहरण: मेरा गन्ने का खेत",
        village: "गाँव",
        villagePlaceholder: "अपने गाँव का नाम लिखें",
        district: "जिला",
        districtPlaceholder: "अपने जिले का नाम लिखें",
        area: "आपका खेत कितना बड़ा है?",
        areaPlaceholder: "उदाहरण: 5",
        location: "आपका खेत कहाँ है?",
        locationDescription:
            "अपने खेत की सही जगह पता करने के लिए फोन का GPS इस्तेमाल करें।",
        locationButton: "मेरी लोकेशन लें",
        gettingLocation: "लोकेशन मिल रही है...",
        latitude: "अक्षांश",
        longitude: "देशांतर",
        plot: "खेत का हिस्सा",
        plotDescription:
            "अगर आपके खेत के अलग-अलग हिस्से हैं, तो इस हिस्से का नाम रख सकते हैं।",
        plotName: "इस खेत के हिस्से का क्या नाम रखें?",
        plotNamePlaceholder: "उदाहरण: मुख्य खेत",
        plotArea: "यह खेत का हिस्सा कितना बड़ा है?",
        sugarcane: "आपकी गन्ने की फसल",
        sugarcaneDescription: "आपकी गन्ने की फसल के बारे में कुछ आसान जानकारी।",
        variety: "आप कौन-सी गन्ने की किस्म उगा रहे हैं?",
        varietyHint:
            "अगर आपको किस्म का नाम नहीं पता है, तो 'मुझे नहीं पता' चुनें।",
        stage: "अभी आपकी गन्ने की फसल कैसी बढ़ रही है?",
        stageHint: "जो आपकी फसल के सबसे करीब लगे, वह विकल्प चुनें।",
        planting: "आपने यह गन्ना कब लगाया था?",
        soil: "आपके खेत की मिट्टी कैसी है?",
        soilHint: "अगर आपको पता नहीं है, तो 'मुझे नहीं पता' चुनें।",
        create: "मेरा खेत दर्ज करें",
        creating: "खेत दर्ज हो रहा है...",
        success: "आपका खेत सफलतापूर्वक दर्ज हो गया!",
        back: "डैशबोर्ड पर वापस जाएँ",
        required: "कृपया सभी जरूरी जानकारी भरें।",
        locationError:
            "लोकेशन नहीं मिल सकी। कृपया लोकेशन की अनुमति दें और फिर कोशिश करें।",
        sessionError:
            "आपका लॉगिन समाप्त हो गया है। कृपया दोबारा लॉगिन करें।",
        networkError:
            "KisanX से कनेक्ट नहीं हो पा रहा है। कृपया जांचें कि KisanX सर्वर चल रहा है।",
        unknownError: "कुछ गलत हुआ। कृपया फिर कोशिश करें।",
        varieties: {
            co86032: "Co 86032",
            com0265: "CoM 0265",
            co0238: "Co 0238",
            coc671: "CoC 671",
            other: "अन्य",
            unknown: "मुझे नहीं पता",
        },
        stages: {
            planted: "अभी लगाया है",
            small: "छोटा / अभी बढ़ रहा है",
            growing: "अच्छी तरह बढ़ रहा है",
            almost: "लगभग तैयार",
            ready: "कटाई के लिए तैयार",
            unknown: "मुझे पता नहीं",
        },
        soils: {
            black: "काली मिट्टी",
            red: "लाल मिट्टी",
            alluvial: "जलोढ़ मिट्टी",
            laterite: "लेटराइट मिट्टी",
            other: "अन्य",
            unknown: "मुझे नहीं पता",
        },
    },

    mr: {
        language: "मराठी",
        title: "तुमचे शेत नोंदवा",
        subtitle:
            "तुमच्या शेताबद्दल थोडी माहिती द्या. यामुळे KisanX तुमचे पीक चांगल्या प्रकारे समजून योग्य सल्ला देण्यास मदत करेल.",
        farm: "तुमचे शेत",
        farmDescription: "तुमच्या शेताची प्राथमिक माहिती.",
        farmName: "तुमच्या शेताला कोणते नाव द्यायचे?",
        farmNamePlaceholder: "उदाहरण: माझे ऊसाचे शेत",
        village: "गाव",
        villagePlaceholder: "तुमच्या गावाचे नाव लिहा",
        district: "जिल्हा",
        districtPlaceholder: "तुमच्या जिल्ह्याचे नाव लिहा",
        area: "तुमचे शेत किती मोठे आहे?",
        areaPlaceholder: "उदाहरण: 5",
        location: "तुमचे शेत कुठे आहे?",
        locationDescription:
            "तुमच्या शेताचे अचूक ठिकाण शोधण्यासाठी फोनचा GPS वापरा.",
        locationButton: "माझे स्थान घ्या",
        gettingLocation: "स्थान शोधत आहे...",
        latitude: "अक्षांश",
        longitude: "रेखांश",
        plot: "शेताचा भाग",
        plotDescription:
            "तुमच्या शेताचे वेगवेगळे भाग असल्यास या भागाला नाव देऊ शकता.",
        plotName: "या शेताच्या भागाला कोणते नाव द्यायचे?",
        plotNamePlaceholder: "उदाहरण: मुख्य शेत",
        plotArea: "हा शेताचा भाग किती मोठा आहे?",
        sugarcane: "तुमचे ऊसाचे पीक",
        sugarcaneDescription: "तुमच्या ऊस पिकाबद्दल काही सोपी माहिती.",
        variety: "तुम्ही कोणत्या ऊसाची जात लावली आहे?",
        varietyHint:
            "जात माहित नसेल तर 'मला माहित नाही' हा पर्याय निवडा.",
        stage: "सध्या तुमचे ऊसाचे पीक कसे वाढत आहे?",
        stageHint: "तुमच्या पिकाला सर्वात जवळचा पर्याय निवडा.",
        planting: "तुम्ही हा ऊस कधी लावला?",
        soil: "तुमच्या शेतातील माती कोणत्या प्रकारची आहे?",
        soilHint: "माहित नसेल तर 'मला माहित नाही' निवडा.",
        create: "माझे शेत नोंदवा",
        creating: "शेत नोंदवत आहे...",
        success: "तुमचे शेत यशस्वीरित्या नोंदवले गेले!",
        back: "डॅशबोर्डवर परत जा",
        required: "कृपया सर्व आवश्यक माहिती भरा.",
        locationError:
            "तुमचे स्थान मिळू शकले नाही. कृपया स्थानाची परवानगी द्या आणि पुन्हा प्रयत्न करा.",
        sessionError:
            "तुमचे लॉगिन सत्र संपले आहे. कृपया पुन्हा लॉगिन करा.",
        networkError:
            "KisanX शी कनेक्ट होता आले नाही. KisanX सर्व्हर सुरू आहे का ते तपासा.",
        unknownError: "काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.",
        varieties: {
            co86032: "Co 86032",
            com0265: "CoM 0265",
            co0238: "Co 0238",
            coc671: "CoC 671",
            other: "इतर",
            unknown: "मला माहित नाही",
        },
        stages: {
            planted: "नुकतेच लावले",
            small: "लहान / अजून वाढत आहे",
            growing: "चांगले वाढत आहे",
            almost: "कापणीसाठी जवळजवळ तयार",
            ready: "कापणीसाठी तयार",
            unknown: "मला माहित नाही",
        },
        soils: {
            black: "काळी माती",
            red: "लाल माती",
            alluvial: "गाळाची माती",
            laterite: "जांभी माती",
            other: "इतर",
            unknown: "मला माहित नाही",
        },
    },
} as const;

export default function NewFarmPage() {
    const router = useRouter();
    const supabase = createClient();

    const [language, setLanguage] = useState<Language>("en");
    const [form, setForm] = useState<FormData>(initialForm);
    const [locationLoading, setLocationLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const t = translations[language];

    const updateField = (field: keyof FormData, value: string) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const getLocation = () => {
        setError("");
        setLocationLoading(true);

        if (!navigator.geolocation) {
            setError(t.locationError);
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm((current) => ({
                    ...current,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                }));

                setLocationLoading(false);
            },
            () => {
                setError(t.locationError);
                setLocationLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            },
        );
    };

    const submitFarm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setError("");
        setSuccess(false);

        if (
            !form.farmName.trim() ||
            !form.farmArea ||
            !form.plotName.trim() ||
            !form.plotArea
        ) {
            setError(t.required);
            return;
        }

        setSubmitting(true);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error(t.sessionError);
            }

            const payload = {
                farm: {
                    name: form.farmName.trim(),
                    village: form.village.trim() || null,
                    district: form.district.trim() || null,
                    latitude: form.latitude ? Number(form.latitude) : null,
                    longitude: form.longitude ? Number(form.longitude) : null,
                    area_acres: Number(form.farmArea),
                },
                plot: {
                    name: form.plotName.trim(),
                    area_acres: Number(form.plotArea),
                    latitude: form.latitude ? Number(form.latitude) : null,
                    longitude: form.longitude ? Number(form.longitude) : null,
                    boundary: null,
                },
                crop_cycle: {
                    crop_name: "Sugarcane",
                    variety: form.variety || null,
                    crop_stage: form.cropStage || null,
                    planting_date: form.plantingDate || null,
                    soil_type: form.soilType || null,
                },
            };

            const response = await fetch(
                "http://127.0.0.1:8000/api/farms/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(payload),
                },
            );

            let result: {
                detail?: string;
                message?: string;
            } = {};

            try {
                result = await response.json();
            } catch {
                result = {};
            }

            if (!response.ok) {
                throw new Error(
                    result.detail ||
                    result.message ||
                    t.networkError,
                );
            }

            setSuccess(true);
            setForm(initialForm);
        } catch (submitError) {
            const message =
                submitError instanceof Error
                    ? submitError.message
                    : t.unknownError;

            setError(
                message.includes("Failed to fetch")
                    ? t.networkError
                    : message,
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <main className="min-h-screen bg-[#050806] px-4 py-8 text-white sm:px-6">
                <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
                    <div className="w-full rounded-3xl border border-green-400/20 bg-[#0a100c] p-8 text-center sm:p-12">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-400/10 text-3xl">
                            ✓
                        </div>

                        <h1 className="mt-6 text-3xl font-semibold">
                            {t.success}
                        </h1>

                        <button
                            type="button"
                            onClick={() => router.push("/dashboard")}
                            className="mt-8 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            {t.back}
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main
            className="min-h-screen bg-[#050806] px-4 py-8 text-white sm:px-6 lg:px-8"
            lang={language === "hi" ? "hi" : language === "mr" ? "mr" : "en"}
        >
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-400">
                            KisanX
                        </p>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t.title}
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
                            {t.subtitle}
                        </p>
                    </div>

                    <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                        {(["en", "hi", "mr"] as Language[]).map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setLanguage(item)}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${language === item
                                        ? "bg-orange-500 text-black"
                                        : "text-white/50 hover:text-white"
                                    }`}
                            >
                                {translations[item].language}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={submitFarm} className="space-y-6">
                    <Section
                        number="01"
                        title={t.farm}
                        description={t.farmDescription}
                    >
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field
                                label={t.farmName}
                                placeholder={t.farmNamePlaceholder}
                                value={form.farmName}
                                onChange={(value) =>
                                    updateField("farmName", value)
                                }
                                required
                            />

                            <Field
                                label={t.area}
                                placeholder={t.areaPlaceholder}
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.farmArea}
                                onChange={(value) =>
                                    updateField("farmArea", value)
                                }
                                required
                            />

                            <Field
                                label={t.village}
                                placeholder={t.villagePlaceholder}
                                value={form.village}
                                onChange={(value) =>
                                    updateField("village", value)
                                }
                            />

                            <Field
                                label={t.district}
                                placeholder={t.districtPlaceholder}
                                value={form.district}
                                onChange={(value) =>
                                    updateField("district", value)
                                }
                            />
                        </div>
                    </Section>

                    <Section
                        number="02"
                        title={t.location}
                        description={t.locationDescription}
                    >
                        <button
                            type="button"
                            onClick={getLocation}
                            disabled={locationLoading}
                            className="rounded-xl border border-orange-400/30 bg-orange-400/10 px-5 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {locationLoading
                                ? t.gettingLocation
                                : `📍 ${t.locationButton}`}
                        </button>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <Field
                                label={t.latitude}
                                value={form.latitude}
                                onChange={(value) =>
                                    updateField("latitude", value)
                                }
                                placeholder="GPS"
                            />

                            <Field
                                label={t.longitude}
                                value={form.longitude}
                                onChange={(value) =>
                                    updateField("longitude", value)
                                }
                                placeholder="GPS"
                            />
                        </div>
                    </Section>

                    <Section
                        number="03"
                        title={t.plot}
                        description={t.plotDescription}
                    >
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field
                                label={t.plotName}
                                placeholder={t.plotNamePlaceholder}
                                value={form.plotName}
                                onChange={(value) =>
                                    updateField("plotName", value)
                                }
                                required
                            />

                            <Field
                                label={t.plotArea}
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.plotArea}
                                onChange={(value) =>
                                    updateField("plotArea", value)
                                }
                                placeholder="Example: 2.5"
                                required
                            />
                        </div>
                    </Section>

                    <Section
                        number="04"
                        title={t.sugarcane}
                        description={t.sugarcaneDescription}
                    >
                        <div className="space-y-7">
                            <SelectField
                                label={t.variety}
                                hint={t.varietyHint}
                                value={form.variety}
                                onChange={(value) =>
                                    updateField("variety", value)
                                }
                                options={[
                                    ["Co 86032", t.varieties.co86032],
                                    ["CoM 0265", t.varieties.com0265],
                                    ["Co 0238", t.varieties.co0238],
                                    ["CoC 671", t.varieties.coc671],
                                    ["Other", t.varieties.other],
                                    ["Unknown", t.varieties.unknown],
                                ]}
                            />

                            <SelectField
                                label={t.stage}
                                hint={t.stageHint}
                                value={form.cropStage}
                                onChange={(value) =>
                                    updateField("cropStage", value)
                                }
                                options={[
                                    ["Just planted", t.stages.planted],
                                    ["Small / still growing", t.stages.small],
                                    ["Growing well", t.stages.growing],
                                    ["Almost ready", t.stages.almost],
                                    ["Ready for harvest", t.stages.ready],
                                    ["Unknown", t.stages.unknown],
                                ]}
                            />

                            <Field
                                label={t.planting}
                                type="date"
                                value={form.plantingDate}
                                onChange={(value) =>
                                    updateField("plantingDate", value)
                                }
                            />

                            <SelectField
                                label={t.soil}
                                hint={t.soilHint}
                                value={form.soilType}
                                onChange={(value) =>
                                    updateField("soilType", value)
                                }
                                options={[
                                    ["Black soil", t.soils.black],
                                    ["Red soil", t.soils.red],
                                    ["Alluvial soil", t.soils.alluvial],
                                    ["Laterite soil", t.soils.laterite],
                                    ["Other", t.soils.other],
                                    ["Unknown", t.soils.unknown],
                                ]}
                            />
                        </div>
                    </Section>

                    {error && (
                        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end pb-10">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-xl bg-orange-500 px-7 py-4 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            {submitting ? t.creating : `${t.create} →`}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

function Section({
    number,
    title,
    description,
    children,
}: {
    number: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-white/10 bg-[#0a100c] p-6 sm:p-8">
            <div className="mb-7 flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-black">
                    {number}
                </div>

                <div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-white/40">
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </section>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
    min,
    step,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    min?: string;
    step?: string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium leading-6 text-white/70">
                {label}
                {required && (
                    <span className="ml-1 text-orange-400">*</span>
                )}
            </span>

            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                min={min}
                step={step}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-orange-400/50 focus:ring-1 focus:ring-orange-400/30"
            />
        </label>
    );
}

function SelectField({
    label,
    hint,
    value,
    onChange,
    options,
}: {
    label: string;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly [string, string][];
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium leading-6 text-white/70">
                {label}
            </span>

            {hint && (
                <span className="mb-3 block text-xs leading-5 text-white/30">
                    {hint}
                </span>
            )}

            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#080c09] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400/50 focus:ring-1 focus:ring-orange-400/30"
            >
                <option value="">Select an option</option>

                {options.map(([value, label]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}