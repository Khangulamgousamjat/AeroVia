import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session and check claims (crucial for maintaining session state across RSC calls)
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;

  // Protected paths (require login)
  const isProtectedPath = pathname.startsWith("/bookings");

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    // Preserve redirect destination
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Auth paths (redirect to bookings if already logged in)
  const isAuthPath =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup");
  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/bookings";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
