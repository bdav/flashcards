import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CenteredPage } from '@/components/CenteredPage';
import { DeckHeader } from '@/components/DeckHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DeckCardsPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
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
      setFront('');
      setBack('');
    },
  });

  const updateCard = trpc.card.update.useMutation({
    onSuccess: () => {
      invalidateCards();
      setEditingCardId(null);
    },
  });

  const deleteCard = trpc.card.delete.useMutation({
    onSuccess: () => {
      invalidateCards();
    },
  });

  const updateDeck = trpc.deck.update.useMutation({
    onSuccess: () => {
      utils.deck.getById.invalidate({ id: deckId! });
      utils.deck.list.invalidate();
    },
  });

  const deleteDeck = trpc.deck.delete.useMutation({
    onSuccess: () => {
      utils.deck.list.invalidate();
      navigate('/');
    },
  });

  const importCsv = trpc.card.importCsv.useMutation({
    onSuccess: (data) => {
      invalidateCards();
      setCsvError(null);
      setCsvSuccess(`Imported ${data.importedCount} cards.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (err) => {
      setCsvSuccess(null);
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
    return (
      <CenteredPage centered>
        <p className="text-muted-foreground">Loading cards...</p>
      </CenteredPage>
    );
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
      <div className="w-full max-w-2xl text-soft-foreground">
        <DeckHeader deckName={deck.name} deckId={deckId} activeTab="cards" />

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Add Card</h2>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!front.trim() || !back.trim()) return;
              createCard.mutate({
                deckId,
                front: front.trim(),
                back: back.trim(),
              });
            }}
          >
            <Input
              type="text"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Front"
              className="flex-1"
            />
            <Input
              type="text"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Back"
              className="flex-1"
            />
            <Button type="submit" disabled={createCard.isPending}>
              Add
            </Button>
          </form>
          {createCard.isError && (
            <p className="mt-2 text-sm text-destructive">
              {createCard.error.message}
            </p>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Import CSV</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CSV must have <code>front</code> and <code>back</code> columns.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              data-testid="csv-file-input"
              className="flex-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCsvError(null);
                  setCsvSuccess(null);
                  handleCsvUpload(file);
                }
              }}
            />
          </div>
          {csvError && (
            <p className="mt-2 text-sm text-destructive">{csvError}</p>
          )}
          {csvSuccess && (
            <p className="mt-2 text-sm text-green-600">{csvSuccess}</p>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">All Cards ({cards.length})</h2>
          {cards.length === 0 ? (
            <p className="mt-3 text-muted-foreground">
              No cards yet. Add cards above or import a CSV.
            </p>
          ) : (
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Front</TableHead>
                  <TableHead>Back</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    {editingCardId === card.id ? (
                      <>
                        <TableCell className="py-2">
                          <Input
                            value={editFront}
                            onChange={(e) => setEditFront(e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            value={editBack}
                            onChange={(e) => setEditBack(e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                updateCard.mutate({
                                  cardId: card.id,
                                  front: editFront.trim(),
                                  back: editBack.trim(),
                                });
                              }}
                              disabled={!editFront.trim() || !editBack.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCardId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="py-3 font-medium">
                          {card.front}
                        </TableCell>
                        <TableCell className="py-3">{card.back}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCardId(card.id);
                                setEditFront(card.front);
                                setEditBack(card.back);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm('Delete this card?')) {
                                  deleteCard.mutate({ cardId: card.id });
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-10 border-t pt-6">
          <h2 className="text-lg font-semibold">Deck Settings</h2>
          <form
            key={`${deck.name}|${deck.description ?? ''}`}
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!deck) return;
              const formData = new FormData(e.currentTarget);
              const name = (formData.get('deckName') as string).trim();
              const description = (
                formData.get('deckDescription') as string
              ).trim();
              if (!name) return;
              const data: {
                id: string;
                name?: string;
                description?: string | null;
              } = {
                id: deckId,
              };
              if (name !== deck.name) {
                data.name = name;
              }
              if (description !== (deck.description ?? '')) {
                data.description = description || null;
              }
              if (data.name !== undefined || data.description !== undefined) {
                updateDeck.mutate(data);
              }
            }}
          >
            <div>
              <label htmlFor="deck-name" className="text-sm font-medium">
                Deck Name
              </label>
              <Input
                id="deck-name"
                name="deckName"
                defaultValue={deck.name}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="deck-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="deck-description"
                name="deckDescription"
                defaultValue={deck.description ?? ''}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={updateDeck.isPending}>
              Save Changes
            </Button>
          </form>

          <div className="mt-6">
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
              Delete Deck
            </Button>
          </div>
        </div>
      </div>
    </CenteredPage>
  );
}
