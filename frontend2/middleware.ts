import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtDecode } from "jwt-decode"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("hotel_token")?.value
  const { pathname } = request.nextUrl

  if (pathname === "/login") {
    if (token) return NextResponse.redirect(new URL("/", request.url))
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Decodificar el token para ver el rol
  try {
    const payload = jwtDecode<{ role: string; categoria: string }>(token)
const categoria = payload.categoria

// Mucama solo puede ver /mucama
if (categoria === "mucama" && !pathname.startsWith("/mucama")) {
  return NextResponse.redirect(new URL("/mucama", request.url))
}

// Recepcionista solo puede ver /recepcionista
if (categoria === "recepcionista" && !pathname.startsWith("/recepcionista")) {
  return NextResponse.redirect(new URL("/recepcionista", request.url))
}

    // Employee sin categoria especifica va al dashboard
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
