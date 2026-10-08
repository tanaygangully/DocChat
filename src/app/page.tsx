import { FileUp, MessagesSquare, Quote } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  if (await getCurrentUser()) redirect("/chat");

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col px-6">
      <header className="py-6">
        <Logo />
      </header>

      <section className="flex flex-1 flex-col items-start justify-center gap-8 py-16">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Ask your PDFs anything. Get answers that point to the page.
        </h1>
        <p className="max-w-xl text-lg text-stone-600 dark:text-stone-400">
          Upload reports, papers or manuals. DocChat finds the passages that matter and answers only from
          them — with citations you can click to check.
        </p>
        <AuthForm />

        <ul className="mt-8 grid w-full gap-4 sm:grid-cols-3">
          {[
            { icon: FileUp, title: "Upload", text: "Drop in PDFs up to 20 MB. They stay private to your account." },
            { icon: MessagesSquare, title: "Ask", text: "Chat naturally, with follow-ups. Your chats are saved." },
            { icon: Quote, title: "Verify", text: "Every answer cites the document and page it came from." },
          ].map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <Icon className="mb-3 size-5 text-emerald-600" />
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
