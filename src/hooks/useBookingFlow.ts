"use client";

import * as React from "react";
import { toast } from "sonner";
import { bookSeats } from "@/app/actions/book-seat";
import {
  type BookingStep,
  type PassengerForm,
  type Seat,
  useFlightStore,
} from "@/store/useFlightStore";
import { useStoreHydration } from "@/store/useStoreHydration";
import { useUserStore } from "@/store/useUserStore";

interface BookingResult {
  booking_id: string;
  pnr_code: string;
  total_price: number;
  departs_at?: string;
}

interface UseBookingFlowParams {
  flightId: string;
  flightNo: string;
  origin: string;
  destination: string;
  refreshSeats: () => Promise<void>;
  refreshYourSeats: () => Promise<void>;
}

interface UseBookingFlowResult {
  passengers: PassengerForm[];
  selectedSeats: Seat[];
  passengerCount: number;
  bookingStep: BookingStep;
  userFullName?: string;
  hasUser: boolean;
  formErrors: { [key: string]: string };
  submitError: string | null;
  isSubmitting: boolean;
  bookingSuccess: BookingResult[] | null;
  activeTicketIndex: number;
  updatePassenger: (
    index: number,
    field: "fullName" | "passportNo" | "nationality" | "dob",
    value: string,
  ) => void;
  setActiveTicketIndex: React.Dispatch<React.SetStateAction<number>>;
  handleConfirmBooking: (event: React.FormEvent) => Promise<void>;
  clearSubmitError: () => void;
  resetBookingFlow: () => void;
}

const emptyPassenger = (): PassengerForm => ({
  fullName: "",
  passportNo: "",
  nationality: "",
  dob: "",
});

