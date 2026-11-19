import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireSession, isGuardFailure } from "@/lib/guards";
import { toId } from "@/lib/validate";
import { logError } from "@/lib/error-log";
import { logActivity } from "@/lib/activity";

// A vehicle's photo, kept as a small compressed image on the vehicle row. The
// browser shrinks it first (see the fleet page), so a photo is tens of KB, not
// megabytes. The column is added here the first time it's needed, so nothing
// has to be run by hand and no existing vehicle data is touched.
const MAX_CHARS = 350_000;

export async function PUT(req: NextRequest) {
  const g = await requireSession();
  if (isGuardFailure(g)) return g.response;

  try {
    const body = await req.json();
    const id = toId(body?.id);
    if (!id) return NextResponse.json({ error: "Missing vehicle id" }, { status: 400 });

    const img = body?.image_data;
    if (img !== null && !(typeof img === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(img))) {
      return NextResponse.json({ error: "That file is not a usable image" }, { status: 400 });
    }
    if (typeof img === "string" && img.length > MAX_CHARS) {
      return NextResponse.json({ error: "Photo is too large. Try a smaller one." }, { status: 413 });
    }

    await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_data TEXT`;
    const r = await sql`UPDATE vehicles SET image_data = ${img}, updated_at = NOW() WHERE id = ${id} RETURNING make, model, plate_number`;
    if (r.length === 0) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    await logActivity(g.session, img ? "Vehicle photo set" : "Vehicle photo removed", `${r[0].make} ${r[0].model} ${r[0].plate_number || ""}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    await logError("vehicles/image", err);
    return NextResponse.json({ error: "Could not save the photo. Nothing was changed." }, { status: 500 });
  }
}
