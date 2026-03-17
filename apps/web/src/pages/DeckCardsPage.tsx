import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CenteredPage } from '@/components/CenteredPage';
import { DeckTabs } from '@/components/DeckTabs';
import { DeckCardsSkeleton } from '@/components/PageSkeleton';
import { DeckCard } from '@/components/DeckCard';
import { FlashCardTile } from '@/components/FlashCardTile';

function EditableDeckTitle({ deckId, name }: { deckId: string; name: string }) {
  const utils = trpc.useUtils();
  const [localName, setLocalName] = useState(name);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setLocalName(name);
  }, [name]);

  const updateDeck = trpc.deck.update.useMutation({
    onSuccess: () => {
      utils.deck.getById.invalidate({ id: deckId });
      utils.deck.list.invalidate();
    },
    onError: () => {
      toast.error('Failed to update deck name');
      setLocalName(name);
    },
  });

  const mutateRef = useRef(updateDeck.mutate);
  useEffect(() => {
    mutateRef.current = updateDeck.mutate;
  }, [updateDeck.mutate]);

  function debouncedSave(newName: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = newName.trim();
      if (trimmed && trimmed !== name) {
        mutateRef.current({ id: deckId, name: trimmed });
      }
    }, 800);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!isEditing) {
    return (
      <h1
        className="cursor-text text-3xl font-bold text-white hover:text-white/80"
        onClick={() => setIsEditing(true)}
        title="Click to edit"
      >
        {localName}
      </h1>
    );
  }

  return (
    <input
      type="text"
      value={localName}
      onChange={(e) => {
        setLocalName(e.target.value);
        debouncedSave(e.target.value);
      }}
      onBlur={() => setIsEditing(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          setIsEditing(false);
        }
      }}
      autoFocus
      className="w-full bg-transparent text-3xl font-bold text-white outline-none border-b-2 border-white/30 focus:border-white/60 transition-colors"
    />
  );
}

export default function DeckCardsPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [isCreating, setIsCreating] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deckQuery = trpc.deck.getById.useQuery(
    { id: deckId! },
    { enabled: !!deckId },
  );

  const cardsQuery = trpc.card.listByDeck.useQuery(
    { deckId: deckId! },
    { enabled: !!deckId },
  );

  const invalidateCards = () =>
    utils.card.listByDeck.invalidate({ deckId: deckId! });

  const createCard = trpc.card.create.useMutation({
    onSuccess: () => {
      invalidateCards();
      setIsCreating(false);
      setNewFront('');
      setNewBack('');
      toast.success('Card added');
    },
    onError: () => {
      toast.error('Failed to add card');
    },
  });

  const updateCard = trpc.card.update.useMutation({
    onSuccess: () => {
      invalidateCards();
    },
    onError: () => {
      toast.error('Failed to update card');
    },
  });

  const deleteCard = trpc.card.delete.useMutation({
    onSuccess: () => {
      invalidateCards();
    },
    onError: () => {
      toast.error('Failed to delete card');
    },
  });

  const deleteDeck = trpc.deck.delete.useMutation({
    onSuccess: () => {
      utils.deck.list.invalidate();
      toast.success('Deck deleted');
      navigate('/');
    },
    onError: () => {
      toast.error('Failed to delete deck');
    },
  });

  const importCsv = trpc.card.importCsv.useMutation({
    onSuccess: (data) => {
      invalidateCards();
      setCsvError(null);
      toast.success(`Imported ${data.importedCount} cards`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (err) => {
      setCsvError(err.message);
    },
  });

  const deck = deckQuery.data;

  if (!deckId) {
    return (
      <CenteredPage centered>
        <p className="text-destructive">No deck ID provided.</p>
      </CenteredPage>
    );
  }

  if (deckQuery.isLoading || cardsQuery.isLoading) {
    return <DeckCardsSkeleton />;
  }

  if (deckQuery.isError || !deckQuery.data) {
    return (
      <CenteredPage centered>
        <p className="text-destructive">Error loading deck.</p>
      </CenteredPage>
    );
  }

  const cards = cardsQuery.data ?? [];

  function handleCsvUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      importCsv.mutate({ deckId, csvContent });
    };
    reader.readAsText(file);
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-4xl text-white">
        <div className="relative w-full max-w-4xl">
          <EditableDeckTitle deckId={deckId} name={deck.name} />
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <DeckTabs deckId={deckId} activeTab="cards" />
          </div>
        </div>

        <p className="mt-2 text-sm text-white/50">
          {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          {cards.length === 0 && (
            <span className="ml-1">
              — add cards below or import a CSV to get started
            </span>
          )}
        </p>

        {/* Card Grid */}
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
          {/* New Card button / form */}
          {isCreating ? (
            <DeckCard stackCount={0}>
              <form
                className="flex w-full flex-col items-center gap-2 px-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newFront.trim() || !newBack.trim()) return;
                  createCard.mutate({
                    deckId,
                    front: newFront.trim(),
                    back: newBack.trim(),
                  });
                }}
              >
                <Input
                  type="text"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="Front"
                  autoFocus
                  className="text-center text-sm"
                />
                <Input
                  type="text"
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="Back"
                  className="text-center text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createCard.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreating(false);
                      setNewFront('');
                      setNewBack('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DeckCard>
          ) : (
            <DeckCard
              stackCount={0}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-10 w-10 text-white/60" />
              <p className="mt-2 text-sm font-medium text-white/60">New Card</p>
            </DeckCard>
          )}

          {/* Import CSV tile */}
          <DeckCard
            stackCount={0}
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-white/60" />
            <p className="mt-2 text-sm font-medium text-white/60">Import CSV</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              data-testid="csv-file-input"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCsvError(null);
                  handleCsvUpload(file);
                }
              }}
            />
          </DeckCard>

          {/* Existing cards */}
          {cards.map((card) => (
            <FlashCardTile
              key={card.id}
              front={card.front}
              back={card.back}
              onSave={(front, back) =>
                updateCard.mutate({ cardId: card.id, front, back })
              }
              onDelete={() => {
                if (window.confirm('Delete this card?')) {
                  deleteCard.mutate({ cardId: card.id });
                }
              }}
              isSaving={
                updateCard.isPending && updateCard.variables?.cardId === card.id
              }
            />
          ))}
        </div>

        {csvError && (
          <p className="mt-3 text-sm text-destructive">{csvError}</p>
        )}

        {/* Danger Zone */}
        <div className="mt-10 border-t border-white/20 pt-6">
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete "${deck?.name}"? This cannot be undone.`,
                )
              ) {
                deleteDeck.mutate({ id: deckId });
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Deck
          </Button>
        </div>
      </div>
    </CenteredPage>
  );
}
