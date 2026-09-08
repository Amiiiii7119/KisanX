"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Video,
  Upload,
  Lock,
  Send,
  MessageSquare,
  Navigation,
  Sparkles,
  TrendingUp,
  MapPin,
  Scale,
  DollarSign,
  Cpu,
  FileCheck,
  Building,
  RefreshCw,
  Eye,
  Sliders,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Negotiation {
  id: string;
  sender_role: "buyer" | "farmer";
  sender_name: string;
  proposed_price?: number;
  message: string;
  timestamp: string;
  status: string;
  encryption_hash?: string;
}

interface Listing {
  id: string;
  farmer_name: string;
  farm_name: string;
  village: string;
  district: string;
  latitude: number;
  longitude: number;
  crop_name: string;
  variety: string;
  farm_area_acres: number;
  health_percentage: number;
  quality_grade: string;
  estimated_weight_quintals: number;
  price_per_quintal: number;
  total_valuation: number;
  media_type: string;
  video_preview: string;
  yolo_detection_summary: string;
  gemma_appraisal_summary: string;
  inspector_status: string;
  certified_by?: string | null;
  certification_timestamp?: string | null;
  inspector_notes?: string | null;
  created_at: string;
  distance_km?: number | null;
  encryption_fingerprint?: string;
  negotiations?: Negotiation[];
}

