import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";

/** Signed-out visitors go to /login (remembering where they were headed); signed-in ones skip it. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isLogin = pathname === "/login";

  if (!session && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (session && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Static files (brand, marks, 3D models, sample STEP files) stay public.
  matcher: [
    "/((?!_next/static|_next/image|brand|images|models|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|glb|gltf|stl|step|stp|json|csv)$).*)",
  ],
};
