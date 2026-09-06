"use client";

import * as React from "react";
import { type SeatClass } from "@/store/useFlightStore";

interface SeatTooltipProps {
  open: boolean;
  seatNumber: string;
  seatClass: SeatClass;
  extraFee: number;
}

const formatSeatClass = (seatClass: SeatClass) => {
  if (seatClass === "first") return "First";
  if (seatClass === "business") return "Business";
  return "Economy";
};

const formatFee = (fee: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(fee);

export function SeatTooltip({
  open,
  seatNumber,
  seatClass,
  extraFee,
}: SeatTooltipProps) {
  if (!open) return null;

  return (
    <div className="absolute z-20 -top-2 left-1/2 -translate-x-1/2 -translate-y-full">
      <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] text-white shadow-xl whitespace-nowrap">
        <div className="font-semibold">Seat {seatNumber}</div>
        <div className="text-zinc-200">
          {formatSeatClass(seatClass)} • Extra fee: {formatFee(extraFee)}
        </div>
      </div>
      <div className="mx-auto h-2 w-2 -translate-y-1/2 rotate-45 border border-zinc-800 bg-zinc-900" />
    </div>
  );
}
