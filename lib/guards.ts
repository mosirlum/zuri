import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// The sidebar hides Finance, Reports and Users from staff, but hiding a link
// isn't the same as blocking the request. Anyone who knows the URL can still
// call the API underneath it. These guards are the actual boundary — every
// route that only Ray should reach calls requireBoss() before touching data.

type Guard = { session: any } | { response: NextResponse };

export async function requireSession(): Promise<Guard> {
  const session = await auth();
  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function requireBoss(): Promise<Guard> {
  const session = await auth();
  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = (session.user as any)?.role;
  if (role !== "super_admin") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function isGuardFailure(g: Guard): g is { response: NextResponse } {
  return "response" in g;
}
