"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { RiPlaneLine, RiTicketLine, RiUserLine, RiLogoutBoxRLine, RiMenuLine, RiCloseLine } from "@remixicon/react"
import { cn } from "@/lib/utils"

import { useUserStore } from "@/store/useUserStore"
import { useFlightStore } from "@/store/useFlightStore"
import { useStoreHydration } from "@/store/useStoreHydration"


export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  
  const storeUser = useStoreHydration(useUserStore, (state) => state.user)
  const setUserStore = useUserStore((state) => state.setUser)
  const clearSession = useUserStore((state) => state.clearSession)
  
  const user = storeUser !== undefined ? storeUser : null
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Sync Supabase Auth session with store automatically
  React.useEffect(() => {
    const supabase = createClient()
    
    // Initial fetch on mount
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserStore({
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || "",
        })
      } else {
        clearSession()
      }
    })

    // Listen to real-time session changes (sign-in, token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserStore({
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || "",
        })
      } else {
        clearSession()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUserStore, clearSession])

  async function handleSignOut() {
    const supabase = createClient()
    // FIX 5 (F12) — Clear stale Zustand flight/booking state before sign out
    useFlightStore.getState().resetBookingFlow()
    await supabase.auth.signOut()
    clearSession()
    router.refresh()
    router.push("/")
  }

  const navLinks = [
    { href: "/", label: "Book Flights", icon: RiPlaneLine },
    { href: "/bookings", label: "My Bookings", icon: RiTicketLine },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-all">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-primary font-heading tracking-tight">
          <Image
            src="/logo.png"
            alt="FlyGo Logo"
            width={36}
            height={36}
            className="object-contain h-9 w-9"
          />
          <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">FlyGo</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary",
                  isActive 
                    ? "text-primary border-b-2 border-primary pb-1 pt-1" 
                    : "text-zinc-600 dark:text-zinc-400 pb-1 pt-1"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop User / Auth Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50">
                <RiUserLine className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[150px] truncate">
                  {user.full_name || user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-zinc-500 hover:text-destructive cursor-pointer"
                onClick={handleSignOut}
              >
                <RiLogoutBoxRLine className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/auth/login">
              <Button size="sm" className="font-semibold shadow-md shadow-primary/10 cursor-pointer">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-zinc-600 dark:text-zinc-400"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <RiCloseLine className="h-6 w-6" /> : <RiMenuLine className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 p-4 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  <RiUserLine className="h-5 w-5" />
                  <span className="text-sm font-medium truncate">{user.full_name || user.email}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/5 cursor-pointer"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                >
                  <RiLogoutBoxRLine className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                <Button className="w-full justify-center font-semibold cursor-pointer">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
