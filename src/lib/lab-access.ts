import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

export const LAB_COOKIE = "talkata_labs"
export const LAB_TTL = 60 * 60 * 4
export function labPassword() { return process.env.TALKATA_LABS_PASSWORD || "" }
export function equalSecret(a: string, b: string) {
  const hash = (s: string) => createHmac("sha256", "talkata-lab-compare").update(s).digest()
  return timingSafeEqual(hash(a), hash(b))
}
export function labTicket(expires: number) {
  return `${expires}.${createHmac("sha256", labPassword()).update(`labs:${expires}`).digest("hex")}`
}
export async function hasLabAccess() {
  if (!labPassword()) return false
  const ticket = (await cookies()).get(LAB_COOKIE)?.value || ""
  const expires = Number(ticket.split(".")[0])
  return Number.isSafeInteger(expires) && expires > Date.now() && expires <= Date.now() + LAB_TTL * 1000 && equalSecret(ticket, labTicket(expires))
}