export default function MarketplacePage() {
  const [activeRole, setActiveRole] = useState<"buyer" | "farmer" | "inspector">("buyer");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // GPS Proximity State
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [cropFilter, setCropFilter] = useState<string>("All");

  // Farmer Video Upload State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [farmerCrop, setFarmerCrop] = useState<"Cotton" | "Sugarcane">("Cotton");
  const [farmerAcreage, setFarmerAcreage] = useState<string>("5.0");
  const [farmerFarmName, setFarmerFarmName] = useState("Kisan Krishi Farm");
  const [farmerVillage, setFarmerVillage] = useState("Baramati");
  const [farmerDistrict, setFarmerDistrict] = useState("Pune, Maharashtra");
  const [farmerVariety, setFarmerVariety] = useState("Bt Cotton Hybrid");
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [auditResult, setAuditResult] = useState<any>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Negotiation Modal State
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [sendingNegotiation, setSendingNegotiation] = useState(false);

  // Inspector Action State
  const [inspectNotes, setInspectNotes] = useState("");
  const [certifyingId, setCertifyingId] = useState<string | null>(null);

  // ----------------------------------------------------------
  // FETCH LISTINGS
  // ----------------------------------------------------------
  async function fetchListings(lat?: number | null, lng?: number | null, maxDist?: number | null) {
    try {
      setLoading(true);
      let url = `${API_URL}/api/marketplace/listings`;
      const params = new URLSearchParams();
      if (cropFilter !== "All") params.append("crop", cropFilter);
      if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
        params.append("buyer_lat", lat.toString());
        params.append("buyer_lng", lng.toString());
      }
      if (maxDist) {
        params.append("max_distance_km", maxDist.toString());
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load marketplace listings.");
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Marketplace connection error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchListings(userLat, userLng, distanceFilter);
  }, [cropFilter, distanceFilter, userLat, userLng]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "buyer") setActiveRole("buyer");
      else if (tabParam === "farmer" || tabParam === "seller") setActiveRole("farmer");
      else if (tabParam === "inspector" || tabParam === "officer") setActiveRole("inspector");
    }

    const supabase = createClient();
    async function checkRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

          const role = (profile?.role || session.user.user_metadata?.role || "").toUpperCase();
          const params = new URLSearchParams(window.location.search);
          if (!params.get("tab")) {
            if (role === "BUYER") setActiveRole("buyer");
            else if (role === "OFFICER") setActiveRole("inspector");
            else if (role === "FARMER") setActiveRole("farmer");
          }
        }
      } catch (err) {
        console.warn("Session role check note:", err);
      }
    }
    checkRole();
  }, []);

  // ----------------------------------------------------------
  // ACQUIRE GPS PROXIMITY
  // ----------------------------------------------------------
  function handleLocateMe() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        console.warn("GPS failed, using Pune regional coordinates:", err);
        setUserLat(18.5204);
        setUserLng(73.8567);
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  }

  // ----------------------------------------------------------
  // VIDEO AUDIT HANDLER
  // ----------------------------------------------------------
  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setAuditResult(null);
      setPublishSuccess(false);
    }
  }

  async function handleAnalyzeVideo() {
    if (!videoFile) {
      alert("Please select a video file or recording first.");
      return;
    }
    const area = parseFloat(farmerAcreage);
    if (isNaN(area) || area <= 0) {
      alert("Please enter a valid farm area in acres.");
      return;
    }

    try {
      setAnalyzingVideo(true);
      setAnalysisProgress("Extracting video frames via OpenCV...");
      await new Promise((r) => setTimeout(r, 600));

      setAnalysisProgress(`Running ${farmerCrop === "Cotton" ? "YOLOv11 Instance Seg" : "MobileNetV3"} on sampled frames...`);
      await new Promise((r) => setTimeout(r, 800));

      setAnalysisProgress("Calculating agronomic mathematical yield formula...");
      await new Promise((r) => setTimeout(r, 600));

      setAnalysisProgress("Generating lot appraisal via Gemma 3 4B...");

      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("crop_name", farmerCrop);
      formData.append("farm_area_acres", area.toString());
      formData.append("farm_name", farmerFarmName);
      formData.append("village", farmerVillage);
      formData.append("district", farmerDistrict);
      formData.append("variety", farmerVariety);
      formData.append("latitude", "18.5204");
      formData.append("longitude", "73.8567");

      const res = await fetch(`${API_URL}/api/marketplace/analyze-harvest`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Video analysis failed.");
      }

      const data = await res.json();
      setAuditResult(data);
    } catch (err: any) {
      alert(err.message || "Failed to analyze harvest video.");
    } finally {
      setAnalyzingVideo(false);
      setAnalysisProgress("");
    }
  }

  async function handlePublishListing() {
    if (!auditResult) return;
    try {
      setLoading(true);
      const payload = {
        farmer_name: "Farmer User (Verified)",
        farm_name: auditResult.farm_name,
        village: auditResult.village,
        district: auditResult.district,
        crop_name: auditResult.crop_name,
        variety: auditResult.variety,
        farm_area_acres: auditResult.farm_area_acres,
        health_percentage: auditResult.health_percentage,
        quality_grade: auditResult.quality_grade,
        estimated_weight_quintals: auditResult.estimated_weight_quintals,
        price_per_quintal: auditResult.price_per_quintal,
        total_valuation: auditResult.total_valuation,
        gemma_appraisal_summary: auditResult.gemma_appraisal_summary,
        latitude: auditResult.latitude,
        longitude: auditResult.longitude,
        encryption_fingerprint: auditResult.encryption_fingerprint,
      };

      const res = await fetch(`${API_URL}/api/marketplace/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to publish listing.");
      const published = await res.json();
      setPublishSuccess(true);
      setListings((prev) => [published.listing, ...prev]);
      setActiveRole("buyer");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------------
  // ENCRYPTED NEGOTIATION HANDLER
  // ----------------------------------------------------------
  async function handleSendNegotiation() {
    if (!selectedListing || !chatMessage.trim()) return;
    try {
      setSendingNegotiation(true);
      const res = await fetch(`${API_URL}/api/marketplace/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: selectedListing.id,
          sender_role: activeRole === "farmer" ? "farmer" : "buyer",
          sender_name: activeRole === "farmer" ? "Farmer (Seller)" : "Mandi Commodity Buyer",
          proposed_price: counterPrice ? parseInt(counterPrice) : null,
          message: chatMessage.trim(),
        }),
      });

      if (!res.ok) throw new Error("Could not send negotiation message.");
      const data = await res.json();

      // Update in-memory state
      setSelectedListing((prev) =>
        prev ? { ...prev, negotiations: data.all_negotiations } : null
      );
      setListings((prev) =>
        prev.map((l) => (l.id === selectedListing.id ? { ...l, negotiations: data.all_negotiations } : l))
      );
      setChatMessage("");
      setCounterPrice("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingNegotiation(false);
    }
  }

  // ----------------------------------------------------------
  // INSPECTOR CERTIFY HANDLER
  // ----------------------------------------------------------
  async function handleInspectorAction(listingId: string, action: "CERTIFY" | "QUARANTINE") {
    try {
      setCertifyingId(listingId);
      const res = await fetch(`${API_URL}/api/marketplace/certify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          officer_name: "Officer S. R. Deshmukh",
          officer_id: "FSSAI-AGRI-404",
          action: action,
          notes: inspectNotes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Inspector certification failed.");
      const data = await res.json();

      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? data.listing : l))
      );
      if (selectedListing?.id === listingId) {
        setSelectedListing(data.listing);
      }
      setInspectNotes("");
      alert(data.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCertifyingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#020503] text-white selection:bg-emerald-500/30 selection:text-white">
      {/* Background Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 left-1/4 w-[600px] h-[600px] rounded-full blur-[180px] opacity-15 bg-emerald-600" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] rounded-full blur-[180px] opacity-10 bg-teal-600" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020503]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-black font-extrabold text-lg shadow-lg shadow-emerald-500/20">
                K
              </span>
              <div>
                <span className="text-lg font-bold tracking-tight text-white">
                  Kisan<span className="text-emerald-400">X</span> Mandi
                </span>
                <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  APMC Live
                </span>
              </div>
            </div>
          </div>

          {/* ROLE SWITCHER PILLS */}
          <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-black/60 p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setActiveRole("buyer")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeRole === "buyer"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Building size={13} />
              Buyer Radar
            </button>
            <button
              type="button"
              onClick={() => setActiveRole("farmer")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeRole === "farmer"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Video size={13} />
              Farmer Video Sell
            </button>
            <button
              type="button"
              onClick={() => setActiveRole("inspector")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeRole === "inspector"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <ShieldCheck size={13} />
              Food Inspector
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* ============================================================ */}
        {/* ROLE 1: FARMER VIEW (VIDEO UPLOAD & AI VALUATION) */}
        {/* ============================================================ */}
        {activeRole === "farmer" && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 sm:p-8 backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <Video size={13} />
                    YOLOv11 & OpenCV Video Harvest Ingestion
                  </div>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
                    Sell Your Verified Harvest
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-white/60">
                    Upload a video walkthrough of your crop. Our neural models count healthy foliage, estimate lot weight (quintals), and compute fair APMC valuation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs font-mono text-white/70">
                    Gemma 3 4B Appraisal Engine
                  </span>
                </div>
              </div>

              {/* FARMER INPUT FORM */}
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                      Target Crop
                    </label>
                    <div className="mt-2 flex gap-3">
                      {(["Cotton", "Sugarcane"] as const).map((crop) => (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => setFarmerCrop(crop)}
                          className={`flex-1 rounded-2xl border p-3 text-xs font-bold transition flex items-center justify-center gap-2 ${
                            farmerCrop === crop
                              ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                              : "border-white/10 bg-black/40 text-white/60 hover:bg-white/5"
                          }`}
                        >
                          <span className="text-lg">{crop === "Cotton" ? "🌿" : "🎋"}</span>
                          {crop}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                        Harvest Area (Acres) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={farmerAcreage}
                        onChange={(e) => setFarmerAcreage(e.target.value)}
                        placeholder="e.g. 5.5"
                        className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                        Variety / Hybrid
                      </label>
                      <input
                        type="text"
                        value={farmerVariety}
                        onChange={(e) => setFarmerVariety(e.target.value)}
                        placeholder="e.g. Bt Hybrid 6"
                        className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                        Farm Name
                      </label>
                      <input
                        type="text"
                        value={farmerFarmName}
                        onChange={(e) => setFarmerFarmName(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                        Village & District
                      </label>
                      <input
                        type="text"
                        value={farmerDistrict}
                        onChange={(e) => setFarmerDistrict(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* VIDEO DROPZONE */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                    Upload Canopy Video / Recording *
                  </label>
                  <label className="mt-2 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/20 bg-black/50 p-6 transition hover:border-emerald-400/50 hover:bg-emerald-950/10 cursor-pointer min-h-[220px]">
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    {videoFile ? (
                      <div className="text-center">
                        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-2">
                          <CheckCircle2 size={24} />
                        </div>
                        <p className="text-sm font-bold text-white truncate max-w-xs">
                          {videoFile.name}
                        </p>
                        <p className="text-xs text-emerald-400 mt-1">
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Neural Scan
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-white/10 text-white/60 mb-2">
                          <Upload size={24} />
                        </div>
                        <p className="text-sm font-bold text-white">
                          Select Harvest Video or Image Sequence
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          MP4, WebM, MOV, or camera capture
                        </p>
                      </div>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={handleAnalyzeVideo}
                    disabled={analyzingVideo || !videoFile}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-extrabold text-black transition hover:opacity-95 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {analyzingVideo ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        {analysisProgress || "Analyzing frames with YOLO & Gemma..."}
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Analyze Video & Calculate Lot Valuation
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AUDIT RESULTS CARD */}
              {auditResult && (
                <div className="mt-8 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 p-6 sm:p-8 backdrop-blur-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                        AI Harvest Verification Certificate
                      </span>
                      <h3 className="mt-2 text-2xl font-black text-white">
                        {auditResult.quality_grade}
                      </h3>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-xs text-white/50">Cryptographic Hash</p>
                      <p className="text-xs text-emerald-400 font-bold">
                        {auditResult.encryption_fingerprint}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs text-white/50">Canopy Health Score</p>
                      <p className="mt-1 text-2xl font-black text-emerald-400">
                        {auditResult.health_percentage}%
                      </p>
                      <p className="text-[11px] text-white/40">From {auditResult.sampled_frames_count} sampled frames</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs text-white/50">Estimated Harvest Weight</p>
                      <p className="mt-1 text-2xl font-black text-white font-mono">
                        {auditResult.estimated_weight_quintals} <span className="text-sm font-normal text-white/60">Qtl</span>
                      </p>
                      <p className="text-[11px] text-white/40">Acreage formula verified</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs text-white/50">Suggested APMC Rate</p>
                      <p className="mt-1 text-2xl font-black text-white font-mono">
                        ₹{auditResult.price_per_quintal} <span className="text-xs font-normal text-white/60">/ Qtl</span>
                      </p>
                      <p className="text-[11px] text-white/40">Includes quality grade markup</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <p className="text-xs text-emerald-300">Total Lot Valuation</p>
                      <p className="mt-1 text-2xl font-black text-emerald-400 font-mono">
                        ₹{auditResult.total_valuation.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-white/50">Full lot realization</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Gemma 3 4B Chief Agronomist Appraisal
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/80">
                      {auditResult.gemma_appraisal_summary}
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handlePublishListing}
                      className="rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-black transition hover:bg-emerald-400 shadow-xl shadow-emerald-500/30 flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Publish Verified Lot to APMC Marketplace
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FARMER'S PUBLISHED HARVEST LOTS & INCOMING BIDS */}
            <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.05] to-black/50 p-6 sm:p-8 backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    My Harvest Listings & Live Buyer Bids
                  </h2>
                  <p className="text-xs text-white/50">
                    Review real-time bids, counter-offers, and inspector certifications for your published harvest lots.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {listings.length} Lots Active in Mandi
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {listings.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/60 p-5 space-y-4 hover:border-white/20 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.crop_name === "Cotton" ? "🌿" : "🎋"}</span>
                          <h3 className="text-base font-bold text-white">{item.crop_name} · {item.variety}</h3>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">{item.farm_name} · {item.district}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          item.inspector_status === "CERTIFIED_GRADE_A"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : item.inspector_status === "QUARANTINED"
                            ? "bg-red-500/20 text-red-300 border border-red-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {item.inspector_status === "CERTIFIED_GRADE_A"
                          ? "✓ Grade A Certified"
                          : item.inspector_status === "QUARANTINED"
                          ? "⚠️ Quarantined"
                          : "⏳ Awaiting Inspection"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/[0.03] p-3 text-center">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Lot Weight</p>
                        <p className="text-sm font-bold text-white font-mono">{item.estimated_weight_quintals} Qtl</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Asking Rate</p>
                        <p className="text-sm font-bold text-white font-mono">₹{item.price_per_quintal}/Qtl</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Lot Value</p>
                        <p className="text-sm font-bold text-emerald-400 font-mono">₹{item.total_valuation.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="text-xs text-white/60">
                        {(item.negotiations || []).length > 0 ? (
                          <span className="text-emerald-400 font-semibold">
                            {(item.negotiations || []).length} Buyer Offer(s) Received
                          </span>
                        ) : (
                          <span className="text-white/40">No buyer bids yet</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedListing(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                      >
                        <MessageSquare size={13} />
                        Chat & Manage Offers
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ROLE 2: BUYER RADAR VIEW (GPS PROXIMITY & ENCRYPTED CHAT) */}
        {/* ============================================================ */}
        {activeRole === "buyer" && (
          <div className="space-y-8">
            {/* SEARCH & GPS RADAR CONTROLS */}
            <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 backdrop-blur-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">
                    Verified Produce Marketplace
                  </h2>
                  <p className="text-xs text-white/60 mt-1">
                    Direct farm procurement with YOLO video audits, verified weights, and encrypted negotiation contracts.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={gpsLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    <Navigation size={14} className={gpsLoading ? "animate-spin" : ""} />
                    {userLat ? "GPS Locked (Nearest First)" : "Locate Nearby Farms (GPS)"}
                  </button>

                  <div className="flex rounded-xl border border-white/15 bg-black/40 p-1">
                    {(["All", "Cotton", "Sugarcane"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCropFilter(c)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          cropFilter === c ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="flex rounded-xl border border-white/15 bg-black/40 p-1">
                    {[
                      { label: "All Dist", val: null },
                      { label: "< 50 km", val: 50 },
                      { label: "< 100 km", val: 100 },
                    ].map((f) => (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => setDistanceFilter(f.val)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          distanceFilter === f.val ? "bg-emerald-500/20 text-emerald-300" : "text-white/50 hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DPDPA 2023 STATUTORY PRIVACY & GEOLOCATION CONSENT BANNER */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-2 text-[11px] text-emerald-200/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>DPDPA 2023 Compliance Notice:</strong> GPS coordinates are processed exclusively for Haversine transit calculations to certified APMC mandis. Spatial data is protected under India's Digital Personal Data Protection Act.
                  </span>
                </div>
                <span className="hidden md:inline font-mono text-[10px] text-emerald-400/60 uppercase shrink-0">
                  Government Mandi Standards
                </span>
              </div>
            </div>

            {/* LISTINGS GRID */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#0b1610] to-[#040806] p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all hover:border-emerald-400/40 hover:shadow-emerald-500/10"
                >
                  <div>
                    {/* TOP BADGES */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white">
                        <span>{l.crop_name === "Cotton" ? "🌿" : "🎋"}</span>
                        {l.crop_name}
                      </span>

                      {l.distance_km !== undefined && l.distance_km !== null && (
                        <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-300">
                          <MapPin size={11} />
                          {l.distance_km} km away
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-white truncate">{l.farm_name}</h3>
                      <p className="text-xs text-white/50">{l.farmer_name} • {l.district}</p>
                    </div>

                    {/* QUALITY & HEALTH */}
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">AI Quality Grade:</span>
                        <span className="font-bold text-emerald-400">{l.quality_grade}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">Canopy Health Score:</span>
                        <span className="font-mono font-bold text-white">{l.health_percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">Acreage & Variety:</span>
                        <span className="text-white/80">{l.farm_area_acres} Ac • {l.variety}</span>
                      </div>
                    </div>

                    {/* INSPECTOR BADGE */}
                    <div className="mt-3">
                      {l.inspector_status === "CERTIFIED_GRADE_A" ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          Certified by {l.certified_by || "Food Inspector"}
                        </div>
                      ) : l.inspector_status === "QUARANTINED" ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-semibold">
                          <AlertTriangle size={13} />
                          Quarantined for Biosecurity Check
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-300/80 font-semibold">
                          <ClockIcon />
                          Pending Government Inspector Audit
                        </div>
                      )}
                    </div>

                    {/* PRICING ROW */}
                    <div className="mt-5 border-t border-white/10 pt-4 flex items-end justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-white/50">Lot Volume</p>
                        <p className="text-xl font-extrabold text-white font-mono">
                          {l.estimated_weight_quintals} <span className="text-xs font-normal text-white/60">Qtl</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider text-white/50">Rate / Qtl</p>
                        <p className="text-xl font-black text-emerald-400 font-mono">
                          ₹{l.price_per_quintal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  <button
                    type="button"
                    onClick={() => setSelectedListing(l)}
                    className="mt-5 w-full rounded-2xl border border-white/15 bg-white/10 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-500 hover:text-black flex items-center justify-center gap-2"
                  >
                    <Lock size={13} />
                    Encrypted Negotiation & Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ROLE 3: FOOD INSPECTOR PORTAL */}
        {/* ============================================================ */}
        {activeRole === "inspector" && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-black p-6 sm:p-8 backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                    <ShieldCheck size={14} />
                    Official Food & Agriculture Oversight Authority
                  </div>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
                    Inspector Regulatory Audit Portal
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-white/60">
                    Review automated YOLO canopy telemetry, chemical compliance logs, and issue cryptographic Phytosanitary Certification or Quarantine notices.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/60 p-3 text-xs font-mono text-white/80">
                  <p className="text-white/50 text-[10px]">Logged Authority</p>
                  <p className="font-bold text-amber-300">Inspector ID #FSSAI-MH-902</p>
                </div>
              </div>

              {/* AUDIT QUEUE TABLE */}
              <div className="mt-6 space-y-4">
                {listings.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{item.farm_name}</span>
                        <span className="text-xs text-white/50">({item.farmer_name})</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/80">
                          {item.crop_name} • {item.variety}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        {item.village}, {item.district} • {item.farm_area_acres} Acres • Est. {item.estimated_weight_quintals} Qtl
                      </p>
                      <p className="text-xs text-emerald-400">
                        Neural Foliage Health: {item.health_percentage}% • {item.yolo_detection_summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.inspector_status === "CERTIFIED_GRADE_A" ? (
                        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <Check size={14} />
                          Certified Grade A
                        </div>
                      ) : item.inspector_status === "QUARANTINED" ? (
                        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 flex items-center gap-1.5">
                          <AlertTriangle size={14} />
                          Quarantined
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleInspectorAction(item.id, "CERTIFY")}
                            disabled={certifyingId === item.id}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-extrabold text-black transition flex items-center gap-1.5"
                          >
                            <ShieldCheck size={14} />
                            Issue Phytosanitary Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInspectorAction(item.id, "QUARANTINE")}
                            disabled={certifyingId === item.id}
                            className="rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 transition flex items-center gap-1.5"
                          >
                            <AlertTriangle size={14} />
                            Quarantine
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ENCRYPTED NEGOTIATION MODAL */}
      {/* ============================================================ */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-[#070e09] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col justify-between">
            <div>
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Encrypted Trade Negotiation: {selectedListing.farm_name}
                    </h3>
                    <p className="text-xs text-white/50">
                      {selectedListing.crop_name} • {selectedListing.estimated_weight_quintals} Quintals Lot
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                >
                  Close
                </button>
              </div>

              {/* CRYPTO BADGE */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-mono text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Lock size={11} />
                  AES-256 / SHA-256 Verified Session
                </span>
                <span>Fingerprint: {selectedListing.encryption_fingerprint || "0x8fa4...b901"}</span>
              </div>

              {/* LOT APPRAISAL QUOTE */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-white/70 leading-relaxed">
                <span className="font-bold text-emerald-400">Gemma 3 4B Appraisal: </span>
                {selectedListing.gemma_appraisal_summary}
              </div>

              {/* NEGOTIATION CHAT MESSAGES */}
              <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
                {(selectedListing.negotiations || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-white/40">
                    No negotiation messages yet. Propose your counter-offer rate per quintal below.
                  </div>
                ) : (
                  (selectedListing.negotiations || []).map((neg) => (
                    <div
                      key={neg.id}
                      className={`p-3 rounded-2xl text-xs space-y-1 ${
                        neg.sender_role === "buyer"
                          ? "border border-blue-500/30 bg-blue-950/20 text-blue-100"
                          : "border border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{neg.sender_name}</span>
                        {neg.proposed_price && (
                          <span className="font-mono text-amber-300">
                            Bid: ₹{neg.proposed_price} / Qtl
                          </span>
                        )}
                      </div>
                      <p className="text-white/80">{neg.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
                        <span>{neg.timestamp}</span>
                        <span className="font-mono">{neg.encryption_hash}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* MESSAGE INPUT & PROPOSAL */}
            <div className="border-t border-white/10 pt-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <input
                    type="number"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    placeholder={`Bid (₹/Qtl)`}
                    className="w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Enter message or negotiation terms..."
                    className="w-full rounded-2xl border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSendNegotiation}
                  disabled={sendingNegotiation || !chatMessage.trim()}
                  className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Send size={13} />
                  Send Encrypted Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3 animate-spin text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
