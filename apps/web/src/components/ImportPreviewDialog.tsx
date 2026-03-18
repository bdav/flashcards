import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { NewCard, UpdateCard, SkippedRow } from '@/lib/csvDiff';

interface ImportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: {
    new: { front: string; back: string }[];
    update: { cardId: string; back: string }[];
  }) => void;
  isPending: boolean;
  initialNewCards: NewCard[];
  initialUpdateCards: UpdateCard[];
  skippedRows: SkippedRow[];
}

export function ImportPreviewDialog({
  open,
  onClose,
  onImport,
  isPending,
  initialNewCards,
  initialUpdateCards,
  skippedRows,
}: ImportPreviewDialogProps) {
  const [newCards, setNewCards] = useState(initialNewCards);
  const [updateCards, setUpdateCards] = useState(initialUpdateCards);

  const hasChanges = newCards.length > 0 || updateCards.length > 0;

  function handleImport() {
    onImport({
      new: newCards.map((c) => ({ front: c.front, back: c.back })),
      update: updateCards.map((c) => ({ cardId: c.cardId, back: c.newBack })),
    });
  }

  function removeNewCard(index: number) {
    setNewCards((prev) => prev.filter((_, i) => i !== index));
  }

  function removeUpdateCard(index: number) {
    setUpdateCards((prev) => prev.filter((_, i) => i !== index));
  }

  function updateNewCardField(
    index: number,
    field: 'front' | 'back',
    value: string,
  ) {
    setNewCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  function updateUpdateCardBack(index: number, value: string) {
    setUpdateCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, newBack: value } : c)),
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[80vh] flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Import Preview</DialogTitle>
          <DialogDescription>
            Review the cards that will be imported. You can edit or remove rows
            before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2">
          {/* New Cards Section */}
          {newCards.length > 0 && (
            <section>
              <h3 className="text-sm font-medium mb-2">
                New cards ({newCards.length})
              </h3>
              <div className="space-y-2">
                {newCards.map((card, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2"
                    data-testid="new-card-row"
                  >
                    <Input
                      value={card.front}
                      onChange={(e) =>
                        updateNewCardField(i, 'front', e.target.value)
                      }
                      aria-label={`New card ${i + 1} front`}
                      className="flex-1"
                    />
                    <Input
                      value={card.back}
                      onChange={(e) =>
                        updateNewCardField(i, 'back', e.target.value)
                      }
                      aria-label={`New card ${i + 1} back`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNewCard(i)}
                      aria-label={`Remove new card ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Updating Section */}
          {updateCards.length > 0 && (
            <section>
              <h3 className="text-sm font-medium mb-2">
                Updating ({updateCards.length})
              </h3>
              <div className="space-y-2">
                {updateCards.map((card, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2"
                    data-testid="update-card-row"
                  >
                    <span className="flex-1 text-sm text-muted-foreground truncate">
                      {card.front}
                    </span>
                    <span className="flex-1 text-sm text-muted-foreground/60 line-through truncate">
                      {card.oldBack}
                    </span>
                    <Input
                      value={card.newBack}
                      onChange={(e) => updateUpdateCardBack(i, e.target.value)}
                      aria-label={`Update card ${i + 1} new back`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUpdateCard(i)}
                      aria-label={`Remove update card ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skipped Section */}
          {skippedRows.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Skipped ({skippedRows.length})
              </h3>
              <div className="space-y-1">
                {skippedRows.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground/60"
                    data-testid="skipped-row"
                  >
                    <span className="flex-1 truncate">{row.front}</span>
                    <span className="flex-1 truncate">{row.back}</span>
                    <span className="flex-1 text-xs italic">{row.reason}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!hasChanges && skippedRows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No cards to import.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!hasChanges || isPending}>
            {isPending ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
