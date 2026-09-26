import { NextRequest, NextResponse } from "next/server"
import { equalSecret, labPassword, labTicket, LAB_COOKIE, LAB_TTL } from "@/lib/lab-access"

export const runtime = "nodejs"
const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" }

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 })
  if (!labPassword()) return NextResponse.json({ error: "Tester access has not been enabled yet." }, { status: 503 })
  try {
    if (Number(request.headers.get("content-length")) > 2048) throw new Error()
    const raw = await request.text()
    if (raw.length > 2048) throw new Error()
    const body = JSON.parse(raw)
    if (typeof body.password !== "string" || !equalSecret(body.password, labPassword())) {
      await new Promise(resolve => setTimeout(resolve, 600))
      return NextResponse.json({ error: "Incorrect access code." }, { status: 401 })
    }
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
    response.cookies.set(LAB_COOKIE, labTicket(Date.now() + LAB_TTL * 1000), { ...options, maxAge: LAB_TTL })
    return response
  } catch {
    return NextResponse.json({ error: "Enter a valid access code." }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(LAB_COOKIE, "", { ...options, maxAge: 0 })
  return response
}
