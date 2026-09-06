"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import {
  RiPlaneLine,
  RiTicketLine,
  RiTimerLine,
  RiLoader4Line,
  RiAlertFill,
  RiCheckDoubleLine,
  RiSignalWifiOffLine,
} from "@remixicon/react";
import {
  type CachedBooking,
  type CachedFlight,
  useUserStore,
} from "@/store/useUserStore";
import { useFlightStore } from "@/store/useFlightStore";
import { useStoreHydration } from "@/store/useStoreHydration";
import { cancelBooking } from "@/app/actions/cancel-booking";
import { rescheduleBooking } from "@/app/actions/reschedule-booking";
import { SearchPanel } from "@/components/search-panel";
import { toast } from "sonner";

type RescheduleFlight = Required<
  Pick<
    CachedFlight,
    | "id"
    | "flight_no"
    | "origin"
    | "destination"
    | "departs_at"
    | "arrives_at"
    | "base_price"
    | "status"
  >
>;

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function getTimeUntilDepartureLabel(departsAt: string, now: Date) {
  const departsMs = new Date(departsAt).getTime();

  if (Number.isNaN(departsMs)) {
    return null;
  }

  const diffMs = departsMs - now.getTime();

  if (diffMs <= 0) {
    return "Flight departed";
  }

  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${Math.max(minutes, 1)}m left`;
}

function getCancellationLockMessage(
  flightNo: string | undefined,
  departsAt: string,
  now: Date,
) {
  const departsMs = new Date(departsAt).getTime();

  if (Number.isNaN(departsMs)) {
    return null;
  }

  const diffMs = departsMs - now.getTime();
  const displayFlightNo = flightNo || "This flight";

  if (diffMs <= 0) {
    return `${displayFlightNo} has already departed, so this booking can no longer be cancelled.`;
  }

  if (diffMs <= TWO_HOURS_MS) {
    return `${displayFlightNo} departs in less than 2 hours, so the cancellation window has closed.`;
  }

  return null;
}

export default function BookingsPage() {
  const isHydrated = useStoreHydration(useUserStore, () => true) ?? false;
  const cachedBookings = useUserStore((state) => state.cachedBookings);
  const setCachedBookings = useUserStore((state) => state.setCachedBookings);
  const updateCachedBookingStatus = useUserStore(
    (state) => state.updateCachedBookingStatus,
  );
  const resetBookingFlow = useFlightStore((s) => s.resetBookingFlow);

  const [bookings, setBookings] = React.useState<CachedBooking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(() => new Date());
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cancellation Dialog states
  const [cancellingBooking, setCancellingBooking] =
    React.useState<CachedBooking | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Reschedule Dialog states
  const [reschedulingBooking, setReschedulingBooking] =
    React.useState<CachedBooking | null>(null);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] =
    React.useState(false);
  const [rescheduleFlights, setRescheduleFlights] = React.useState<
    RescheduleFlight[]
  >([]);
  const [selectedRescheduleFlightId, setSelectedRescheduleFlightId] =
    React.useState("");
  const [isLoadingRescheduleFlights, setIsLoadingRescheduleFlights] =
    React.useState(false);
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const [rescheduleError, setRescheduleError] = React.useState<string | null>(
    null,
  );

  // Fetch traveler bookings from Supabase
  const fetchBookings = React.useCallback(async () => {
    if (!navigator.onLine) {
      setIsLoading(false);
      return;
    }
    // Only show page loading spinner if we don't have any cached bookings to show first
    if (cachedBookings.length === 0 && bookings.length === 0) {
      setIsLoading(true);
    }
    setErrorMsg(null);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          flight_id,
          status,
          booked_at,
          total_price,
          pnr_code,
          seat_id,
          seats (
            seat_number,
            class
          ),
          flights (
            id,
            flight_no,
            origin,
            destination,
            departs_at,
            arrives_at,
            aircraft_type
          ),
          passengers (
            full_name,
            passport_no,
            nationality
          )
        `,
        )
        .order("booked_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
      } else {
        const bookingsList = (data || []) as CachedBooking[];
        setBookings(bookingsList);
        setCachedBookings(bookingsList);
      }
    } catch {
      setErrorMsg("Failed to load booking itineraries. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, [cachedBookings.length, bookings.length, setCachedBookings]);

  // Hydrate local bookings from Zustand cache immediately on mount
  React.useEffect(() => {
    if (isHydrated && cachedBookings.length > 0 && bookings.length === 0) {
      setBookings(cachedBookings);
      setIsLoading(false);
    }
  }, [isHydrated, cachedBookings, bookings.length]);

  // Revalidate from server
  React.useEffect(() => {
    if (isHydrated) {
      fetchBookings();
    }
  }, [isHydrated, fetchBookings]);

  // Handle Cancellation via server action (FIX 4B)
  const handleCancelConfirm = async () => {
    if (!cancellingBooking) return;

    setIsCancelling(true);
    setCancelError(null);

    const result = await cancelBooking(cancellingBooking.id);

    if (result.error) {
      setCancelError(result.error);
      setIsCancelling(false);
    } else {
      setIsCancelling(false);
      setCancellingBooking(null);

      // FIX 5 (F11) — Reset Zustand store after successful cancel
      resetBookingFlow();

      // Instantly update local store cache and local UI state
      updateCachedBookingStatus(cancellingBooking.id, "cancelled");
      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancellingBooking.id ? { ...b, status: "cancelled" } : b,
        ),
      );

      toast.success("Ticket Cancelled", {
        description: "Seat released successfully!",
      });

      fetchBookings();
    }
  };

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  React.useEffect(() => {
    if (!isRescheduleDialogOpen || !reschedulingBooking) {
      return;
    }

    const currentFlight = Array.isArray(reschedulingBooking.flights)
      ? reschedulingBooking.flights[0]
      : reschedulingBooking.flights || reschedulingBooking.flight;

    if (!currentFlight || !reschedulingBooking.flight_id) {
      setRescheduleError("Current flight details are unavailable.");
      setRescheduleFlights([]);
      return;
    }

    let isActive = true;

    const loadRescheduleFlights = async () => {
      setIsLoadingRescheduleFlights(true);
      setRescheduleError(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("flights")
        .select(
          "id, flight_no, origin, destination, departs_at, arrives_at, base_price, status",
        )
        .eq("origin", currentFlight.origin)
        .eq("destination", currentFlight.destination)
        .neq("id", reschedulingBooking.flight_id)
        .eq("status", "scheduled")
        .gt("departs_at", new Date().toISOString())
        .order("departs_at", { ascending: true });

      if (!isActive) {
        return;
      }

      if (error) {
        setRescheduleError(error.message);
        setRescheduleFlights([]);
      } else {
        const nextFlights = (data || []) as RescheduleFlight[];
        setRescheduleFlights(nextFlights);
        setSelectedRescheduleFlightId(nextFlights[0]?.id ?? "");
      }

      setIsLoadingRescheduleFlights(false);
    };

    void loadRescheduleFlights();

    return () => {
      isActive = false;
    };
  }, [isRescheduleDialogOpen, reschedulingBooking]);

  const closeRescheduleDialog = () => {
    setIsRescheduleDialogOpen(false);
    setReschedulingBooking(null);
    setRescheduleFlights([]);
    setSelectedRescheduleFlightId("");
    setIsLoadingRescheduleFlights(false);
    setIsRescheduling(false);
    setRescheduleError(null);
  };

  const handleRescheduleConfirm = async () => {
    if (!reschedulingBooking?.flight_id) {
      setRescheduleError("Current flight details are unavailable.");
      return;
    }

    if (!selectedRescheduleFlightId) {
      setRescheduleError("Select a flight to continue.");
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);

    const result = await rescheduleBooking(
      reschedulingBooking.id,
      selectedRescheduleFlightId,
      reschedulingBooking.flight_id,
    );

    if (result.error) {
      setRescheduleError(result.error);
      setIsRescheduling(false);
      return;
    }

    const selectedFlight = rescheduleFlights.find(
      (flight) => flight.id === selectedRescheduleFlightId,
    );
    const feeCharged = Number(result.feeCharged ?? 0);
    const feeLabel =
      feeCharged > 0
        ? `Fee charged: ₹${feeCharged.toLocaleString("en-IN")}`
        : "No additional fee charged.";

    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === reschedulingBooking.id
          ? {
              ...booking,
              flight_id: selectedRescheduleFlightId,
              status: "rescheduled",
              flights: selectedFlight ?? booking.flights,
            }
          : booking,
      ),
    );

    setCachedBookings((prev) =>
      prev.map((booking) =>
        booking.id === reschedulingBooking.id
          ? {
              ...booking,
              flight_id: selectedRescheduleFlightId,
              status: "rescheduled",
              flights: selectedFlight ?? booking.flights,
            }
          : booking,
      ),
    );

    updateCachedBookingStatus(reschedulingBooking.id, "rescheduled");
    toast.success("Booking Rescheduled", {
      description: feeLabel,
    });
    closeRescheduleDialog();
    fetchBookings();
  };

  const activeRescheduleFlight = reschedulingBooking
    ? Array.isArray(reschedulingBooking.flights)
      ? reschedulingBooking.flights[0]
      : reschedulingBooking.flights || reschedulingBooking.flight
    : null;

  return (
    <div className="grow container mx-auto px-4 md:px-6 py-10 space-y-8 min-h-[75vh]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight font-heading flex items-center gap-2">
            <RiTicketLine className="h-8 w-8 text-primary" />
            Traveler Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            View boarding registers, visual seat locks, and track international
            flight statuses.
          </p>
        </div>
        <Link href="/">
          <Button className="font-semibold shadow-md shadow-primary/10 cursor-pointer">
            <RiPlaneLine className="mr-2 h-4 w-4 transform rotate-45" />
            Book New Flight
          </Button>
        </Link>
      </div>

      {isOffline && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 flex items-center gap-3 text-amber-700 dark:text-amber-400 shadow-sm animate-pulse">
          <RiSignalWifiOffLine className="h-5 w-5 shrink-0" />
          <div className="text-xs font-semibold">
            Offline Mode Active — Displaying your last synced travel itineraries.
          </div>
        </div>
      )}

      {/* Main Listing Panel */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RiLoader4Line className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-zinc-400">
            Loading your flight records...
          </p>
        </div>
      ) : errorMsg ? (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
          {errorMsg}
        </div>
      ) : bookings.length === 0 ? (
        <div className="space-y-12">
          <Card className="border border-dashed border-zinc-200 dark:border-zinc-800 p-16 text-center shadow bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
            <CardContent className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/30 text-zinc-400 flex items-center justify-center mx-auto">
                <RiTicketLine className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h2 className="text-lg font-bold font-heading">
                  You don&apos;t have any bookings
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Book now to create your first visual seat booking and flight
                  itinerary.
                </p>
              </div>
              <div className="pt-4">
                <Link href="/">
                  <Button size="sm" className="font-semibold cursor-pointer">
                    Book Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight font-heading flex items-center gap-2">
                <RiPlaneLine className="h-5 w-5 text-primary transform rotate-45" />
                Search for Flights
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Quickly locate flights to book your visual seat allocation.
              </p>
            </div>
            <SearchPanel className="mt-0" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight font-heading flex items-center gap-2">
            <RiTicketLine className="h-5 w-5 text-primary" />
            Your Active Bookings ({bookings.length})
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {bookings.map((booking) => {
              const flight = Array.isArray(booking.flights)
                ? booking.flights[0]
                : booking.flights || booking.flight;
              const seat = Array.isArray(booking.seats)
                ? booking.seats[0]
                : booking.seats || booking.seat;
              const passenger = booking.passengers?.[0] || booking.passenger;

              const departsAt = flight?.departs_at || new Date().toISOString();
              const arrivesAt =
                flight?.arrives_at ||
                new Date(
                  new Date(departsAt).getTime() + 2 * 60 * 60 * 1000,
                ).toISOString();

              const depDate = new Date(departsAt);
              const depTime = depDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              const depDateFormatted = depDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              const arrDate = new Date(arrivesAt);
              const arrTime = arrDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              const durationMs = arrDate.getTime() - depDate.getTime();
              const hours = Math.floor(durationMs / (1000 * 60 * 60));
              const minutes = Math.floor(
                (durationMs % (1000 * 60 * 60)) / (1000 * 60),
              );

              const isCancelled = booking.status === "cancelled";
              const canReschedule = booking.status === "confirmed" || booking.status === "rescheduled";

              const departsMs = flight?.departs_at
                ? new Date(flight.departs_at).getTime()
                : Number.NaN;
              const isDeparted =
                !Number.isNaN(departsMs) && departsMs <= currentTime.getTime();

              const arrivesMs = arrivesAt ? new Date(arrivesAt).getTime() : Number.NaN;
              const isLanded =
                !Number.isNaN(arrivesMs) && arrivesMs <= currentTime.getTime();

              const travelerName =
                passenger?.full_name?.split(" ")[0] || "Traveler";

              const timeUntilDeparture = !isCancelled
                ? getTimeUntilDepartureLabel(departsAt, currentTime)
                : null;
              const cancellationLockMessage = getCancellationLockMessage(
                flight?.flight_no,
                departsAt,
                currentTime,
              );
              const bookingDate =
                booking.booked_at ||
                booking.created_at ||
                new Date().toISOString();

              return (
                <Card
                  key={booking.id}
                  className={`overflow-hidden border shadow-md bg-white dark:bg-zinc-900 transition-all duration-300 ${
                    isCancelled
                      ? "border-zinc-200/40 dark:border-zinc-800/40 opacity-75"
                      : "border-zinc-200/80 dark:border-zinc-800/80 hover:shadow-lg"
                  }`}
                >
                  {/* Visual Ticket Header */}
                  <div
                    className={`px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${
                      isCancelled
                        ? "bg-zinc-100 dark:bg-zinc-950"
                        : "bg-linear-to-r from-primary/5 to-purple-600/5 border-b border-zinc-100 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        PNR CODE
                      </span>
                      <span className="text-xl font-extrabold tracking-widest text-primary font-mono">
                        {booking.pnr_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-400">
                        Booked:{" "}
                        {new Date(bookingDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          isCancelled
                            ? "bg-destructive/10 border-destructive/20 text-destructive"
                            : "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>

                  {/* Main Content Body */}
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Flight Info (3 Cols) */}
                    <div className="md:col-span-3 space-y-1.5 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-4 md:pb-0 md:pr-6">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                        {flight?.flight_no || "Flight"}
                      </span>
                      <h3 className="text-lg font-bold font-heading text-zinc-900 dark:text-zinc-50">
                        {flight?.flight_no}
                      </h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        <RiPlaneLine className="h-3.5 w-3.5" />
                        {flight?.aircraft_type || "Boeing 737-800"}
                      </p>
                      {timeUntilDeparture && (
                        <p className="text-xs font-semibold text-primary flex items-center gap-1">
                          <RiTimerLine className="h-3.5 w-3.5" />
                          {timeUntilDeparture}
                        </p>
                      )}
                    </div>

                    {/* Route Timeline (5 Cols) */}
                    <div className="md:col-span-5 flex items-center justify-between gap-4 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-4 md:pb-0 md:pr-6">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase">
                          DEPART
                        </p>
                        <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                          {depTime}
                        </p>
                        <p className="text-xs text-zinc-500 font-medium">
                          {flight?.origin?.split(" ")[0]}
                        </p>
                      </div>

                      <div className="flex flex-col items-center justify-center flex-1 px-2 text-center">
                        <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1">
                          <RiTimerLine className="h-3 w-3" />
                          {hours}h {minutes}m
                        </span>
                        <div className="relative w-full border-t border-dashed border-zinc-300 dark:border-zinc-700 my-1.5">
                          <RiPlaneLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 transform rotate-90" />
                        </div>
                        <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">
                          {depDateFormatted}
                        </span>
                      </div>

                      <div className="space-y-0.5 text-right">
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase">
                          ARRIVE
                        </p>
                        <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                          {arrTime}
                        </p>
                        <p className="text-xs text-zinc-500 font-medium">
                          {flight?.destination?.split(" ")[0]}
                        </p>
                      </div>
                    </div>

                    {/* Passenger / Seat Details (2 Cols) */}
                    <div className="md:col-span-2 space-y-2">
                      <div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Passenger
                        </p>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">
                          {passenger?.full_name}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono uppercase">
                          {passenger?.passport_no || "••••••••••"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Seat Allocation
                        </p>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {seat?.seat_number} ({seat?.class} Class)
                        </p>
                      </div>
                    </div>

                    {/* Pricing / Cancellation (2 Cols) */}
                    <div className="md:col-span-2 flex flex-col justify-center items-start md:items-end gap-2 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Fare Paid
                        </p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                          ₹{Number(booking.total_price).toLocaleString("en-IN")}
                        </p>
                      </div>

                      {canReschedule &&
                        (isDeparted ? (
                          <div className="flex w-full flex-col gap-2 md:items-end">
                            <div className="w-full md:w-auto rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-left md:text-right">
                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                                {isLanded ? "Hope you enjoyed your flight" : "Happy Journey"}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                                {isLanded
                                  ? `Hope you enjoyed your flight, ${travelerName}.`
                                  : `Enjoy your flight, ${travelerName}.`}
                              </p>
                              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                {isLanded
                                  ? "Thank you for flying with us."
                                  : "We&apos;re honored to have you on board."}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex w-full flex-col gap-2 md:items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReschedulingBooking(booking);
                                setRescheduleError(null);
                                setRescheduleFlights([]);
                                setSelectedRescheduleFlightId("");
                                setIsRescheduleDialogOpen(true);
                              }}
                              className="w-full md:w-auto text-xs border-primary/20 text-primary hover:bg-primary/5 cursor-pointer"
                            >
                              {booking.status === "rescheduled" ? "Reschedule Again" : "Reschedule"}
                            </Button>

                            {cancellationLockMessage ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast.error("Cancellation Locked", {
                                    description: cancellationLockMessage,
                                  });
                                }}
                                className="w-full md:w-auto text-xs text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20 cursor-pointer"
                              >
                                Cancel Booking
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCancellingBooking(booking);
                                      setCancelError(null);
                                    }}
                                    className="w-full md:w-auto text-xs text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20 cursor-pointer"
                                  >
                                    Cancel Booking
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Cancel this booking?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. Your seat will
                                      be released.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>

                                  {cancelError && (
                                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 font-medium">
                                      <RiAlertFill className="h-4 w-4 shrink-0" />
                                      <span>{cancelError}</span>
                                    </div>
                                  )}

                                  <div className="py-2 text-xs text-zinc-500 dark:text-zinc-400 space-y-1 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                                    <p className="font-bold text-zinc-700 dark:text-zinc-300">
                                      Cancellation Rule Checklist:
                                    </p>
                                    <p>
                                      • Bookings departing in less than 2 hours
                                      are locked and non-refundable.
                                    </p>
                                    <p>
                                      • Once cancelled, the seat map will be
                                      updated instantly for other travelers.
                                    </p>
                                  </div>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="cursor-pointer">
                                      Keep Booking
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleCancelConfirm}
                                      disabled={isCancelling}
                                      className="font-semibold cursor-pointer"
                                    >
                                      {isCancelling ? (
                                        <span className="flex items-center gap-1.5">
                                          <RiLoader4Line className="h-4 w-4 animate-spin" />
                                          Cancelling...
                                        </span>
                                      ) : (
                                        "Confirm Cancel"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-6 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight font-heading flex items-center gap-2">
                <RiPlaneLine className="h-5 w-5 text-primary transform rotate-45" />
                Search for Flights
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Quickly locate flights to book your next visual seat allocation.
              </p>
            </div>
            <SearchPanel className="mt-0" />
          </div>
        </div>
      )}


      <Dialog
        open={isRescheduleDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeRescheduleDialog();
          } else {
            setIsRescheduleDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reschedule booking</DialogTitle>
            <DialogDescription>
              Pick a later scheduled flight on the same route. The current
              booking stays open until you confirm.
            </DialogDescription>
          </DialogHeader>

          {rescheduleError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <RiAlertFill className="h-4 w-4 shrink-0" />
              <span>{rescheduleError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-200/70 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                Current flight
              </p>
              <p className="mt-1">
                {activeRescheduleFlight?.flight_no} · ₹
                {Number(activeRescheduleFlight?.base_price ?? 0).toLocaleString(
                  "en-IN",
                )}
              </p>
              <p>
                {activeRescheduleFlight?.origin} to{" "}
                {activeRescheduleFlight?.destination}
              </p>
            </div>

            {isLoadingRescheduleFlights ? (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200/70 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                <RiLoader4Line className="h-4 w-4 animate-spin text-primary" />
                Loading alternative flights...
              </div>
            ) : rescheduleFlights.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200/70 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                No alternative scheduled flights were found for this route.
              </div>
            ) : (
              <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {rescheduleFlights.map((flight) => {
                  const departsAt = new Date(flight.departs_at);
                  const arrivesAt = new Date(flight.arrives_at);
                  const feeCharged = Math.max(
                    0,
                    Number(flight.base_price) -
                      Number(activeRescheduleFlight?.base_price ?? 0),
                  );
                  const isSelected = selectedRescheduleFlightId === flight.id;

                  return (
                    <button
                      key={flight.id}
                      type="button"
                      onClick={() => setSelectedRescheduleFlightId(flight.id)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-zinc-200/70 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {flight.flight_no}
                            </span>
                            {isSelected && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Departs{" "}
                            {departsAt.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Arrives{" "}
                            {arrivesAt.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            ₹{Number(flight.base_price).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {feeCharged > 0
                              ? `Fee ₹${feeCharged.toLocaleString("en-IN")}`
                              : "No additional fee"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeRescheduleDialog}>
              Close
            </Button>
            <Button
              onClick={handleRescheduleConfirm}
              disabled={
                isRescheduling ||
                !selectedRescheduleFlightId ||
                isLoadingRescheduleFlights
              }
              className="cursor-pointer"
            >
              {isRescheduling ? (
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  Rescheduling...
                </span>
              ) : (
                "Confirm Reschedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
