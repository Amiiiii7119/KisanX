"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  CloudRain,
  MapPin,
  ScanLine,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { LiquidMetalButton } from "@/components/ui/liquid_metal_button";

function PlasmaField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const W = 180;
    const H = 110;
    canvas.width = W;
    canvas.height = H;

    const image = ctx.createImageData(W, H);
    const data = image.data;

    let raf = 0;
    let time = 0;
    let last = performance.now();
    let alive = true;

    const palette = (t: number) => {
      const stops = [
        [3, 7, 4],
        [7, 26, 13],
        [17, 57, 25],
        [46, 91, 49],
        [123, 93, 44],
        [224, 105, 31],
        [8, 18, 9],
      ];

      const scaled = Math.max(0, Math.min(0.999, t)) * (stops.length - 1);
      const i = Math.floor(scaled);
      const f = scaled - i;
      const a = stops[i];
      const b = stops[Math.min(i + 1, stops.length - 1)];

      return [
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f,
      ];
    };

    const frame = (now: number) => {
      if (!alive) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt * 0.28;

      let index = 0;

      for (let y = 0; y < H; y++) {
        const ny = y / H - 0.5;

        for (let x = 0; x < W; x++) {
          const nx = x / W - 0.5;

          const field =
            Math.sin(nx * 9 + time * 1.1) +
            Math.sin(ny * 8 - time * 0.9) +
            Math.sin((nx + ny) * 10 + time * 0.8) +
            Math.sin(Math.sqrt(nx * nx + ny * ny) * 19 - time * 1.3);

          const glow =
            Math.exp(-(((nx + 0.2) ** 2) / 0.08 + ((ny - 0.05) ** 2) / 0.15)) *
            0.8;

          const t = Math.max(0, Math.min(1, field / 8 + 0.52 + glow));
          const [r, g, b] = palette(t);

          data[index++] = r;
          data[index++] = g;
          data[index++] = b;
          data[index++] = 255;
        }
      }

      ctx.putImageData(image, 0, 0);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-[0.88] mix-blend-screen"
      style={{
        filter: "blur(38px) saturate(1.25)",
        transform: "scale(1.18)",
        imageRendering: "pixelated",
      }}
    />
  );
}

const TICKER = [
  "SUGARCANE",
  "COTTON",
  "WHEAT",
  "RICE",
  "SOYBEAN",
  "MAIZE",
];

