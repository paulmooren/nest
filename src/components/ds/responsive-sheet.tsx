"use client"

import * as React from "react"

import { useIsPhone } from "@/components/use-media-query"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ds/sheet"

/**
 * Opened by touch, focus goes to the sheet itself, not its first field: a field would raise the phone keyboard over
 * the content the person came to read. Keyboard and mouse still land on the first field.
 */
const initialFocus = (openType: string) =>
  openType === "touch"
    ? (document.querySelector<HTMLElement>('[data-slot="sheet-content"], [data-slot="dialog-content"]') ?? true)
    : true

/**
 * One detail/form container, two presentations: a bottom sheet on a phone, a centred dialog on desktop. The
 * content is written once. Controlled: the caller owns `open`.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}) {
  const phone = useIsPhone()

  if (phone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" initialFocus={initialFocus} className={cn("max-h-[90dvh] overflow-y-auto rounded-t-3xl pb-safe")}>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="px-4 pb-4">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent initialFocus={initialFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
