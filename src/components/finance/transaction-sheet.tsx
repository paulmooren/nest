"use client";

import { Button } from "@base-ui/react/button";

import { ChoiceChips, SheetField } from "@/components/choice-chips";
import { Modal, ModalFooter } from "@/components/modal";
import type { Category } from "@/components/finance/category-cell";
import { formatDate, formatEUR } from "@/lib/format";

const NONE = "none";

/** One transaction in full, as a bottom sheet: the phone's stand-in for the table row's category menu and icon buttons. */
export function TransactionSheet({
  label,
  amount,
  inflow,
  type,
  date,
  accountLine,
  categoryId,
  categoryName,
  categories,
  canEdit,
  recurringText,
  onCategory,
  onMarkRecurring,
  onDelete,
  onClose,
}: {
  label: string;
  amount: number;
  inflow: boolean;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  date: Date | string;
  accountLine: string;
  categoryId: string | null;
  categoryName: string | null;
  categories: Category[];
  canEdit: boolean;
  /** "Recurring · every month" when it belongs to a recurring item. */
  recurringText: string | null;
  onCategory: (categoryId: string | null) => void;
  onMarkRecurring: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Transaction" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[17px] font-medium break-words">{label}</p>
          <p className={`mt-1 font-display text-[32px] font-bold tracking-tight tabular-nums ${inflow ? "text-good" : ""}`}>
            {inflow ? "+" : "−"} {formatEUR(amount)}
          </p>
          <p className="mt-1 text-[14px] text-text-muted">
            {formatDate(date)} · {accountLine}
          </p>
          {recurringText && <p className="mt-1 text-[14px] text-good">{recurringText}</p>}
        </div>

        {type !== "TRANSFER" && (
          <SheetField label="Category">
            {canEdit ? (
              <ChoiceChips
                label="Category"
                value={categoryId ?? NONE}
                onChange={(v) => onCategory(v === NONE ? null : v)}
                options={[
                  { value: NONE, label: "No category" },
                  ...categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                    leading: <span className="block h-2 w-2 rounded-full" style={{ background: c.color }} />,
                  })),
                ]}
              />
            ) : (
              <p className="text-[15px]">{categoryName ?? "No category"}</p>
            )}
          </SheetField>
        )}
      </div>
      <ModalFooter>
        <Button
          type="button"
          onClick={onClose}
          className="min-h-[var(--tap-primary)] flex-1 rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-accent-ink"
        >
          Done
        </Button>
        {canEdit && !recurringText && (
          <Button
            type="button"
            onClick={onMarkRecurring}
            className="min-h-[var(--tap-primary)] rounded-xl border border-border-soft px-4 text-[15px] font-medium"
          >
            Mark recurring
          </Button>
        )}
        {canEdit && (
          <Button
            type="button"
            onClick={onDelete}
            className="min-h-[var(--tap-primary)] rounded-xl border border-border-soft px-4 text-[15px] font-medium text-critical"
          >
            Delete
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
