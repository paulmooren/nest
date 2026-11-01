"use client"

import * as React from "react"

import { Field } from "@/components/ds/field"
import { Input } from "@/components/ds/input"

/** A labelled text input with its hint or error wired to it, so a screen reader reads the error with the field. */
export function TextField({
  label,
  hint,
  error,
  fieldClassName,
  id: idProp,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "id"> & {
  id?: string
  label: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  fieldClassName?: string
}) {
  const auto = React.useId()
  const id = idProp ?? auto
  return (
    <Field id={id} label={label} hint={hint} error={error} className={fieldClassName}>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </Field>
  )
}
