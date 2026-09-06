"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import Link from "next/link"
import { RiPlaneLine, RiMailLine, RiLockPasswordLine, RiUser3Line, RiAlertFill, RiLoader4Line } from "@remixicon/react"

const signupSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters long." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
})

type SignupFormValues = z.infer<typeof signupSchema>

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const nextTarget = searchParams.get("next") ?? "/"

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    const supabase = createClient()

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextTarget)}`,
        },
      })

      if (error) {
        setErrorMsg(error.message)
        setIsLoading(false)
      } else {
        // Check if user was immediately logged in (email confirmation disabled)
        if (signUpData.session) {
          router.refresh()
          router.push(nextTarget)
        } else {
          setSuccessMsg("Success! Please check your email to verify your traveler account.")
          setIsLoading(false)
          form.reset()
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <RiPlaneLine className="h-6 w-6 transform rotate-45 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-heading">
            FlyGo Airlines
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create an account to access premium travel benefits and visual seat selection.
          </p>
        </div>

        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold font-heading">Get Started</CardTitle>
            <CardDescription>
              Create your traveler account to begin your journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                    <RiAlertFill className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="flex flex-col gap-1 rounded-lg bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400 border border-green-500/20 animate-in fade-in slide-in-from-top-1 font-medium">
                    <span>{successMsg}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                      Once confirmed, you can log in to book flights.
                    </span>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-700 dark:text-zinc-300">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <RiUser3Line className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            placeholder="John Doe"
                            className="pl-9 h-10"
                            type="text"
                            disabled={isLoading}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-700 dark:text-zinc-300">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <RiMailLine className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            placeholder="traveler@flygo.com"
                            className="pl-9 h-10"
                            type="email"
                            disabled={isLoading}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-700 dark:text-zinc-300">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <RiLockPasswordLine className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            placeholder="••••••••"
                            className="pl-9 h-10"
                            type="password"
                            disabled={isLoading}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <RiLoader4Line className="h-5 w-5 animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    "Register Traveler Account"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4 text-center text-sm text-zinc-500">
            <div>
              Already have an account?{" "}
              <Link
                href={`/auth/login?next=${encodeURIComponent(nextTarget)}`}
                className="font-semibold text-primary hover:underline"
              >
                Sign In
              </Link>
            </div>
            <div>
              <Link href="/" className="hover:underline text-xs text-zinc-400 hover:text-zinc-600">
                Back to Landing Page
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <RiLoader4Line className="h-10 w-10 animate-spin text-primary" />
          <span className="text-zinc-500 text-sm">Loading registration portal...</span>
        </div>
      </div>
    }>
      <SignupForm />
    </React.Suspense>
  )
}
