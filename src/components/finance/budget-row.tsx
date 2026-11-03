"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";

import { formatEUR } from "@/lib/format";
import { describeSchedule } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Item } from "@/components/finance/budget-types";
import { useIsPhone } from "@/components/use-media-query";

/**
 * One recurring item: its name and monthly-schedule line, the Budgeted amount, and (when the payments suggest a
 * different amount) an Update / Keep prompt on its own line. Tapping opens the item's sheet. Draggable: by the grip
 * on a wide screen, by press-and-hold anywhere on the row on a phone.
 */
export function BudgetRow({
  item,
  transferText,
  canEdit,
  compact,
  onOpen,
  onAcceptProposal,
  onKeepAmount,
}: {
  item: Item;
  /** "Transfer to X" / "Transfer from Y" for a transfer, else null. */
  transferText: string | null;
  canEdit: boolean;
  /** Inside an opened account: no category dot, a quieter row. */
  compact?: boolean;
  onOpen: () => void;
  onAcceptProposal: () => void;
  onKeepAmount: () => void;
}) {
  const phone = useIsPhone();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canEdit,
  });

  const meta = [transferText, describeSchedule(item.intervalCount, item.intervalUnit), item.amountVaries ? "varies" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      ref={setNodeRef}
      {...(phone && canEdit ? listeners : {})}
      // Up and down only: the row follows the pointer vertically.
      style={{ transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null), transition }}
      className={cn(
        "relative bg-card max-md:select-none max-md:[-webkit-touch-callout:none]",
        isDragging && "z-10 rounded-xl shadow-lg"
      )}
    >
      <div className="flex items-center gap-2 rounded-xl pl-0 transition-colors hover:bg-muted/60 md:-mx-2 md:px-2">
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.name}`}
            className="hidden cursor-grab touch-none text-muted-foreground active:cursor-grabbing md:inline-flex"
          >
            <GripVerticalIcon />
          </Button>
        ) : (
          <span className="hidden w-6 shrink-0 md:block" aria-hidden />
        )}
        {!compact && <span className="block size-3 shrink-0 rounded-full " style={{ background: item.category?.color ?? "#9a9da5" }} aria-hidden />}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${item.name}: open details`}
          className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-xl py-3 text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", compact ? "min-h-12" : "min-h-14")}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium md:text-sm">{item.name}</span>
            <span className="block text-sm text-muted-foreground md:text-xs">{meta}</span>
          </span>
          <span className="shrink-0 text-base font-semibold tabular-nums md:text-sm">{formatEUR(item.amount)}</span>
        </button>
      </div>

      {item.drift !== null && (
        <p className="pb-3 pl-5 text-sm text-muted-foreground md:pl-16 md:text-xs">Payments are now {formatEUR(item.drift)}</p>
      )}

      {item.proposal !== null && (
        <div data-proposal className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3 pl-5 md:pl-16">
          <span className="text-sm font-medium">
            New amount {formatEUR(item.proposal)}
            <span className="font-normal text-muted-foreground"> · was {formatEUR(item.amount)}</span>
          </span>
          {canEdit && (
            <span className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={onAcceptProposal}>
                Update
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onKeepAmount}>
                Keep
              </Button>
            </span>
          )}
        </div>
      )}
    </li>
  );
}
