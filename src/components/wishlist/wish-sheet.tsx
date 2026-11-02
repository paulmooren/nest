"use client";

import { useState } from "react";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
import { parseMoney } from "@/lib/money";
import type { WishData } from "@/components/wishlist/types";
import type { WishFormValues } from "@/components/wishlist/types";

/** One wish, new or existing. Only the title is required. An existing wish can also be marked received or deleted. */
export function WishSheet({
  wish,
  onSubmit,
  onSetReceived,
  onDelete,
  onClose,
}: {
  wish?: WishData;
  onSubmit: (values: WishFormValues) => void;
  onSetReceived?: (received: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(wish?.title ?? "");
  const [url, setUrl] = useState(wish?.url ?? "");
  const [price, setPrice] = useState(wish?.price != null ? String(wish.price) : "");
  const [note, setNote] = useState(wish?.note ?? "");

  const parsed = price.trim() === "" ? null : parseMoney(price);
  const priceError = price.trim() !== "" && (parsed === null || parsed < 0) ? "Enter an amount like 12,50." : undefined;
  const valid = title.trim() !== "" && !priceError;

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={wish ? "Wish" : "New wish"}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSubmit({ title: title.trim(), url: url.trim() || null, price: parsed, note: note.trim() || null });
          onClose();
        }}
      >
        <TextField
          label="What do you wish for?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus={!wish}
        />
        <TextField label="Link" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} inputMode="url" autoCapitalize="none" />
        {wish?.url && (
          <a
            href={wish.url}
            target="_blank"
            rel="noopener noreferrer"
            className="-mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Open link <ExternalLinkIcon className="size-3.5" aria-hidden />
          </a>
        )}
        <TextField label="Price (€)" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0,00" error={priceError} />
        <Field id="wish-note" label="Note">
          <Textarea id="wish-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={!valid} className="flex-1">
            {wish ? "Save" : "Add wish"}
          </Button>
          {wish && onSetReceived && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                onSetReceived(!wish.receivedAt);
                onClose();
              }}
            >
              {wish.receivedAt ? "Undo received" : "Mark received"}
            </Button>
          )}
          {wish && onDelete && (
            <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </form>
    </ResponsiveSheet>
  );
}
