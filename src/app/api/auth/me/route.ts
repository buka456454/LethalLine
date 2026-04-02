import { ok } from "@/lib/api";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  if (!session) return ok({ session: null });
  return ok({
    session: {
      sub: session.sub,
      username: session.username,
      email: session.email,
      role: session.role,
      phone: session.phone,
      phoneVerified: session.phoneVerified,
    },
  });
}
