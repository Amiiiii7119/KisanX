"use client";

import {
  ArrowUpRight,
  BrainCircuit,
  CloudSun,
  Eye,
  MapPinned,
  ScanLine,
  ShieldCheck,
  Sprout,
  Wheat,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Crop Vision",
    text: "Turn a field image into a disease and crop-health assessment with confidence.",
    icon: Eye,
  },
  {
    number: "02",
    title: "Risk Forecast",
    text: "Combine disease, weather, crop stage, variety, soil and field history to look ahead.",
    icon: CloudSun,
  },
  {
    number: "03",
    title: "Field Intelligence",
    text: "Connect observations to real plots, locations and emerging disease patterns.",
    icon: MapPinned,
  },
  {
    number: "04",
    title: "Verified Harvest",
    text: "Use guided field video evidence to assess readiness, visible health and yield range.",
    icon: ShieldCheck,
  },
];

export function FeatureBento() {
  return (
    <section
      id="intelligence"
      className="relative overflow-hidden bg-[#030604] py-28 text-white"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[#203525]" />
      <div className="pointer-events-none absolute left-[-10%] top-[15%] h-[500px] w-[500px] rounded-full bg-[#0b3518]/20 blur-[130px]" />
      <div className="pointer-events-none absolute right-[-10%] bottom-0 h-[450px] w-[450px] rounded-full bg-[#d96d22]/[0.05] blur-[120px]" />

      <div className="relative mx-auto max-w-[1480px] px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e87524]">
              The intelligence loop
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              From a single
              <br />
              <span className="text-[#739678]">field signal</span>
              <br />
              to a decision.
            </h2>
            <p className="mt-7 max-w-md text-base leading-7 text-[#7e8b82]">
              KisanX connects crop vision, context, weather, follow-up and
              harvest intelligence into one continuous farm-to-market workflow.
            </p>

            <div className="mt-9 flex items-center gap-4">
              <Link
                href="/auth"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-[#dfe6df]"
              >
                Start with your field
                <ArrowUpRight className="size-4 text-[#e87524] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-16 hidden border-t border-[#1d2c21] pt-6 lg:block">
              <div className="flex items-center gap-3 text-xs text-[#667369]">
                <Sprout className="size-4 text-[#6d946f]" />
                Built around the realities of field data.
              </div>
            </div>
          </div>

          <div id="how-it-works" className="grid gap-4 sm:grid-cols-2">
            <div className="group relative min-h-[390px] overflow-hidden rounded-[2rem] border border-[#304735] bg-[#08130b] p-8 sm:col-span-2">
              <div className="absolute right-[-8%] top-[-25%] size-[430px] rounded-full bg-[#174c24]/25 blur-[70px] transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 opacity-[0.16]" style={{
                backgroundImage: "linear-gradient(120deg, transparent 49%, rgba(126,157,129,.22) 50%, transparent 51%)",
                backgroundSize: "80px 80px",
              }} />
              <div className="relative flex h-full min-h-[325px] flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-[#3c5b42] bg-[#0d1d11]">
                    <BrainCircuit className="size-5 text-[#e87524]" />
                  </div>
                  <span className="text-[10px] tracking-[0.2em] text-[#58675c]">CORE SYSTEM</span>
                </div>

                <div className="max-w-2xl">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#738378]">01 — Crop intelligence</p>
                  <h3 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                    See what the field is telling you.
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-[#859289]">
                    Image-based crop health analysis becomes the first signal
                    in a larger field intelligence loop.
                  </p>
                </div>
              </div>
            </div>

            {features.map(({ number, title, text, icon: Icon }, index) => (
              <div
                key={title}
                className={`group relative min-h-[300px] overflow-hidden rounded-[1.75rem] border border-[#26392a] bg-[#071009] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#405a45] ${
                  index === 3 ? "sm:col-span-2" : ""
                }`}
              >
                <div className="absolute right-0 top-0 size-40 rounded-full bg-[#12351b]/20 blur-[55px] transition duration-500 group-hover:bg-[#e87524]/[0.06]" />

                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl border border-[#2d4331] bg-[#0b170d]">
                      <Icon className="size-5 text-[#91aa94]" />
                    </div>
                    <span className="text-[10px] font-medium tracking-[0.18em] text-[#56645a]">{number}</span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[#e7ece8]">
                      {title}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-[#7d8a80]">{text}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="relative min-h-[220px] overflow-hidden rounded-[1.75rem] border border-[#50351f] bg-[#120c07] p-7 sm:col-span-2">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_30%,rgba(232,117,36,.13),transparent_55%)]" />
              <div className="relative flex h-full flex-col justify-between sm:flex-row sm:items-end">
                <div>
                  <Wheat className="size-6 text-[#e87524]" />
                  <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-[#9a795f]">
                    05 — Harvest → market
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f1e8df]">
                    Verify. Estimate. Connect.
                  </h3>
                </div>
                <div className="mt-8 flex items-center gap-3 sm:mt-0">
                  <span className="rounded-full border border-[#694323] bg-[#241309] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#c69b78]">
                    Harvest ready
                  </span>
                  <ScanLine className="size-5 text-[#e87524]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureBento;
