import Link from 'next/link';

// Placeholder landing page. The real one (demo preview + sign-up CTA) comes with auth in week 2.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold text-slate-800">OnQuest</h1>
      <p className="text-lg text-slate-600">
        A home on the web for all your trips. Turn your photos into a scrapbook page you can share.
      </p>
      <Link href="/demo" className="rounded-full bg-slate-800 px-6 py-3 text-white hover:bg-teal-700">
        See a sample trip
      </Link>
    </main>
  );
}
