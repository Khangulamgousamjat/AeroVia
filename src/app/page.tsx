// "use client";

// import { useState, useEffect } from "react";
import { preload } from "react-dom";
import { createClient } from "@/utils/supabase/server";
import { SearchPanel } from "@/components/search-panel";
import { HeroSection } from "@/components/hero-section";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  RiPlaneLine,
  RiGlobeLine,
  RiArrowRightUpLine,
  RiCalendarLine,
} from "@remixicon/react";
import type { User } from "@supabase/supabase-js";

export const revalidate = 0;

interface FlightListing {
  id: string;
  flight_no: string;
  origin: string;
  destination: string;
  departs_at: string;
  arrives_at: string;
  status: string;
  base_price: number;
}

export default async function HomePage() {
  preload("/FlyGo/1.webp", { as: "image", fetchPriority: "high" });

  let flights: FlightListing[] = [];
  let errorMsg: string | null = null;
  let user: User | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("flights")
      .select("*")
      .eq("status", "scheduled")
      .gte("departs_at", nowIso)
      .order("departs_at", { ascending: true })
      .limit(6);

    if (error) {
      errorMsg = error.message;
    } else {
      flights = (data || []) as FlightListing[];
    }
  } catch (err: unknown) {
    errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to retrieve scheduled flight listings.";
  }

  const HUBS = [
    {
      city: "London",
      airport: "Heathrow (LHR T5)",
      destination: "LHR (Heathrow T5)",
      tag: "Royal Charm",
      color: "from-blue-600/30 to-indigo-600/30",
      image: "/hub/london.webp",
      dotColor: "bg-blue-400",
      hoverGlow:
        "hover:shadow-[0_0_30px_rgba(59,130,246,0.25)] hover:border-blue-500/30",
    },
    {
      city: "Dubai",
      airport: "Dubai Intl (DXB T3)",
      destination: "DXB (Dubai T3)",
      tag: "Futuristic Luxury",
      color: "from-amber-600/30 to-orange-600/30",
      image: "/hub/dubai.webp",
      dotColor: "bg-amber-400",
      hoverGlow:
        "hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:border-amber-500/30",
    },
    {
      city: "Tokyo",
      airport: "Narita Airport (NRT T1)",
      destination: "NRT (Narita T1)",
      tag: "Zen Heritage",
      color: "from-rose-600/30 to-red-600/30",
      image: "/hub/tokyo.webp",
      dotColor: "bg-rose-400",
      hoverGlow:
        "hover:shadow-[0_0_30px_rgba(244,63,94,0.25)] hover:border-rose-500/30",
    },
    {
      city: "New York",
      airport: "JFK Intl (JFK T8)",
      destination: "JFK (Kennedy T8)",
      tag: "Urban Horizon",
      color: "from-purple-600/30 to-indigo-600/30",
      image: "/hub/newyork.webp",
      dotColor: "bg-purple-400",
      hoverGlow:
        "hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:border-purple-500/30",
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <HeroSection />

      <section className="container mx-auto px-4 md:px-6 relative z-10">
        <SearchPanel />
      </section>

      <section className="container mx-auto px-4 md:px-6 py-20 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-3xl font-bold tracking-tight font-heading flex items-center gap-2">
              <RiGlobeLine className="h-6 w-6 text-primary" />
              Signature Hub Destinations
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              Traverse the globe with premium class luxury services and custom
              seating.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HUBS.map((hub) => (
            <Link
              key={hub.city}
              href={`/search?mode=hub&destination=${encodeURIComponent(hub.destination)}`}
              className={`group relative overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-6 h-72 flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 bg-zinc-950 text-white ${hub.hoverGlow}`}
            >
              <div className="absolute inset-0 z-0 overflow-hidden">
                <Image
                  src={hub.image}
                  alt={hub.city}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover blur-[2px] scale-105 transition-all duration-700 ease-out group-hover:scale-110 group-hover:blur-0"
                />
                <div
                  className={`absolute inset-0 bg-linear-to-b ${hub.color} mix-blend-overlay opacity-60`}
                />
                <div className="absolute inset-0 bg-linear-to-b from-black/50 via-black/25 to-black/85 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/90 transition-colors duration-500" />
              </div>

              <div className="relative z-10 flex flex-col items-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-[10px] tracking-wider uppercase font-bold text-white shadow-sm">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${hub.dotColor} animate-pulse`}
                  />
                  {hub.tag}
                </span>
                <h3 className="text-3xl font-extrabold font-heading mt-4 text-transparent bg-clip-text bg-linear-to-r from-white via-zinc-100 to-zinc-300 tracking-tight leading-none drop-shadow-md group-hover:from-white group-hover:to-white transition-all duration-300">
                  {hub.city}
                </h3>
                <p className="text-xs text-zinc-300/90 mt-1.5 font-medium leading-relaxed drop-shadow-sm group-hover:text-zinc-200 transition-colors">
                  {hub.airport}
                </p>
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide uppercase text-zinc-300 group-hover:text-white transition-colors duration-300">
                  View schedules
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-white shadow-lg group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:scale-110 group-hover:rotate-45 transition-all duration-300">
                  <RiArrowRightUpLine className="h-5 w-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-zinc-100 dark:bg-zinc-900/40 py-20 border-y border-zinc-200/50 dark:border-zinc-800/50">
        <div className="container mx-auto px-4 md:px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-3xl font-bold tracking-tight font-heading flex items-center gap-2">
                <RiPlaneLine className="h-6 w-6 text-primary" />
                Live Boarding & Featured Deals
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Explore real-time schedules currently tracked in our traveler
                hubs. Select any route to configure seating maps.
              </p>
            </div>
          </div>

          {errorMsg ? (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {errorMsg}
            </div>
          ) : flights.length === 0 ? (
            <div className="rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 p-8 text-center text-zinc-400 bg-white/50 dark:bg-zinc-950/50 backdrop-blur">
              No flights found. Please make sure migrations and seeding executed
              correctly.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flights.map((flight) => {
                const depDate = new Date(flight.departs_at);
                const depTime = depDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                const depDateFormatted = depDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });

                const arrDate = new Date(flight.arrives_at);
                const arrTime = arrDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });

                const durationMs = arrDate.getTime() - depDate.getTime();
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor(
                  (durationMs % (1000 * 60 * 60)) / (1000 * 60),
                );

                return (
                  <div
                    key={flight.id}
                    className="group border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl bg-white dark:bg-zinc-950 p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900">
                        <div>
                          <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                            {flight.flight_no}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 ml-2">
                            {flight.flight_no}
                          </span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-green-500 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                          {flight.status}
                        </span>
                      </div>

                      <div className="py-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                              Departure
                            </p>
                            <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                              {flight.origin.split(" ")[0]}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {flight.origin.substring(
                                flight.origin.indexOf("("),
                              )}
                            </p>
                          </div>

                          <div className="flex flex-col items-center justify-center flex-1 px-4 py-1">
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                              {hours}h {minutes}m
                            </p>
                            <div className="relative w-full border-t border-dashed border-zinc-300 dark:border-zinc-700 my-1.5">
                              <RiPlaneLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 transform rotate-90" />
                            </div>
                            <p className="text-[10px] text-zinc-400 font-medium">
                              Direct
                            </p>
                          </div>

                          <div className="space-y-0.5 text-right">
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                              Arrival
                            </p>
                            <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                              {flight.destination.split(" ")[0]}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {flight.destination.substring(
                                flight.destination.indexOf("("),
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-semibold py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/30 dark:border-zinc-800/30">
                          <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <RiCalendarLine className="h-3.5 w-3.5 text-primary" />
                            {depDateFormatted} at {depTime}
                          </span>
                          <span className="text-zinc-400">→ {arrTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                          Base Price
                        </p>
                        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                          ₹{Number(flight.base_price).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {(() => {
                        const targetSearchUrl = `/search?origin=${encodeURIComponent(
                          flight.origin,
                        )}&destination=${encodeURIComponent(
                          flight.destination,
                        )}&date=${depDate.toISOString().split("T")[0]}`;
                        const selectSeatingHref = user
                          ? targetSearchUrl
                          : `/auth/login?next=${encodeURIComponent(targetSearchUrl)}`;
                        return (
                          <Link href={selectSeatingHref}>
                            <Button
                              size="sm"
                              className="font-semibold shadow shadow-primary/10 cursor-pointer"
                            >
                              Select Seating
                            </Button>
                          </Link>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
