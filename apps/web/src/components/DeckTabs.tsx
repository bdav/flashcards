import { Link } from 'react-router-dom';

interface DeckTabsProps {
  deckId: string;
  activeTab: 'study' | 'cards' | 'stats';
}

const baseClasses =
  'w-16 py-1.5 text-center text-sm font-medium transition-colors border-b-2';
const activeClasses = `${baseClasses} border-white text-white cursor-default`;
const inactiveClasses = `${baseClasses} border-transparent text-white/50 hover:text-white/80`;

export function DeckTabs({ deckId, activeTab }: DeckTabsProps) {
  return (
    <div className="flex" role="tablist">
      <Link
        to={`/decks/${deckId}`}
        className={activeTab === 'study' ? activeClasses : inactiveClasses}
        role="tab"
        aria-selected={activeTab === 'study'}
      >
        Study
      </Link>
      <Link
        to={`/decks/${deckId}/cards`}
        className={activeTab === 'cards' ? activeClasses : inactiveClasses}
        role="tab"
        aria-selected={activeTab === 'cards'}
      >
        Cards
      </Link>
      <Link
        to={`/decks/${deckId}/stats`}
        className={activeTab === 'stats' ? activeClasses : inactiveClasses}
        role="tab"
        aria-selected={activeTab === 'stats'}
      >
        Stats
      </Link>
    </div>
  );
}
