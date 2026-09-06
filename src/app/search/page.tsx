// Pure async Server Component — NO 'use client', NO hooks, NO browser client.
// searchParams is a Promise in Next.js 16+ and must be awaited.

import { createClient as createServerClient } from "@/utils/supabase/server"
import { FlightResults } from "@/components/flight-results"
import type { Flight } from "@/store/useFlightStore"

interface SearchPageProps {
  searchParams: Promise<{
    origin?: string
    destination?: string
    date?: string
    class?: string
    passengers?: string
    mode?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  // Await the searchParams Promise (required in Next.js 16)
  const resolvedParams = await searchParams

  const origin        = resolvedParams.origin        ?? ""
  const destination   = resolvedParams.destination   ?? ""
  const date          = resolvedParams.date          ?? ""
  const selectedClass = resolvedParams.class         ?? "economy"
  const passengerCount = parseInt(resolvedParams.passengers ?? "1", 10)
  const mode = resolvedParams.mode ?? ""
  const isHubSchedule = mode === "hub" && Boolean(destination)

  let flights: Flight[] = []
  const nowIso = new Date().toISOString()

  if (isHubSchedule) {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from("flights")
      .select("id, flight_no, origin, destination, departs_at, arrives_at, aircraft_type, status, base_price")
      .eq("destination", destination)
      .eq("status", "scheduled")
      .gte("departs_at", nowIso)
      .order("departs_at", { ascending: true })

    if (!error && data) {
      flights = data as Flight[]
    }
  } else if (origin && destination && date) {
    const supabase = await createServerClient()
    const selectedDayStartIso = `${date}T00:00:00.000Z`
    const minDepartureIso =
      new Date(selectedDayStartIso) > new Date(nowIso)
        ? selectedDayStartIso
        : nowIso

    const { data, error } = await supabase
      .from("flights")
      .select("id, flight_no, origin, destination, departs_at, arrives_at, aircraft_type, status, base_price")
      .eq("origin", origin)
      .eq("destination", destination)
      .gte("departs_at", minDepartureIso)
      .lte("departs_at", `${date}T23:59:59.999Z`)
      .eq("status", "scheduled")
      .order("departs_at", { ascending: true })

    if (!error && data) {
      flights = data as Flight[]
    }
  }

  // Provide fallback flights if database has not yet been seeded
  if (flights.length === 0 && (isHubSchedule || (origin && destination))) {
    const targetDest = destination || "DXB (Dubai T3)"
    const targetOri = origin || "DEL (IGIA T3)"
    const baseTime = date ? new Date(date).getTime() : Date.now()

    flights = [
      {
        id: `demo-search-1`,
        flight_no: "AV-401",
        origin: targetOri,
        destination: targetDest,
        departs_at: new Date(baseTime + 3600 * 1000 * 4).toISOString(),
        arrives_at: new Date(baseTime + 3600 * 1000 * 9).toISOString(),
        aircraft_type: "Boeing 787-9",
        status: "scheduled",
        base_price: 24500,
      },
      {
        id: `demo-search-2`,
        flight_no: "AV-882",
        origin: targetOri,
        destination: targetDest,
        departs_at: new Date(baseTime + 3600 * 1000 * 11).toISOString(),
        arrives_at: new Date(baseTime + 3600 * 1000 * 17).toISOString(),
        aircraft_type: "Airbus A350-900",
        status: "scheduled",
        base_price: 29800,
      },
    ]
  }

  return (
    <FlightResults
      flights={flights}
      passengerCount={passengerCount}
      isHubSchedule={isHubSchedule}
      searchParams={{ origin, destination, date, selectedClass }}
    />
  )
}
