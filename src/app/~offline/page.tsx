"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RiWifiOffLine, RiPlaneLine, RiRefreshLine } from "@remixicon/react";
import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="grow flex flex-col items-center justify-center min-h-[75vh] px-4 relative bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Background soft glow gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,oklch(0.518_0.253_323.949/0.05),transparent)] dark:bg-[radial-gradient(circle_800px_at_50%_-100px,oklch(0.452_0.211_324.591/0.1),transparent)] pointer-events-none" />
      
      <Card className="max-w-md w-full border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xl text-center overflow-hidden relative z-10">
        {/* Luxury top border color strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-primary to-purple-600" />
        
        <CardContent className="p-8 space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
            <RiWifiOffLine className="h-8 w-8 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight font-heading">
              Connection Lost
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              FlyGo is currently offline. Check your internet connection or try refreshing the page.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/40 dark:border-zinc-800/40 text-left">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <RiPlaneLine className="h-3.5 w-3.5 text-primary transform rotate-45" />
              Offline Features
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You can still view your previously synced bookings and flight itineraries on the dashboard.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleRetry} className="flex-1 font-semibold cursor-pointer">
              <RiRefreshLine className="mr-2 h-4 w-4" />
              Try Reconnecting
            </Button>
            <Link href="/bookings" className="flex-1">
              <Button variant="outline" className="w-full font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                View My Bookings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
