"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";

const SeatMapContainer = dynamic(
  () => import("@/components/seat-map-container").then((mod) => mod.SeatMapContainer),
  { ssr: false }
);
import { SearchPanel } from "@/components/search-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiPlaneLine,
  RiSearchEyeLine,
  RiArrowLeftLine,
  RiCalendarLine,
  RiTimerLine,
  RiArrowRightLine,
  RiGroupLine,
} from "@remixicon/react";

import { useRouter } from "next/navigation";
import { useFlightStore } from "@/store/useFlightStore";
import { useUserStore } from "@/store/useUserStore";
import { useStoreHydration } from "@/store/useStoreHydration";
import type { Flight, SeatClass } from "@/store/useFlightStore";

interface FlightResultsProps {
  flights: Flight[];
  passengerCount: number;
  isHubSchedule?: boolean;
  searchParams: {
    origin: string;
    destination: string;
    date: string;
    selectedClass: string;
  };
}

export function FlightResults({
  flights,
  passengerCount,
  isHubSchedule = false,
  searchParams: { origin, destination, date: dateStr, selectedClass },
}: FlightResultsProps) {
  const router = useRouter();
  
  // Zustand user authentication state
  const user = useStoreHydration(useUserStore, (state) => state.user);

  // Zustand state for selected flight (seat map modal trigger)
  const storeSelectedFlight = useStoreHydration(
    useFlightStore,
    (state) => state.selectedFlight,
  );
  const activeFlight =
    storeSelectedFlight !== undefined ? storeSelectedFlight : null;

  const setSelectedFlight = useFlightStore((state) => state.setSelectedFlight);
  const setSelectedSeat = useFlightStore((state) => state.setSelectedSeat);
  const setBookingStep = useFlightStore((state) => state.setBookingStep);
  const setSearchState = useFlightStore((state) => state.setSearchState);

  // Local States
  const [isEditingSearch, setIsEditingSearch] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<string>("price-asc");
  const [selectedAircraft, setSelectedAircraft] = React.useState<string>("all");
  const [resultsCutoffMs] = React.useState(() => Date.now());

  // Filters and Sortings
  const upcomingFlights = React.useMemo(() => {
    return flights.filter(
      (flight) =>
        flight.status === "scheduled" &&
        new Date(flight.departs_at).getTime() > resultsCutoffMs,
    );
  }, [flights, resultsCutoffMs]);

  const uniqueAircrafts = React.useMemo(() => {
    const aircrafts = upcomingFlights
      .map((f) => f.aircraft_type)
      .filter(Boolean);
    return Array.from(new Set(aircrafts));
  }, [upcomingFlights]);

  const filteredFlights = React.useMemo(() => {
    return upcomingFlights.filter((flight) => {
      if (
        selectedAircraft !== "all" &&
        flight.aircraft_type !== selectedAircraft
      ) {
        return false;
      }
      return true;
    });
  }, [upcomingFlights, selectedAircraft]);

  const sortedFlights = React.useMemo(() => {
    return [...filteredFlights].sort((a, b) => {
      if (sortBy === "price-asc") {
        return Number(a.base_price) - Number(b.base_price);
      }
      if (sortBy === "price-desc") {
        return Number(b.base_price) - Number(a.base_price);
      }
      if (sortBy === "departs-asc") {
        return (
          new Date(a.departs_at).getTime() - new Date(b.departs_at).getTime()
        );
      }
      if (sortBy === "departs-desc") {
        return (
          new Date(b.departs_at).getTime() - new Date(a.departs_at).getTime()
        );
      }
      if (sortBy === "arrives-asc") {
        return (
          new Date(a.arrives_at).getTime() - new Date(b.arrives_at).getTime()
        );
      }
      if (sortBy === "duration-asc") {
        const durationA =
          new Date(a.arrives_at).getTime() - new Date(a.departs_at).getTime();
        const durationB =
          new Date(b.arrives_at).getTime() - new Date(b.departs_at).getTime();
        return durationA - durationB;
      }
      return 0;
    });
  }, [filteredFlights, sortBy]);

  // Sync URL params back into the store so the rest of the booking flow has them
  React.useEffect(() => {
    if (
      !isHubSchedule &&
      (origin || destination || dateStr || selectedClass || passengerCount)
    ) {
      setSearchState({
        origin,
        destination,
        date: dateStr,
        class: selectedClass as SeatClass,
        passengerCount,
      });
    }
  }, [
    isHubSchedule,
    origin,
    destination,
    dateStr,
    selectedClass,
    passengerCount,
    setSearchState,
  ]);

  return (
    <div className="flex-grow container mx-auto px-4 md:px-6 py-10 space-y-8 min-h-[75vh]">
      {/* Header Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 cursor-pointer">
            <RiArrowLeftLine className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <RiSearchEyeLine className="h-4 w-4 text-primary" />
          Flight Queries
        </span>
      </div>

      {/* Query Search Panel Summary */}
      {(isHubSchedule ? destination : origin && destination) && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold font-heading flex items-center gap-3">
                {isHubSchedule ? (
                  <>
                    <span>All Origins</span>
                    <RiArrowRightLine className="h-5 w-5 text-primary" />
                    <span>{destination.split(" ")[0]}</span>
                  </>
                ) : (
                  <>
                    <span>{origin.split(" ")[0]}</span>
                    <RiArrowRightLine className="h-5 w-5 text-primary" />
                    <span>{destination.split(" ")[0]}</span>
                  </>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 font-medium">
                {!isHubSchedule && (
                  <span className="flex items-center gap-1">
                    <RiPlaneLine className="h-3.5 w-3.5 transform rotate-45" />
                    {origin.includes("(")
                      ? origin.substring(origin.indexOf("("))
                      : origin}
                  </span>
                )}
                <span className="text-zinc-300">|</span>
                <span className="flex items-center gap-1">
                  <RiPlaneLine className="h-3.5 w-3.5 transform rotate-90" />
                  {destination.includes("(")
                    ? destination.substring(destination.indexOf("("))
                    : destination}
                </span>
                {isHubSchedule ? (
                  <>
                    <span className="text-zinc-300">|</span>
                    <span className="flex items-center gap-1">
                      <RiCalendarLine className="h-3.5 w-3.5" />
                      Upcoming schedules
                    </span>
                  </>
                ) : (
                  dateStr && (
                    <>
                      <span className="text-zinc-300">|</span>
                      <span className="flex items-center gap-1">
                        <RiCalendarLine className="h-3.5 w-3.5" />
                        {new Date(dateStr).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )
                )}
                <span className="text-zinc-300">|</span>
                <span className="flex items-center gap-1">
                  <RiGroupLine className="h-3.5 w-3.5" />
                  {passengerCount}{" "}
                  {passengerCount === 1 ? "Passenger" : "Passengers"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary">
                {selectedClass} Class
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingSearch(!isEditingSearch)}
                className="gap-1.5 font-semibold cursor-pointer border-primary/20 text-primary hover:bg-primary/5 h-8 text-xs"
              >
                <RiSearchEyeLine className="h-3.5 w-3.5 text-primary" />
                {isEditingSearch ? "Hide Search Bar" : "Modify Search"}
              </Button>
            </div>
          </div>

          {isEditingSearch && (
            <div className="animate-in slide-in-from-top-4 duration-350">
              <SearchPanel className="mt-0" />
            </div>
          )}
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 gap-6">
        {!isHubSchedule && (!origin || !destination) ? (
          // Empty state: show search card directly
          <div className="space-y-12">
            <div className="max-w-md mx-auto text-center space-y-2 py-8">
              <RiPlaneLine className="h-10 w-10 text-primary mx-auto animate-bounce" />
              <h2 className="text-xl font-bold font-heading">Find a Flight</h2>
              <p className="text-xs text-zinc-500">
                Configure origin and destination below to view seating.
              </p>
            </div>
            <div className="max-w-4xl mx-auto pt-16">
              <SearchPanel />
            </div>
          </div>
        ) : upcomingFlights.length === 0 ? (
          // No flights found state
          <Card className="border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-lg bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
            <CardContent className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                <RiPlaneLine className="h-6 w-6 transform rotate-90" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-lg font-bold font-heading">
                  No Flights Scheduled
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {isHubSchedule
                    ? "We currently do not have upcoming arrivals scheduled for this hub."
                    : "We currently do not have matching departures scheduled for the date selected. Please adjust your parameters or check other dates."}
                </p>
              </div>
              <div className="pt-6">
                <Link href="/">
                  <Button size="sm" className="font-semibold cursor-pointer">
                    Modify Search
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Flight Results Board
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Available Departures ({sortedFlights.length})
              </h2>

              <div className="flex flex-wrap items-center gap-4">
                {/* Aircraft Type Filter */}
                {uniqueAircrafts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="aircraft-filter" className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                      Aircraft:
                    </label>
                    <Select
                      value={selectedAircraft}
                      onValueChange={setSelectedAircraft}
                    >
                      <SelectTrigger id="aircraft-filter" aria-label="Aircraft filter" className="w-[140px] h-8 text-xs border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 cursor-pointer rounded-lg px-2">
                        <SelectValue placeholder="All Aircrafts" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                        <SelectItem value="all">All Aircrafts</SelectItem>
                        {uniqueAircrafts.map((ac) => (
                          <SelectItem key={ac} value={ac}>
                            {ac}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sort Option */}
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-filter" className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                    Sort By:
                  </label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sort-filter" aria-label="Sort by" className="w-[180px] h-8 text-xs border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 cursor-pointer rounded-lg px-2">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      <SelectItem value="price-asc">
                        Price: Low to High
                      </SelectItem>
                      <SelectItem value="price-desc">
                        Price: High to Low
                      </SelectItem>
                      <SelectItem value="departs-asc">
                        Departure: Earliest
                      </SelectItem>
                      <SelectItem value="departs-desc">
                        Departure: Latest
                      </SelectItem>
                      <SelectItem value="arrives-asc">
                        Arrival: Earliest
                      </SelectItem>
                      <SelectItem value="duration-asc">
                        Duration: Shortest
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {sortedFlights.map((flight) => {
                const displayOrigin = flight.origin || origin;
                const displayDestination = flight.destination || destination;
                const depDate = new Date(flight.departs_at);
                const depTime = depDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });

                const arrDate = new Date(flight.arrives_at);
                const arrTime = arrDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });

                // Duration Calculation
                const durationMs = arrDate.getTime() - depDate.getTime();
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor(
                  (durationMs % (1000 * 60 * 60)) / (1000 * 60),
                );

                return (
                  <Card
                    key={flight.id}
                    className="overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-zinc-900 hover:shadow-xl transition-all duration-300"
                  >
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 items-center gap-6">
                      {/* 1. Airline / Flight Number (3 Cols) */}
                      <div className="md:col-span-3 space-y-1">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {flight.flight_no}
                        </span>
                        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                          {flight.flight_no}
                        </h3>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <RiPlaneLine className="h-3.5 w-3.5" />
                          {flight.aircraft_type}
                        </p>
                      </div>

                      {/* 2. Departure / Arrival (5 Cols) */}
                      <div className="md:col-span-5 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">
                            DEPART
                          </p>
                          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                            {depTime}
                          </p>
                          <p className="text-xs text-zinc-500 font-medium">
                            {displayOrigin.split(" ")[0]}
                          </p>
                        </div>

                        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
                          <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                            <RiTimerLine className="h-3 w-3" />
                            {hours}h {minutes}m
                          </span>
                          <div className="relative w-full border-t border-dashed border-zinc-300 dark:border-zinc-700 my-1.5">
                            <RiPlaneLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 transform rotate-90" />
                          </div>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-green-500">
                            Non-Stop
                          </span>
                        </div>

                        <div className="space-y-0.5 text-right">
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">
                            ARRIVE
                          </p>
                          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                            {arrTime}
                          </p>
                          <p className="text-xs text-zinc-500 font-medium">
                            {displayDestination.split(" ")[0]}
                          </p>
                        </div>
                      </div>

                      {/* 3. Pricing (2 Cols) */}
                      <div className="md:col-span-2 text-left md:text-right">
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                          Base Ticket Price
                        </p>
                        <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
                          ₹{Number(flight.base_price).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          Class seats vary
                        </p>
                      </div>

                      {/* 4. Action (2 Cols) */}
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          onClick={() => {
                            // Direct check from localStorage to avoid any race condition before store hydration finishes
                            let isLoggedOut = false;
                            if (typeof window !== "undefined") {
                              const stored = localStorage.getItem("flygo-user-storage");
                              if (stored) {
                                try {
                                  const parsed = JSON.parse(stored);
                                  if (!parsed.state?.user) {
                                    isLoggedOut = true;
                                  }
                                } catch (e) {
                                  isLoggedOut = true;
                                }
                              } else {
                                isLoggedOut = true;
                              }
                            }
                            
                            if (isLoggedOut || !user) {
                              const targetUrl = window.location.pathname + window.location.search;
                              router.push(`/auth/login?next=${encodeURIComponent(targetUrl)}`);
                              return;
                            }
                            setSelectedFlight(flight);
                            setSelectedSeat(null);
                            setBookingStep("seating");
                          }}
                          className="w-full md:w-auto font-bold px-6 shadow-md shadow-primary/10 cursor-pointer"
                        >
                          Select Cabin
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Visual Seat Selection Overlay Modal */}
      {activeFlight && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
              <div className="space-y-0.5">
                <h3 className="text-xl font-bold font-heading text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                  Visual Seating Map &amp; Traveler Locks
                </h3>
                <p className="text-xs text-zinc-500">
                  {activeFlight.flight_no} • {activeFlight.origin.split(" ")[0]}{" "}
                  to {activeFlight.destination.split(" ")[0]}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFlight(null);
                  setBookingStep("search");
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                Close Selection ✖
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-grow">
              <SeatMapContainer
                key={activeFlight.id}
                flightId={activeFlight.id}
                flightNo={activeFlight.flight_no}
                basePrice={Number(activeFlight.base_price)}
                origin={activeFlight.origin}
                destination={activeFlight.destination}
                onClose={() => {
                  setSelectedFlight(null);
                  setBookingStep("search");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
