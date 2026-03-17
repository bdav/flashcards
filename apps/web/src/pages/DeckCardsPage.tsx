import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  const utils = trpc.useUtils();

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deckQuery = trpc.deck.getById.useQuery(
    { id: deckId ?? '' },
    { enabled: !!deckId },
  );

  const cardsQuery = trpc.card.listByDeck.useQuery(
    { deckId: deckId ?? '' },
    { enabled: !!deckId },
  );

  const createCard = trpc.card.create.useMutation({
    onSuccess: () => {
      utils.card.listByDeck.invalidate({ deckId: deckId ?? '' });
      setFront('');
      setBack('');
    },
  });

  const importCsv = trpc.card.importCsv.useMutation({
    onSuccess: (data) => {
      utils.card.listByDeck.invalidate({ deckId: deckId ?? '' });
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

  const deck = deckQuery.data;
  const cards = cardsQuery.data ?? [];

  function handleCsvUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      importCsv.mutate({ deckId: deckId!, csvContent });
    };
    reader.readAsText(file);
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-2xl text-soft-foreground">
        <DeckHeader
          deckName={deck.name}
          deckId={deckId ?? ''}
          activeTab="cards"
        />

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Add Card</h2>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!front.trim() || !back.trim()) return;
              createCard.mutate({
                deckId: deckId!,
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="py-3 font-medium">
                      {card.front}
                    </TableCell>
                    <TableCell className="py-3">{card.back}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </CenteredPage>
  );
}
