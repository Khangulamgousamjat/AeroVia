"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SeatTooltip } from "@/components/seat-tooltip";
import { type Seat } from "@/store/useFlightStore";
import {
  RiPlaneLine,
  RiLoader4Line,
  RiAlertFill,
  RiLockLine,
} from "@remixicon/react";

interface SeatMapProps {
  flightNo: string;
  seats: Seat[];
  isLoading: boolean;
  fetchError: string | null;
  selectedSeatIds: string[];
  yourSeatIds: string[];
  onSelectSeat: (seat: Seat) => void;
}

const formatSeatClass = (seatClass: Seat["class"]) => {
  if (seatClass === "first") return "First";
  if (seatClass === "business") return "Business";
  return "Economy";
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

export function SeatMap({
  flightNo,
  seats,
  isLoading,
  fetchError,
  selectedSeatIds,
  yourSeatIds,
  onSelectSeat,
}: SeatMapProps) {
  const [openTooltipSeatId, setOpenTooltipSeatId] = React.useState<
    string | null
  >(null);

  const selectedSeatSet = React.useMemo(
    () => new Set(selectedSeatIds),
    [selectedSeatIds],
  );
  const yourSeatSet = React.useMemo(
    () => new Set(yourSeatIds),
    [yourSeatIds],
  );

  React.useEffect(() => {
    if (!openTooltipSeatId) return;
    const seat = seats.find((s) => s.id === openTooltipSeatId);
    if (!seat || seat.is_available) {
      setOpenTooltipSeatId(null);
    }
  }, [openTooltipSeatId, seats]);

  const groupedRows = React.useMemo(() => {
    const rows: Record<number, Seat[]> = {};
    seats.forEach((seat) => {
      const rowNum = parseSeatParts(seat.seat_number).row;
      if (!rows[rowNum]) {
        rows[rowNum] = [];
      }
      rows[rowNum].push(seat);
    });
    Object.values(rows).forEach((rowSeats) => {
      rowSeats.sort((a, b) =>
        parseSeatParts(a.seat_number).letter.localeCompare(
          parseSeatParts(b.seat_number).letter,
        ),
      );
    });
    return rows;
  }, [seats]);

  const getSeatButtonClasses = (
    seat: Seat,
    isSelected: boolean,
    isYourSeat: boolean,
    sizeClass: string,
  ) =>
    cn(
      sizeClass,
      "rounded-md font-bold transition-all flex flex-col items-center justify-center border relative",
      isYourSeat
        ? "bg-sky-500/20 border-sky-500 text-sky-600 dark:text-sky-400 cursor-not-allowed"
        : !seat.is_available
          ? "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
          : isSelected
            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
            : seat.class === "first"
              ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30 text-amber-600 hover:scale-105 cursor-pointer"
              : seat.class === "business"
                ? "bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:scale-105 cursor-pointer"
                : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:scale-105 cursor-pointer",
    );

  return (
    <div className="lg:col-span-7 flex flex-col h-full border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      <div className="bg-zinc-200 dark:bg-zinc-800 py-3 text-center border-b border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center relative">
        <div className="absolute -top-3 w-16 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-t-full" />
        <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
          <RiPlaneLine className="h-4 w-4" />
          Flight {flightNo} Cabin Layout
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 py-2.5 px-4 bg-white dark:bg-zinc-950 border-b border-zinc-200/50 dark:border-zinc-800/50 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500" />
          <span className="text-zinc-500 font-medium">First</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-purple-500/20 border border-purple-500" />
          <span className="text-zinc-500 font-medium">Business</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500" />
          <span className="text-zinc-500 font-medium">Economy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-sky-500/20 border border-sky-500" />
          <span className="text-zinc-500 font-medium">Your Seat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-zinc-800 border border-zinc-900 dark:border-zinc-700 flex items-center justify-center text-[8px] text-zinc-400">
            ✖
          </span>
          <span className="text-zinc-500 font-medium">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary text-white flex items-center justify-center text-[8px]" />
          <span className="text-zinc-700 dark:text-zinc-300 font-bold">
            Selected
          </span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-6 py-8 flex flex-col items-center select-none bg-zinc-100/50 dark:bg-zinc-950/20 relative">
        <div className="absolute top-[40%] -left-6 w-8 h-28 bg-zinc-300/40 dark:bg-zinc-800/40 rounded-r-3xl pointer-events-none" />
        <div className="absolute top-[40%] -right-6 w-8 h-28 bg-zinc-300/40 dark:bg-zinc-800/40 rounded-l-3xl pointer-events-none" />

        {isLoading ? (
          <div className="h-full flex items-center justify-center flex-col gap-2">
            <RiLoader4Line className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs text-zinc-400 font-medium">
              Fetching dynamic seat state...
            </p>
          </div>
        ) : fetchError ? (
          <div className="h-full flex items-center justify-center flex-col gap-2 text-center px-6">
            <RiAlertFill className="h-8 w-8 text-destructive" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
              Unable to load seat map
            </p>
            <p className="text-xs text-zinc-400 font-medium">{fetchError}</p>
          </div>
        ) : seats.length === 0 ? (
          <div className="h-full flex items-center justify-center flex-col gap-2 text-center px-6">
            <RiPlaneLine className="h-8 w-8 text-zinc-300" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
              No seats found for this flight
            </p>
            <p className="text-xs text-zinc-400 font-medium">
              Seat inventory has not been generated yet.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
              <span className="w-4" />
              <div className="flex-grow flex justify-center gap-2">
                <div className="flex gap-2">
                  {["A", "B"].map((l) => (
                    <span
                      key={l}
                      className="h-5 w-9 sm:w-10 flex items-center justify-center text-[10px] font-bold text-zinc-400"
                    >
                      {l}
                    </span>
                  ))}
                </div>
                <div className="w-12 h-5" />
                <div className="flex gap-2">
                  {["E", "F"].map((l) => (
                    <span
                      key={l}
                      className="h-5 w-9 sm:w-10 flex items-center justify-center text-[10px] font-bold text-zinc-400"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <span className="w-4" />
            </div>
            {Object.keys(groupedRows).map((rowStr) => {
              const rowNum = parseInt(rowStr);
              const rowSeats = groupedRows[rowNum];
              const isPremiumClass = rowNum <= 6;

              return (
                <div
                  key={rowNum}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-[10px] font-bold text-zinc-400 w-4 text-center">
                    {rowNum}
                  </span>

                  <div className="flex-grow flex justify-center gap-2">
                    {isPremiumClass ? (
                      <>
                        <div className="flex gap-2">
                          {rowSeats.slice(0, 2).map((seat) => {
                            const isSelected = selectedSeatSet.has(seat.id);
                            const isYourSeat = yourSeatSet.has(seat.id);
                            const isOccupied = !seat.is_available;
                            const tooltipOpen =
                              isOccupied && openTooltipSeatId === seat.id;
                            const handleSeatClick = () => {
                              if (seat.is_available) {
                                onSelectSeat(seat);
                                setOpenTooltipSeatId(null);
                              } else {
                                setOpenTooltipSeatId((prev) =>
                                  prev === seat.id ? null : seat.id,
                                );
                              }
                            };
                            const seatState = isYourSeat
                              ? "your seat"
                              : isOccupied
                                ? "booked"
                                : isSelected
                                  ? "selected"
                                  : "available";
                            return (
                              <button
                                key={seat.id}
                                type="button"
                                onClick={handleSeatClick}
                                onMouseEnter={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onMouseLeave={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                onFocus={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onBlur={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                aria-disabled={!seat.is_available}
                                className={getSeatButtonClasses(
                                  seat,
                                  isSelected,
                                  isYourSeat,
                                  "h-9 w-9 sm:h-10 sm:w-10 text-[10px]",
                                )}
                                aria-label={`Seat ${seat.seat_number}, ${formatSeatClass(
                                  seat.class,
                                )} class, ${seatState}, extra fee ₹${Number(
                                  seat.extra_fee,
                                ).toLocaleString("en-IN")}`}
                              >
                                {parseSeatParts(seat.seat_number).letter}
                                {isOccupied && (
                                  <RiLockLine className="h-2 w-2 text-zinc-400 mt-0.5" />
                                )}
                                {isOccupied && (
                                  <SeatTooltip
                                    open={tooltipOpen}
                                    seatNumber={seat.seat_number}
                                    seatClass={seat.class}
                                    extraFee={Number(seat.extra_fee)}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="w-12 h-9 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-zinc-300 tracking-wider">
                            AISLE
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {rowSeats.slice(2, 4).map((seat) => {
                            const isSelected = selectedSeatSet.has(seat.id);
                            const isYourSeat = yourSeatSet.has(seat.id);
                            const isOccupied = !seat.is_available;
                            const tooltipOpen =
                              isOccupied && openTooltipSeatId === seat.id;
                            const handleSeatClick = () => {
                              if (seat.is_available) {
                                onSelectSeat(seat);
                                setOpenTooltipSeatId(null);
                              } else {
                                setOpenTooltipSeatId((prev) =>
                                  prev === seat.id ? null : seat.id,
                                );
                              }
                            };
                            const seatState = isYourSeat
                              ? "your seat"
                              : isOccupied
                                ? "booked"
                                : isSelected
                                  ? "selected"
                                  : "available";
                            return (
                              <button
                                key={seat.id}
                                type="button"
                                onClick={handleSeatClick}
                                onMouseEnter={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onMouseLeave={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                onFocus={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onBlur={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                aria-disabled={!seat.is_available}
                                className={getSeatButtonClasses(
                                  seat,
                                  isSelected,
                                  isYourSeat,
                                  "h-9 w-9 sm:h-10 sm:w-10 text-[10px]",
                                )}
                                aria-label={`Seat ${seat.seat_number}, ${formatSeatClass(
                                  seat.class,
                                )} class, ${seatState}, extra fee ₹${Number(
                                  seat.extra_fee,
                                ).toLocaleString("en-IN")}`}
                              >
                                {parseSeatParts(seat.seat_number).letter}
                                {isOccupied && (
                                  <RiLockLine className="h-2 w-2 text-zinc-400 mt-0.5" />
                                )}
                                {isOccupied && (
                                  <SeatTooltip
                                    open={tooltipOpen}
                                    seatNumber={seat.seat_number}
                                    seatClass={seat.class}
                                    extraFee={Number(seat.extra_fee)}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-1.5">
                          {rowSeats.slice(0, 3).map((seat) => {
                            const isSelected = selectedSeatSet.has(seat.id);
                            const isYourSeat = yourSeatSet.has(seat.id);
                            const isOccupied = !seat.is_available;
                            const tooltipOpen =
                              isOccupied && openTooltipSeatId === seat.id;
                            const handleSeatClick = () => {
                              if (seat.is_available) {
                                onSelectSeat(seat);
                                setOpenTooltipSeatId(null);
                              } else {
                                setOpenTooltipSeatId((prev) =>
                                  prev === seat.id ? null : seat.id,
                                );
                              }
                            };
                            const seatState = isYourSeat
                              ? "your seat"
                              : isOccupied
                                ? "booked"
                                : isSelected
                                  ? "selected"
                                  : "available";
                            return (
                              <button
                                key={seat.id}
                                type="button"
                                onClick={handleSeatClick}
                                onMouseEnter={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onMouseLeave={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                onFocus={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onBlur={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                aria-disabled={!seat.is_available}
                                className={getSeatButtonClasses(
                                  seat,
                                  isSelected,
                                  isYourSeat,
                                  "h-9 w-9 sm:h-10 sm:w-10 text-[9px] sm:text-[10px]",
                                )}
                                aria-label={`Seat ${seat.seat_number}, ${formatSeatClass(
                                  seat.class,
                                )} class, ${seatState}, extra fee ₹${Number(
                                  seat.extra_fee,
                                ).toLocaleString("en-IN")}`}
                              >
                                {parseSeatParts(seat.seat_number).letter}
                                {isOccupied && (
                                  <RiLockLine className="h-2 w-2 text-zinc-400 mt-0.5" />
                                )}
                                {isOccupied && (
                                  <SeatTooltip
                                    open={tooltipOpen}
                                    seatNumber={seat.seat_number}
                                    seatClass={seat.class}
                                    extraFee={Number(seat.extra_fee)}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="w-8 h-8" />

                        <div className="flex gap-1.5">
                          {rowSeats.slice(3, 6).map((seat) => {
                            const isSelected = selectedSeatSet.has(seat.id);
                            const isYourSeat = yourSeatSet.has(seat.id);
                            const isOccupied = !seat.is_available;
                            const tooltipOpen =
                              isOccupied && openTooltipSeatId === seat.id;
                            const handleSeatClick = () => {
                              if (seat.is_available) {
                                onSelectSeat(seat);
                                setOpenTooltipSeatId(null);
                              } else {
                                setOpenTooltipSeatId((prev) =>
                                  prev === seat.id ? null : seat.id,
                                );
                              }
                            };
                            const seatState = isYourSeat
                              ? "your seat"
                              : isOccupied
                                ? "booked"
                                : isSelected
                                  ? "selected"
                                  : "available";
                            return (
                              <button
                                key={seat.id}
                                type="button"
                                onClick={handleSeatClick}
                                onMouseEnter={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onMouseLeave={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                onFocus={() =>
                                  isOccupied && setOpenTooltipSeatId(seat.id)
                                }
                                onBlur={() =>
                                  isOccupied &&
                                  setOpenTooltipSeatId((prev) =>
                                    prev === seat.id ? null : prev,
                                  )
                                }
                                aria-disabled={!seat.is_available}
                                className={getSeatButtonClasses(
                                  seat,
                                  isSelected,
                                  isYourSeat,
                                  "h-9 w-9 sm:h-10 sm:w-10 text-[9px] sm:text-[10px]",
                                )}
                                aria-label={`Seat ${seat.seat_number}, ${formatSeatClass(
                                  seat.class,
                                )} class, ${seatState}, extra fee ₹${Number(
                                  seat.extra_fee,
                                ).toLocaleString("en-IN")}`}
                              >
                                {parseSeatParts(seat.seat_number).letter}
                                {isOccupied && (
                                  <RiLockLine className="h-2 w-2 text-zinc-400 mt-0.5" />
                                )}
                                {isOccupied && (
                                  <SeatTooltip
                                    open={tooltipOpen}
                                    seatNumber={seat.seat_number}
                                    seatClass={seat.class}
                                    extraFee={Number(seat.extra_fee)}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-zinc-400 w-4 text-center">
                    {rowNum}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
