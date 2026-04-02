import { NextResponse } from "next/server";

/** Старые ссылки из писем больше не действуют — подтверждение только по SMS. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || url.origin;
  const target = `${base.replace(/\/$/, "")}/sign-in?verify=obsolete`;
  return NextResponse.redirect(target);
}