export function Hero() {
  return (
    <section
      id="crop-health"
      className="relative min-h-screen overflow-hidden bg-[#030604] text-white"
    >
      <div className="pointer-events-none absolute inset-0">
        <PlasmaField />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_40%,rgba(20,71,32,0.28),transparent_48%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_15%,rgba(213,103,31,0.08),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_5%,#030604_82%)]" />
        <div className="absolute inset-0 opacity-[0.13]" style={{
          backgroundImage: "linear-gradient(rgba(126,155,128,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(126,155,128,.18) 1px, transparent 1px)",
          backgroundSize: "78px 78px",
          maskImage: "linear-gradient(to bottom, black, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 88%)",
        }} />
      </div>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e87524] to-transparent opacity-70" />

      <div className="relative mx-auto flex min-h-screen max-w-[1480px] items-center px-6 pb-12 pt-32 lg:px-10">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1.03fr_0.97fr]">
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-[#36533b] bg-[#07100a]/75 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#9cad9f] backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#e87524] shadow-[0_0_12px_rgba(232,117,36,.8)]" />
              Field intelligence · Maharashtra
            </div>

            <h1 className="max-w-4xl text-[3.8rem] font-semibold leading-[0.9] tracking-[-0.065em] sm:text-6xl lg:text-[6.7rem]">
              See the problem.
              <br />
              <span className="text-[#e87524]">Before the field</span>
              <br />
              <span className="text-[#d8d7ba]">does.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-7 text-[#929e95] sm:text-lg">
              KisanX turns a field observation into crop intelligence —
              detecting disease, forecasting risk, guiding action, verifying
              harvest readiness and helping farmers reach the market.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth">
                <LiquidMetalButton className="w-full sm:w-auto">
                  Start with KisanX
                  <ArrowUpRight className="ml-2 size-4" />
                </LiquidMetalButton>
              </Link>

              <Link
                href="#intelligence"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#344438] bg-[#071009]/70 px-6 text-sm font-semibold text-[#c1c9c2] transition hover:border-[#5b715e] hover:bg-[#0d1710] hover:text-white"
              >
                See how it works
              </Link>
            </div>

            <div className="mt-11 max-w-xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              <div className="flex w-max animate-[kisanx-marquee_18s_linear_infinite] gap-7 text-[10px] font-medium tracking-[0.22em] text-[#617065]">
                {[...TICKER, ...TICKER].map((crop, index) => (
                  <span key={`${crop}-${index}`} className="flex items-center gap-7">
                    {crop}
                    <span className="size-1 rounded-full bg-[#e87524]" />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-20 rounded-full bg-[#15411f]/25 blur-[100px]" />

            <div className="relative rounded-[2rem] border border-[#314a35] bg-[#061009]/80 p-5 shadow-[0_35px_110px_rgba(0,0,0,.55)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#657267]">
                    Field intelligence
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#dbe2dc]">
                    Sugarcane · Pune District
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#35523b] bg-[#09160c] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#91a795]">
                  <span className="size-1.5 rounded-full bg-[#86b08c]" />
                  Live
                </div>
              </div>

              <div className="relative h-[380px] overflow-hidden rounded-[1.5rem] border border-[#29412e] bg-[#07120a]">
                <div className="absolute inset-0 opacity-70" style={{
                  backgroundImage: "linear-gradient(35deg, transparent 47%, rgba(93,130,96,.16) 48%, transparent 49%), linear-gradient(145deg, transparent 47%, rgba(93,130,96,.1) 48%, transparent 49%)",
                  backgroundSize: "94px 94px",
                }} />

                <div className="absolute inset-x-0 top-0 h-20 animate-[kisanx-scan_4s_ease-in-out_infinite] bg-gradient-to-b from-[#e87524]/12 to-transparent" />

                <div className="absolute left-[15%] top-[22%] size-28 rounded-full border border-[#e87524]/35 bg-[#e87524]/5 shadow-[0_0_60px_rgba(232,117,36,.12)]" />
                <div className="absolute left-[22%] top-[29%] rounded-xl border border-[#6b4329] bg-[#120e09]/95 px-4 py-3 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-3">
                    <ScanLine className="size-4 text-[#ef8b43]" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-[#8d7565]">Detected</p>
                      <p className="text-xs font-semibold text-[#f0d6c2]">Red Rot · 82%</p>
                    </div>
                  </div>
                </div>

                <div className="absolute right-[10%] bottom-[21%] size-32 rounded-full border border-[#719477]/30 bg-[#719477]/5" />
                <div className="absolute right-[16%] bottom-[27%] rounded-xl border border-[#3a533f] bg-[#09120b]/95 px-4 py-3 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="size-4 text-[#91b395]" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-[#6d7d71]">7-day risk</p>
                      <p className="text-xs font-semibold text-[#d0ddd2]">Moderate</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#050906]/75 px-4 py-3 backdrop-blur-md">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-[#66736a]">Field status</p>
                    <p className="mt-1 text-xs font-semibold text-[#c3cec5]">Attention recommended</p>
                  </div>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#1a291d]">
                    <div className="h-full w-[62%] rounded-full bg-[#e87524]" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { icon: ScanLine, label: "Crop health", value: "Scan", accent: true },
                  { icon: CloudRain, label: "Weather", value: "Risk", accent: false },
                  { icon: ShieldCheck, label: "Harvest", value: "Verify", accent: true },
                ].map(({ icon: Icon, label, value, accent }) => (
                  <div key={label} className="rounded-2xl border border-[#263b2a] bg-[#09140b] p-4 transition hover:border-[#e87524]/35">
                    <Icon className={`size-4 ${accent ? "text-[#e87524]" : "text-[#8dad91]"}`} />
                    <p className="mt-3 text-[9px] uppercase tracking-wider text-[#68766b]">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-[#d5ddd6]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-7 -left-9 rounded-2xl border border-[#314735] bg-[#081109]/95 px-5 py-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-[#e87524]" />
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#68766b]">Location signal</p>
                  <p className="mt-1 text-xs font-medium text-[#c2cdc4]">Plot · Pune, Maharashtra</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#304833] to-transparent" />
    </section>
  );
}

export default Hero;
