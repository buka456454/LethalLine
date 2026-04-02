import AuthPanel from "@/components/auth/AuthPanel";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; verify?: string }>;
}) {
  const logos = await getBrandLogos();
  const authLogo = pickBrandLogo(logos, 2);
  const params = (await searchParams) ?? {};
  const initialMode = params.mode === "register" ? "register" : "login";
  const verifyStatus = params.verify;

  return (
    <div className="flex w-full items-center justify-center py-10">
      <AuthPanel logoSrc={authLogo?.src} initialMode={initialMode} verifyStatus={verifyStatus} />
    </div>
  );
}
