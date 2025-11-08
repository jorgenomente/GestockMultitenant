// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Puente de cookies entre req y res
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...(options ?? {}) });
          });
        },
      },
    }
  );

  // Refresca sesión si existe refresh token
  const { error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    res.cookies.delete("sb-access-token");
    res.cookies.delete("sb-refresh-token");
  }

  const pathname = req.nextUrl.pathname;
  const tenantPriceSearchRx = /^\/t\/[^/]+\/(prices|pricesearch)\/?$/;
  const isTenantPriceSearch = tenantPriceSearchRx.test(pathname);

  const mustAuth =
    (pathname.startsWith("/admin") || pathname.startsWith("/t/")) && !isTenantPriceSearch;

  if (mustAuth) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/t/:path*"],
};
