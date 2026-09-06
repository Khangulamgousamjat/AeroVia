"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeatMap } from "@/components/seat-map";
import { cn } from "@/lib/utils";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { useSeatMap } from "@/hooks/useSeatMap";
import {
  RiPlaneLine,
  RiUserLine,
  RiPassportLine,
  RiFlagLine,
  RiCalendarLine,
  RiCheckDoubleLine,
  RiAlertFill,
  RiLoader4Line,
} from "@remixicon/react";

interface SeatMapContainerProps {
  flightId: string;
  flightNo: string;
  basePrice: number;
  origin: string;
  destination: string;
  onClose: () => void;
}

export function SeatMapContainer({
  flightId,
  flightNo,
  basePrice,
  origin,
  destination,
  onClose,
}: SeatMapContainerProps) {
  const {
    seats,
    isLoading,
    fetchError,
    selectedSeats: seatSelections,
    passengerCount,
    yourSeatIds,
    handleSelectSeat,
    refreshSeats,
    refreshYourSeats,
  } = useSeatMap({ flightId });

  const {
    passengers,
    selectedSeats,
    passengerCount: bookingPassengerCount,
    hasUser,
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
  } = useBookingFlow({
    flightId,
    flightNo,
    origin,
    destination,
    refreshSeats,
    refreshYourSeats,
  });

  const effectivePassengerCount = bookingPassengerCount || passengerCount || 1;

  const handleSeatSelection = React.useCallback(
    (seat: Parameters<typeof handleSelectSeat>[0]) => {
      clearSubmitError();
      handleSelectSeat(seat);
    },
    [clearSubmitError, handleSelectSeat],
  );

  if (bookingSuccess) {
    const totalPaid = bookingSuccess.reduce(
      (sum, b) => sum + Number(b.total_price),
      0,
    );
    const activeTicket = bookingSuccess[activeTicketIndex];
    const activeSeat = selectedSeats[activeTicketIndex];
    const activePassenger = passengers[activeTicketIndex];

    return (
      <div className="text-center p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
          <RiCheckDoubleLine className="h-8 w-8 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold font-heading text-zinc-900 dark:text-zinc-50">
            Booking Confirmed!
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            All {effectivePassengerCount} seat locks and passenger boarding
            records have settled atomically.
          </p>
        </div>

        {bookingSuccess.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
            {bookingSuccess.map((ticket, index) => (
              <button
                key={ticket.booking_id ?? index}
                onClick={() => setActiveTicketIndex(index)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                  activeTicketIndex === index
                    ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
                )}
              >
                {passengers[index]?.fullName.split(" ")[0] ||
                  `Passenger ${index + 1}`}{" "}
                ({selectedSeats[index]?.seat_number})
              </button>
            ))}
          </div>
        )}

        <div className="max-w-md mx-auto border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg bg-zinc-50 dark:bg-zinc-900 font-sans relative transition-all duration-300">
          <div className="bg-primary px-6 py-3 text-white text-left flex justify-between items-center">
            <span className="font-bold text-sm tracking-widest">
              {flightNo}
            </span>
            <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
              {activeSeat?.class} Class
            </span>
          </div>
          <div className="p-6 text-left grid grid-cols-2 gap-4 border-b border-dashed border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">
                Passenger
              </p>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                {activePassenger?.fullName}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">
                PNR Code
              </p>
              <p className="text-sm font-extrabold text-primary tracking-widest">
                {activeTicket?.pnr_code}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">
                Route
              </p>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {origin.split(" ")[0]} → {destination.split(" ")[0]}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">
                Seat
              </p>
              <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                {activeSeat?.seat_number}
              </p>
            </div>
          </div>
          <div className="p-4 bg-zinc-100/50 dark:bg-zinc-900/50 text-center flex justify-between px-6 text-xs text-zinc-500">
            <span>
              Ticket Price: ₹
              {Number(activeTicket?.total_price).toLocaleString("en-IN")}
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              Paid - Confirmed
            </span>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-sm flex justify-between items-center">
          <span className="text-zinc-500 font-medium">
            Total Paid ({effectivePassengerCount} Passengers):
          </span>
          <span className="font-extrabold text-zinc-800 dark:text-zinc-100 text-lg">
            ₹{totalPaid.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="pt-4 flex justify-center gap-4">
          <Link href="/bookings">
            <Button
              size="lg"
              className="font-semibold shadow cursor-pointer"
              onClick={() => {
                resetBookingFlow();
                onClose();
              }}
            >
              Go to Dashboard
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              resetBookingFlow();
              onClose();
            }}
            className="font-semibold cursor-pointer"
          >
            Close Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[80vh] overflow-hidden">
      <SeatMap
        flightNo={flightNo}
        seats={seats}
        isLoading={isLoading}
        fetchError={fetchError}
        selectedSeatIds={seatSelections.map((seat) => seat.id)}
        yourSeatIds={yourSeatIds}
        onSelectSeat={handleSeatSelection}
      />

      <div className="lg:col-span-5 h-full overflow-y-auto flex flex-col justify-between p-6 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-white dark:bg-zinc-900 shadow-xl">
        <div className="space-y-6">
          <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h4 className="text-lg font-bold font-heading text-zinc-900 dark:text-zinc-50">
              Reservation Pipeline
            </h4>
            <p className="text-xs text-zinc-500">
              Provide details for visual passenger verification.
            </p>
          </div>

          {selectedSeats.length > 0 ? (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-200">
              <div className="flex justify-between items-center pb-2 border-b border-primary/10">
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Selected {selectedSeats.length} of {effectivePassengerCount}{" "}
                  Seat(s)
                </span>
                {selectedSeats.length < effectivePassengerCount && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 animate-pulse">
                    Select {effectivePassengerCount - selectedSeats.length} more
                  </span>
                )}
              </div>
              <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
                {selectedSeats.map((seat, idx) => (
                  <div
                    key={seat.id}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Passenger {idx + 1}: Seat {seat.seat_number} ({seat.class}
                      )
                    </span>
                    <span className="text-zinc-500">
                      ₹
                      {(basePrice + Number(seat.extra_fee)).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 pt-2 border-t border-dashed border-primary/20">
                <span>Total Visual Fee:</span>
                <span>
                  ₹
                  {selectedSeats
                    .reduce((sum, s) => sum + Number(s.extra_fee), 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                <span>Total Cumulative Price:</span>
                <span>
                  ₹
                  {(
                    basePrice * effectivePassengerCount +
                    selectedSeats.reduce(
                      (sum, s) => sum + Number(s.extra_fee),
                      0,
                    )
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-1.5 text-zinc-400">
              <RiPlaneLine className="h-6 w-6 mx-auto animate-pulse text-zinc-300" />
              <p className="text-xs font-medium">
                Select {effectivePassengerCount} open seat(s) to begin booking.
              </p>
            </div>
          )}

          {selectedSeats.length === effectivePassengerCount &&
            (!hasUser ? (
              <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4 text-center">
                <RiAlertFill className="h-6 w-6 text-destructive mx-auto animate-bounce" />
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-destructive">
                    Authentication Required
                  </h5>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    You must be signed in to purchase tickets and register
                    passenger PNR claims.
                  </p>
                </div>
                <Link
                  href={`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                >
                  <Button
                    size="sm"
                    className="w-full font-semibold mt-2 cursor-pointer"
                  >
                    Sign In to Continue
                  </Button>
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleConfirmBooking}
                className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {submitError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                    <RiAlertFill className="h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {passengers.map((passenger, index) => (
                  <div key={index} className="space-y-4">
                    {effectivePassengerCount > 1 && (
                      <div className="flex items-center gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                        <RiUserLine className="h-4 w-4 text-primary" />
                        <h5 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          Passenger {index + 1}
                          {index === 0 ? " (Primary)" : ""}
                        </h5>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor={`passenger-${index}-name`} className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                        <RiUserLine className="h-3.5 w-3.5" /> Full Name
                      </label>
                      <Input
                        id={`passenger-${index}-name`}
                        placeholder="Passenger full name (matches passport)"
                        value={passenger.fullName}
                        onChange={(e) =>
                          updatePassenger(index, "fullName", e.target.value)
                        }
                        disabled={isSubmitting}
                        className="h-10"
                      />
                      {formErrors[
                        `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}fullName`
                      ] && (
                        <p className="text-xs text-destructive font-medium">
                          {
                            formErrors[
                              `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}fullName`
                            ]
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`passenger-${index}-passport`} className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                        <RiPassportLine className="h-3.5 w-3.5" /> Passport
                        Number
                      </label>
                      <Input
                        id={`passenger-${index}-passport`}
                        placeholder="Z1234567"
                        value={passenger.passportNo}
                        onChange={(e) =>
                          updatePassenger(index, "passportNo", e.target.value)
                        }
                        disabled={isSubmitting}
                        className="h-10 text-xs font-mono uppercase"
                      />
                      {formErrors[
                        `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}passportNo`
                      ] && (
                        <p className="text-xs text-destructive font-medium">
                          {
                            formErrors[
                              `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}passportNo`
                            ]
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`passenger-${index}-nationality`} className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                        <RiFlagLine className="h-3.5 w-3.5" /> Nationality
                      </label>
                      <Input
                        id={`passenger-${index}-nationality`}
                        placeholder="Indian"
                        value={passenger.nationality}
                        onChange={(e) =>
                          updatePassenger(index, "nationality", e.target.value)
                        }
                        disabled={isSubmitting}
                        className="h-10"
                      />
                      {formErrors[
                        `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}nationality`
                      ] && (
                        <p className="text-xs text-destructive font-medium">
                          {
                            formErrors[
                              `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}nationality`
                            ]
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`passenger-${index}-dob`} className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                        <RiCalendarLine className="h-3.5 w-3.5" /> Date of Birth
                      </label>
                      <Input
                        id={`passenger-${index}-dob`}
                        type="date"
                        value={passenger.dob}
                        onChange={(e) =>
                          updatePassenger(index, "dob", e.target.value)
                        }
                        disabled={isSubmitting}
                        className="h-10 text-xs cursor-pointer"
                      />
                      {formErrors[
                        `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}dob`
                      ] && (
                        <p className="text-xs text-destructive font-medium">
                          {
                            formErrors[
                              `${effectivePassengerCount > 1 ? `p${index + 1}_` : ""}dob`
                            ]
                          }
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 mt-4 cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2 justify-center">
                      <RiLoader4Line className="h-5 w-5 animate-spin" />
                      Locking Seats &amp; Booking...
                    </span>
                  ) : (
                    `Purchase Tickets - ₹${Number(
                      basePrice * effectivePassengerCount +
                        selectedSeats.reduce(
                          (sum, s) => sum + Number(s.extra_fee),
                          0,
                        ),
                    ).toLocaleString("en-IN")}`
                  )}
                </Button>
              </form>
            ))}
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between gap-4 mt-6">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={() => {
              resetBookingFlow();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
