import Link from "next/link";
import { getDictionary } from "@/lib/locale";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = getDictionary();
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="wrap py-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-title font-medium text-[color:var(--ink)] no-underline"
        >
          {t.brand.name}
        </Link>
      </header>
      <div className="wrap flex flex-1 items-center justify-center pb-16">
        <div className="panel w-full max-w-[440px] p-8">{children}</div>
      </div>
    </main>
  );
}
