import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-surface">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="display text-lg">Vaada</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            A public register of what officials promised, when they promised it was
            due, and what citizens found when they went and looked.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-3">
            Every entry links to its source. A red tile means the deadline passed
            with no verified proof of completion — it is a claim about the evidence,
            not an allegation about any individual.
          </p>
        </div>

        <div>
          <p className="eyebrow">Browse</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/">Map of promises</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/scoreboard">Scoreboard &amp; rankings</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/register">Full register</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/deadlines">Deadline board</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/authority">Who is answerable</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/complaints">Complaints</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Contribute</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/submit">Log a promise from a post</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/complaints/new">File a complaint</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/method">How verification works</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-[1400px] px-4 py-4 text-xs text-ink-3 sm:px-6">
          Built as a public accountability record. Not affiliated with any party,
          government body or campaign.
        </div>
      </div>
    </footer>
  );
}
