import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionPayloadFromUser, setSessionCookie, signSession } from "@/lib/auth";
import { getOrCreateOAuthUserByEmail } from "@/lib/oauthUser";

function resolveBaseUrl(request: Request) {
  const configuredBase = process.env.AUTH_URL?.trim();
  if (configuredBase) return configuredBase;
  return new URL(request.url).origin;
}

function redirectTo(request: Request, target: string) {
  return NextResponse.redirect(new URL(target, resolveBaseUrl(request)));
}

export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return redirectTo(request, "/sign-in?verify=invalid");

  const user = await getOrCreateOAuthUserByEmail(email);
  if (user.isBanned) return redirectTo(request, "/sign-in?verify=invalid");

  const jwt = await signSession(
    sessionPayloadFromUser({
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      phone: user.phone,
      phoneVerifiedAt: user.phoneVerifiedAt,
    }),
  );
  await setSessionCookie(jwt);

  return redirectTo(request, "/tournaments");
}
