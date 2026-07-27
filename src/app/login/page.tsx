import { AuthLanding } from "@/components/auth-landing";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <AuthLanding errorCode={params.error} />;
}
