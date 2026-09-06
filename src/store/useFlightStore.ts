"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Flight {
  id: string
  flight_no: string
  origin: string
  destination: string
  departs_at: string
  arrives_at: string
  aircraft_type: string
  status: 'scheduled' | 'delayed' | 'cancelled' | 'departed' | 'arrived'
  base_price: number
}

export interface Seat {
  id: string
  flight_id: string
  seat_number: string
  class: 'economy' | 'business' | 'first'
  is_available: boolean
  extra_fee: number
}

export type SeatClass = 'economy' | 'business' | 'first'

export interface SearchState {
  origin: string
  destination: string
  date: string
  class: SeatClass
  passengerCount: number
}

export interface PassengerForm {
  fullName: string
  passportNo: string
  nationality: string
  dob: string
}

export type BookingStep = "search" | "seating" | "passenger" | "confirmation"

export interface FlightStoreState {
  searchState: SearchState
  selectedFlight: Flight | null
  selectedSeat: Seat | null
  selectedSeats: Seat[]
  bookingStep: BookingStep
  /** Legacy single-passenger field — kept so existing code that reads
   *  passengerForm does not break. Superseded by passengerForms. */
  passengerForm: PassengerForm
  /** One entry per passenger (length === searchState.passengerCount) */
  passengerForms: PassengerForm[]
}

export interface FlightStoreActions {
  setSearchState: (search: Partial<SearchState>) => void
  setSelectedFlight: (flight: Flight | null) => void
  setSelectedSeat: (seat: Seat | null) => void
  setSelectedSeats: (seats: Seat[]) => void
  setBookingStep: (step: BookingStep) => void
  updatePassengerForm: (form: Partial<PassengerForm>) => void
  setPassengerForms: (forms: PassengerForm[]) => void
  resetBookingFlow: () => void
  resetAll: () => void
}

const emptyPassenger = (): PassengerForm => ({
  fullName: "",
  passportNo: "",
  nationality: "",
  dob: "",
})

export const useFlightStore = create<FlightStoreState & FlightStoreActions>()(
  persist(
    (set) => ({
      searchState: {
        origin: "",
        destination: "",
        date: "",
        class: "economy",
        passengerCount: 1,
      },
      selectedFlight: null,
      selectedSeat: null,
      selectedSeats: [],
      bookingStep: "search",
      passengerForm: emptyPassenger(),
      passengerForms: [emptyPassenger()],

      setSearchState: (search) =>
        set((state) => ({
          searchState: { ...state.searchState, ...search },
        })),

      setSelectedFlight: (flight) => set({ selectedFlight: flight }),
      setSelectedSeat: (seat) =>
        set((state) => ({
          selectedSeat: seat,
          selectedSeats: seat ? [seat] : [],
        })),
      setSelectedSeats: (seats) =>
        set((state) => ({
          selectedSeats: seats,
          selectedSeat: seats[0] || null,
        })),
      setBookingStep: (step) => set({ bookingStep: step }),

      updatePassengerForm: (form) =>
        set((state) => ({
          passengerForm: { ...state.passengerForm, ...form },
        })),

      setPassengerForms: (forms) => set({ passengerForms: forms }),

      resetBookingFlow: () =>
        set((state) => ({
          selectedSeat: null,
          selectedSeats: [],
          passengerForm: emptyPassenger(),
          passengerForms: Array.from(
            { length: state.searchState.passengerCount },
            emptyPassenger
          ),
          bookingStep: "seating",
        })),

      resetAll: () =>
        set({
          searchState: {
            origin: "",
            destination: "",
            date: "",
            class: "economy",
            passengerCount: 1,
          },
          selectedFlight: null,
          selectedSeat: null,
          selectedSeats: [],
          bookingStep: "search",
          passengerForm: emptyPassenger(),
          passengerForms: [emptyPassenger()],
        }),
    }),
    {
      name: "flygo-flight-storage",
      partialize: (state) => ({
        searchState: state.searchState,
        selectedFlight: state.selectedFlight,
        selectedSeat: state.selectedSeat,
        selectedSeats: state.selectedSeats,
        bookingStep: state.bookingStep,
        // Strip passportNo from all passenger form entries before persisting
        passengerForm: { ...state.passengerForm, passportNo: "" },
        passengerForms: state.passengerForms.map(
          (p) => ({ ...p, passportNo: "" })
        ),
      }),
    }
  )
)
