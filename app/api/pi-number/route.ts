import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const entropy = Math.floor(1000 + Math.random() * 9000);

  return NextResponse.json({ piNumber: `GLC-PI-${date}-${entropy}` });
}
