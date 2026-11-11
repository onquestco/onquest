'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/design-system/components/Button';
import { Chip } from '@/design-system/components/Chip';
import { SearchResultsSchema, type GuideCard, type Person, type SearchResults } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { GuideCards } from './GuideCards';
import { PeopleList } from './PeopleList';
import { QuestGrid } from './QuestGrid';

type Props = { chips: string[]; trending: QuestCard[]; guides: GuideCard[]; travellers: Person[] };

const PAUSE_MS = 500; // search after a typing pause (the search_performed trigger)
const MIN = 2;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-lead font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Screen 13: place chips, trending, guides and travellers; search replaces them while typing. */
export function ExploreView({ chips, trending, guides, travellers }: Props) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searchedFor, setSearchedFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);
  const query = text.trim();

  useEffect(() => {
    if (query.length < MIN) return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setFailed(false);
      fetch(`/api/search?${new URLSearchParams({ q: query }).toString()}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((body: unknown) => {
          if (ticket !== latest.current) return; // a newer search is on its way
          setResults(SearchResultsSchema.parse(body));
          setSearchedFor(query);
        })
        .catch(() => {
          if (ticket === latest.current) setFailed(true);
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, PAUSE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const searching = query.length >= MIN;
  const empty = results && results.quests.length + results.people.length + results.guides.length === 0;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-4">
      <h1 className="text-title text-ink">Explore</h1>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="sr-only">Search places, Quests or people</span>
          <input
            type="search"
            value={text}
            maxLength={60}
            placeholder="Search places, Quests or people"
            onChange={(event) => setText(event.target.value)}
            className="min-h-12 w-full rounded-pill border border-line-control bg-surface-page px-4 text-body text-ink placeholder:text-ink-subtle focus:border-brand-strong focus:outline-2 focus:outline-brand-strong"
          />
        </label>
        {text && (
          <Button variant="quiet" onClick={() => setText('')}>
            Clear
          </Button>
        )}
      </div>

      {searching ? (
        // Keeps the last results on screen while the next search loads.
        <div className="flex flex-col gap-6" aria-busy={loading}>
          {failed && (
            <p role="alert" className="text-body text-ink-muted">
              Search isn&apos;t working right now. Try again in a moment.
            </p>
          )}
          {empty && (
            <div className="flex flex-col gap-1">
              <p className="text-body text-ink">Nothing for &ldquo;{searchedFor}&rdquo;</p>
              <p className="text-body text-ink-muted">Try a place, like Goa or Manali.</p>
            </div>
          )}
          {results && results.quests.length > 0 && (
            <Section title="Quests">
              <QuestGrid quests={results.quests} />
            </Section>
          )}
          {results && results.people.length > 0 && (
            <Section title="People">
              <PeopleList people={results.people} source="search" />
            </Section>
          )}
          {results && results.guides.length > 0 && (
            <Section title="Stories and guides">
              <GuideCards guides={results.guides} />
            </Section>
          )}
        </div>
      ) : (
        <>
          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Places">
              {chips.map((chip) => (
                <li key={chip}>
                  <Chip onClick={() => setText(chip)}>{chip}</Chip>
                </li>
              ))}
            </ul>
          )}
          {trending.length > 0 && (
            <Section title="Trending Quests">
              <QuestGrid quests={trending} showLikes />
            </Section>
          )}
          {guides.length > 0 && (
            <Section title="Stories and guides">
              <GuideCards guides={guides} />
            </Section>
          )}
          {travellers.length > 0 && (
            <Section title="Travellers to follow">
              <PeopleList people={travellers} source="explore" />
            </Section>
          )}
          {trending.length === 0 && guides.length === 0 && travellers.length === 0 && (
            <p className="text-body text-ink-muted">
              Nothing to explore yet. Be the first to publish a Quest.
            </p>
          )}
        </>
      )}
    </main>
  );
}
