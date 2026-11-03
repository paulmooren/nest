"use client";

import { ChevronRightIcon, DownloadIcon, PencilLineIcon } from "lucide-react";

import { ResponsiveSheet } from "@/components/ui/responsive-sheet";

/**
 * The first step of the Budget page's one add action: two ways to get a Recurring item onto the page. Typing one in
 * needs nothing; importing a statement needs a Financial account the Member can edit.
 */
export function AddSheet({
  canImport,
  onType,
  onImport,
  onClose,
}: {
  canImport: boolean;
  onType: () => void;
  onImport: () => void;
  onClose: () => void;
}) {
  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="Add">
      <div className="flex flex-col gap-3">
        <Choice icon={<PencilLineIcon />} title="Type one in" detail="A recurring income, expense or transfer." onClick={onType} />
        <Choice
          icon={<DownloadIcon />}
          title="Import a statement"
          detail={canImport ? "Finds your recurring income and expenses in a bank CSV." : "Add an account first."}
          onClick={onImport}
          disabled={!canImport}
        />
      </div>
    </ResponsiveSheet>
  );
}

function Choice({
  icon,
  title,
  detail,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border bg-muted text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium md:text-sm">{title}</span>
        <span className="block text-sm text-muted-foreground md:text-xs">{detail}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
