"use client";

import * as React from "react";
import Image from "next/image";

const HERO_IMAGES = [
  "/FlyGo/1.webp",
  "/FlyGo/2.webp",
  "/FlyGo/3.webp",
  "/FlyGo/4.webp",
  "/FlyGo/5.webp",
  "/FlyGo/6.webp",
];

export function HeroSection() {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full min-h-80 md:min-h-125 py-24 md:py-32 overflow-hidden flex flex-col justify-center items-center">
      <div className="absolute inset-0 z-0 bg-zinc-950">
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            currentIdx === 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={HERO_IMAGES[0]}
            alt="FlyGo Travel Landscape 1"
            fill
            priority
            sizes="100vw"
            className="object-cover blur-[3px] scale-105"
          />
        </div>

        {mounted &&
          HERO_IMAGES.slice(1).map((src, idx) => {
            const actualIdx = idx + 1;
            return (
              <div
                key={src}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  actualIdx === currentIdx ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={src}
                  alt={`FlyGo Travel Landscape ${actualIdx + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover blur-[3px] scale-105"
                />
              </div>
            );
          })}
      </div>

      <div className="absolute inset-0 z-10 bg-linear-to-b from-zinc-950/60 via-zinc-950/45 to-zinc-950/70" />
      <div className="absolute inset-0 z-10 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-20 text-center max-w-xl">
        <div className="space-y-3">
          <h1 className="text-8xl md:text-10xl font-black tracking-widest font-heading uppercase text-white drop-shadow-sm select-none">
            FlyGo
          </h1>
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.3em] text-primary bg-linear-to-r from-primary via-purple-400 to-indigo-400 bg-clip-text select-none">
            Tap. Fly. Go
          </p>
        </div>
      </div>
    </section>
  );
}
