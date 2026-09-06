"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { type Seat, useFlightStore } from "@/store/useFlightStore";
import { useStoreHydration } from "@/store/useStoreHydration";

interface UseSeatMapParams {
  flightId: string;
}

interface UseSeatMapResult {
  seats: Seat[];
  isLoading: boolean;
  fetchError: string | null;
  selectedSeats: Seat[];
  passengerCount: number;
  yourSeatIds: string[];
  handleSelectSeat: (seat: Seat) => void;
  refreshSeats: (showLoading?: boolean) => Promise<void>;
  refreshYourSeats: () => Promise<void>;
}

type BookingSeatRow = {
  seat_id: string | null;
  seats?: { id: string | null } | Array<{ id: string | null }> | null;
};

const parseSeatParts = (seatNumber: string) => {
  const match = seatNumber.match(/^(\d+)([A-Za-z]+)$/);
  return {
    row: match ? Number(match[1]) : Number.parseInt(seatNumber, 10),
    letter: match
      ? match[2].toUpperCase()
      : seatNumber.replace(/\d/g, "").toUpperCase(),
  };
};

export function useSeatMap({ flightId }: UseSeatMapParams): UseSeatMapResult {
  const [seats, setSeats] = React.useState<Seat[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [yourSeatIds, setYourSeatIds] = React.useState<string[]>([]);

  const storeSelectedSeats = useStoreHydration(
    useFlightStore,
    (state) => state.selectedSeats,
  );
  const selectedSeats = React.useMemo(
    () => storeSelectedSeats ?? [],
    [storeSelectedSeats],
  );

  const storePassengerCount = useStoreHydration(
    useFlightStore,
    (state) => state.searchState.passengerCount,
  );
  const passengerCount =
    (storePassengerCount !== undefined ? storePassengerCount : 1) || 1;

  const setSelectedSeats = useFlightStore((state) => state.setSelectedSeats);
  const setBookingStep = useFlightStore((state) => state.setBookingStep);

  const refreshSeats = React.useCallback(
    async (showLoading = false) => {
      const supabase = createClient();

      if (showLoading) {
        setIsLoading(true);
      }

      setFetchError(null);
      const { data, error } = await supabase
        .from("seats")
        .select("id, flight_id, seat_number, class, is_available, extra_fee")
        .eq("flight_id", flightId)
        .order("seat_number", { ascending: true });

      if (error) {
        setSeats([]);
        setFetchError(error.message);
      } else {
        const sorted = ([...(data || [])] as Seat[]).sort((a, b) => {
          const seatA = parseSeatParts(a.seat_number);
          const seatB = parseSeatParts(b.seat_number);
          if (seatA.row !== seatB.row) return seatA.row - seatB.row;
          return seatA.letter.localeCompare(seatB.letter);
        });
        setSeats(sorted);
      }

      if (showLoading) {
        setIsLoading(false);
      }
    },
    [flightId],
  );

  const refreshYourSeats = React.useCallback(async () => {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setYourSeatIds([]);
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("seat_id, seats(id)")
      .eq("flight_id", flightId)
      .eq("user_id", authData.user.id)
      .neq("status", "cancelled");

    if (error) {
      return;
    }

    const seatIds = (data as BookingSeatRow[] | null | undefined)
      ?.map((row) => {
        if (row.seat_id) return row.seat_id;
        const joinedSeat = Array.isArray(row.seats)
          ? row.seats[0]?.id
          : row.seats?.id;
        return joinedSeat ?? null;
      })
      .filter((seatId): seatId is string => Boolean(seatId));

    setYourSeatIds(seatIds ?? []);
  }, [flightId]);

  const handleSelectSeat = React.useCallback(
    (seat: Seat) => {
      if (!seat.is_available) return;
      const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);
      let nextSeats = [...selectedSeats];
      if (isAlreadySelected) {
        nextSeats = nextSeats.filter((s) => s.id !== seat.id);
      } else {
        if (nextSeats.length >= passengerCount) {
          nextSeats.shift();
        }
        nextSeats.push(seat);
      }
      setSelectedSeats(nextSeats);
      if (nextSeats.length === passengerCount) {
        setBookingStep("passenger");
      } else {
        setBookingStep("seating");
      }
    },
    [passengerCount, selectedSeats, setBookingStep, setSelectedSeats],
  );

  React.useEffect(() => {
    setSelectedSeats([]);
    setBookingStep("seating");
  }, [flightId, setBookingStep, setSelectedSeats]);

  React.useEffect(() => {
    void refreshSeats(true);
    void refreshYourSeats();
  }, [refreshSeats, refreshYourSeats]);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`seats-realtime-${flightId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "seats",
          filter: `flight_id=eq.${flightId}`,
        },
        () => {
          void refreshSeats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flightId, refreshSeats]);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshSeats();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSeats]);

  return {
    seats,
    isLoading,
    fetchError,
    selectedSeats,
    passengerCount,
    yourSeatIds,
    handleSelectSeat,
    refreshSeats,
    refreshYourSeats,
  };
}
