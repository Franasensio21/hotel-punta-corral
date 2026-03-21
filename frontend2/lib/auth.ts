const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const TOKEN_KEY = "hotel_token"
const USER_KEY  = "hotel_user"

export interface User {
  id:        number
  name:      string
  email:     string
  role:      string
  categoria: string | null
  hotel_id:  number
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; max-age=0; path=/`
}

export async function login(email: string, password: string): Promise<User> {
  const body = new URLSearchParams()
  body.append("username", email)
  body.append("password", password)
  body.append("grant_type", "password")

  const res = await fetch(`${API}/api/v1/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Email o contraseña incorrectos")
  }

  const data = await res.json()
  localStorage.setItem(TOKEN_KEY, data.access_token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  setCookie(TOKEN_KEY, data.access_token, 7)
  return data.user
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  deleteCookie(TOKEN_KEY)
  window.location.href = "/login"
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null
  const u = localStorage.getItem(USER_KEY)
  return u ? JSON.parse(u) : null
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