export function useBookingFlow({
  flightId,
  flightNo,
  origin,
  destination,
  refreshSeats,
  refreshYourSeats,
}: UseBookingFlowParams): UseBookingFlowResult {
  const storePassengerCount = useStoreHydration(
    useFlightStore,
    (state) => state.searchState.passengerCount,
  );
  const passengerCount =
    (storePassengerCount !== undefined ? storePassengerCount : 1) || 1;

  const storeSelectedSeats = useStoreHydration(
    useFlightStore,
    (state) => state.selectedSeats,
  );
  const selectedSeats = React.useMemo(
    () => storeSelectedSeats ?? [],
    [storeSelectedSeats],
  );

  const storePassengerForms = useStoreHydration(
    useFlightStore,
    (state) => state.passengerForms,
  );

  const storeBookingStep = useStoreHydration(
    useFlightStore,
    (state) => state.bookingStep,
  );
  const bookingStep = storeBookingStep ?? "seating";

  const storeUser = useStoreHydration(useUserStore, (state) => state.user);
  const user = storeUser ?? null;

  const addCachedBooking = useUserStore((state) => state.addCachedBooking);
  const setBookingStep = useFlightStore((state) => state.setBookingStep);
  const setSelectedSeats = useFlightStore((state) => state.setSelectedSeats);
  const setPassengerForms = useFlightStore((state) => state.setPassengerForms);
  const resetBookingFlow = useFlightStore((state) => state.resetBookingFlow);

  const [passengers, setPassengers] = React.useState<PassengerForm[]>(() =>
    Array.from({ length: passengerCount }, () => emptyPassenger()),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [bookingSuccess, setBookingSuccess] = React.useState<
    BookingResult[] | null
  >(null);
  const [activeTicketIndex, setActiveTicketIndex] = React.useState(0);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [formErrors, setFormErrors] = React.useState<{ [key: string]: string }>(
    {},
  );

  React.useEffect(() => {
    setPassengers((prev) =>
      Array.from(
        { length: passengerCount },
        (_, i) => prev[i] ?? emptyPassenger(),
      ),
    );
  }, [passengerCount]);

  React.useEffect(() => {
    if (storePassengerForms && storePassengerForms.length > 0) {
      setPassengers((prev) =>
        Array.from({ length: passengerCount }, (_, i) => ({
          fullName: storePassengerForms[i]?.fullName || prev[i]?.fullName || "",
          passportNo: prev[i]?.passportNo || "",
          nationality:
            storePassengerForms[i]?.nationality || prev[i]?.nationality || "",
          dob: storePassengerForms[i]?.dob || prev[i]?.dob || "",
        })),
      );
    }
  }, [passengerCount, storePassengerForms]);

  React.useEffect(() => {
    if (!user || passengers[0]?.fullName) return;
    setPassengers((prev) => {
      const updated = [...prev];
      if (updated[0]) {
        updated[0] = { ...updated[0], fullName: user.full_name || "" };
      }
      return updated;
    });
  }, [passengers, user]);

  const clearSubmitError = React.useCallback(() => {
    setSubmitError(null);
  }, []);

  const updatePassenger = (
    index: number,
    field: "fullName" | "passportNo" | "nationality" | "dob",
    value: string,
  ) => {
    const updated = [...passengers];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setPassengers(updated);
      setPassengerForms(updated);
    }
  };

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    passengers.forEach((p, i) => {
      const prefix = passengerCount > 1 ? `p${i + 1}_` : "";
      if (!p.fullName.trim())
        errs[`${prefix}fullName`] = `Passenger ${i + 1}: name is required.`;
      if (!p.passportNo.trim())
        errs[`${prefix}passportNo`] =
          `Passenger ${i + 1}: passport number is required.`;
      if (!p.nationality.trim())
        errs[`${prefix}nationality`] =
          `Passenger ${i + 1}: nationality is required.`;
      if (!p.dob)
        errs[`${prefix}dob`] = `Passenger ${i + 1}: date of birth is required.`;
    });
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirmBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (selectedSeats.length !== passengerCount) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const bookings = passengers.map((p, i) => ({
        seatId: selectedSeats[i].id,
        fullName: p.fullName,
        passportNo: p.passportNo,
        nationality: p.nationality,
        dob: p.dob,
      }));

      const result = await bookSeats({
        flightId,
        bookings,
      });

      if (result.error) {
        setSelectedSeats([]);
        setBookingStep("seating");
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      const dataList = (result.data || []) as BookingResult[];

      await refreshSeats();
      await refreshYourSeats();

      dataList.forEach((data, index) => {
        const seat = selectedSeats[index];
        const passenger = passengers[index];
        const newBooking = {
          id: data.booking_id,
          pnr_code: data.pnr_code,
          total_price: data.total_price,
          status: "confirmed" as const,
          created_at: new Date().toISOString(),
          flight: {
            id: flightId,
            flight_no: flightNo,
            origin,
            destination,
            departs_at: data.departs_at || new Date().toISOString(),
          },
          passenger: {
            full_name: passenger?.fullName,
            nationality: passenger?.nationality,
            dob: passenger?.dob,
          },
          seat: {
            seat_number: seat?.seat_number,
            class: seat?.class,
          },
        };
        addCachedBooking(newBooking);
      });

      setBookingSuccess(dataList);
      setBookingStep("confirmation");
      setActiveTicketIndex(0);
      setIsSubmitting(false);

      const pnrList = dataList.map((d) => d.pnr_code).filter(Boolean).join(", ");
      toast.success("Booking Confirmed!", {
        description: `PNR: ${pnrList || "Confirmed"}. Your luxury visual seat booking is secure.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during visual ticketing.";
      setSelectedSeats([]);
      setBookingStep("seating");
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  return {
    passengers,
    selectedSeats,
    passengerCount,
    bookingStep,
    userFullName: user?.full_name,
    hasUser: Boolean(user),
    formErrors,
    submitError,
    isSubmitting,
    bookingSuccess,
    activeTicketIndex,
    updatePassenger,
    setActiveTicketIndex,
    handleConfirmBooking,
    clearSubmitError,
    resetBookingFlow,
  };
}
