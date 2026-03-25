import { ok } from "@/lib/api";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  return ok({ session });
}
