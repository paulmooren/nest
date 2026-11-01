"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { AmountText } from "@/components/ds/amount-text"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ds/alert-dialog"
import { Badge } from "@/components/ds/badge"
import { Button } from "@/components/ds/button"
import { Checkbox } from "@/components/ds/checkbox"
import { EmptyState } from "@/components/ds/empty-state"
import { Field } from "@/components/ds/field"
import { Input } from "@/components/ds/input"
import { PageBody, PageHeader } from "@/components/ds/page-header"
import { ResponsiveSheet } from "@/components/ds/responsive-sheet"
import { SectionTabs } from "@/components/ds/section-tabs"
import { Row, RowList } from "@/components/ds/row"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds/select"
import { Skeleton } from "@/components/ds/skeleton"
import { Switch } from "@/components/ds/switch"
import { Textarea } from "@/components/ds/textarea"

const TABS = [
  { href: "/kit", label: "Overview" },
  { href: "/kit/finance", label: "Finance" },
  { href: "/kit/tasks", label: "Tasks" },
]

const ROWS = [
  { id: "1", merchant: "Albert Heijn", meta: "Joint · Groceries", amount: -42.18 },
  { id: "2", merchant: "Salary", meta: "Paul · Income", amount: 3250 },
  { id: "3", merchant: "Vattenfall energy contract with a very long name that must not push the amount away", meta: "Joint · Housing & Utilities", amount: -118.5 },
]

function CategoryDot({ color }: { color: string }) {
  return <span className="size-3 rounded-full" style={{ background: color }} aria-hidden />
}

export function KitOverview() {
  const [open, setOpen] = React.useState(false)
  const [checked, setChecked] = React.useState(true)
  const [error, setError] = React.useState(false)

  return (
    <>
      <PageHeader
        title="Kitchen sink"
        description="Every primitive of the rebuilt design system, at the width you are looking at."
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon /> New
          </Button>
        }
      />
      <PageBody>
        <SectionTabs tabs={TABS} label="Kit sections" />

        <section aria-label="Key figure" className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Left each month</p>
          <p className="font-heading text-4xl font-bold tracking-tight tabular-nums">€1,284.00</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Rows</h2>
          <RowList>
            {ROWS.map((r) => (
              <Row
                key={r.id}
                leading={<CategoryDot color={r.amount > 0 ? "#6ee7a8" : "#e0b04d"} />}
                title={r.merchant}
                meta={r.meta}
                trailing={<AmountText value={r.amount} signed />}
                onClick={() => setOpen(true)}
              />
            ))}
          </RowList>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Buttons and badges</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Badge>Shared</Badge>
            <Badge variant="outline">Personal</Badge>
          </div>
        </section>

        <section className="grid max-w-xl gap-4">
          <h2 className="text-lg font-semibold">Form</h2>
          <Field id="kit-name" label="Name" hint="Shown in the list.">
            <Input id="kit-name" placeholder="Rent" />
          </Field>
          <Field id="kit-amount" label="Amount" error={error ? "Enter an amount above zero." : undefined}>
            <Input
              id="kit-amount"
              inputMode="decimal"
              placeholder="0,00"
              aria-invalid={error || undefined}
              aria-describedby={error ? "kit-amount-error" : undefined}
              onBlur={(e) => setError(e.target.value.trim() === "")}
            />
          </Field>
          <Field id="kit-account" label="Account">
            <Select defaultValue="joint">
              <SelectTrigger id="kit-account" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="joint">Joint account</SelectItem>
                <SelectItem value="paul">Paul — checking</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="kit-note" label="Note">
            <Textarea id="kit-note" />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-base md:text-sm">
            <Checkbox checked={checked} onCheckedChange={setChecked} />
            Include in Left each month
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 text-base md:text-sm">
            Visible to household
            <Switch />
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">States</h2>
          <div className="flex flex-col gap-2" aria-label="Loading example">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <EmptyState
            title="No transactions yet."
            action={<Button variant="outline">Import a statement</Button>}
          />
          <AlertDialogDemo />
        </section>
      </PageBody>

      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Albert Heijn"
        description="Bottom sheet on a phone, dialog on desktop."
      >
        <div className="grid gap-4">
          <Field id="sheet-cat" label="Category">
            <Input id="sheet-cat" defaultValue="Groceries" />
          </Field>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </div>
      </ResponsiveSheet>
    </>
  )
}

function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" className="w-fit" />}>
        Remove all
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove all transactions?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Remove all</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function KitSecond({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <SectionTabs tabs={TABS} label="Kit sections" />
        <p className="text-sm text-muted-foreground">Second page of the section, to prove tab navigation.</p>
      </PageBody>
    </>
  )
}
