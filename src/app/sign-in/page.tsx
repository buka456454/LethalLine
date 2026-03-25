import AuthPanel from "@/components/auth/AuthPanel";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";

export default async function SignInPage() {
  const logos = await getBrandLogos();
  const authLogo = pickBrandLogo(logos, 2);

  return (
    <div className="flex w-full items-center justify-center py-10">
      <AuthPanel logoSrc={authLogo?.src} />
    </div>
  );
}
