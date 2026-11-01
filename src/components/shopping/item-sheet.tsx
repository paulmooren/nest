"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ds/button";
import { Field } from "@/components/ds/field";
import { Input } from "@/components/ds/input";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { TextField } from "@/components/ds/text-field";
import { parseAmount, stepAmount } from "@/components/shopping/quantity-stepper";

/** One item: its name, its amount (− / + / typed, "500 g" works), and the ways to keep or remove it. */
export function ItemSheet({
  item,
  isFavorite,
  onUpdate,
  onToggleFavorite,
  onRemove,
  onClose,
}: {
  item: { id: string; name: string; quantity: string | null };
  isFavorite: boolean;
  onUpdate: (values: { name?: string; quantity?: string | null }) => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [typing, setTyping] = useState(false);
  const { num, comma } = parseAmount(item.quantity);
  const shown = comma ? String(num).replace(".", ",") : String(num);

  const close = () => {
    const next = name.trim();
    if (next && next !== item.name) onUpdate({ name: next });
    onClose();
  };

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && close()} title="Item">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} enterKeyHint="done" />

        <Field id="item-amount" label="Amount">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="One less"
              onClick={() => {
                const next = stepAmount(item.quantity, -1);
                if (next === "remove") onRemove();
                else onUpdate({ quantity: next });
              }}
            >
              <MinusIcon />
            </Button>
            {typing ? (
              <Input
                id="item-amount"
                defaultValue={item.quantity ?? "1"}
                autoFocus
                maxLength={30}
                className="w-28 text-center font-semibold tabular-nums"
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => {
                  setTyping(false);
                  const typed = e.target.value.trim();
                  const next = typed === "" || typed === "1" ? null : typed;
                  if (next !== item.quantity) onUpdate({ quantity: next });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
            ) : (
              <Button
                id="item-amount"
                type="button"
                variant="ghost"
                onClick={() => setTyping(true)}
                aria-label={`Amount ${item.quantity ?? "1"}, change`}
                className="min-w-20 text-base font-semibold tabular-nums"
              >
                {item.quantity ?? shown}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="One more"
              onClick={() => onUpdate({ quantity: stepAmount(item.quantity, 1) as string | null })}
            >
              <PlusIcon />
            </Button>
          </div>
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" className="flex-1">
            Done
          </Button>
          <Button type="button" variant="outline" size="lg" aria-pressed={isFavorite} onClick={onToggleFavorite}>
            <StarIcon className={isFavorite ? "fill-current" : ""} />
            {isFavorite ? "Favorite" : "Make favorite"}
          </Button>
          <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
