import { DeckTabs } from '@/components/DeckTabs';

interface DeckHeaderProps {
  deckName: string;
  deckId: string;
  activeTab: 'study' | 'cards' | 'stats';
}

export function DeckHeader({ deckName, deckId, activeTab }: DeckHeaderProps) {
  return (
    <div className="relative w-full max-w-4xl">
      <h1 className="text-3xl font-bold text-white">{deckName}</h1>
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <DeckTabs deckId={deckId} activeTab={activeTab} />
      </div>
    </div>
  );
}
