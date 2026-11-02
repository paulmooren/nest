import { cn } from "@/lib/utils"
import { formatEUR, formatSignedEUR } from "@/lib/format"

/** A money amount in tabular numerals, right-aligned by its parent. Signed amounts take the status colour. */
export function AmountText({
  value,
  signed = false,
  className,
}: {
  value: number
  signed?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        signed && value > 0 && "text-success",
        signed && value < 0 && "text-destructive",
        className
      )}
    >
      {signed ? formatSignedEUR(value) : formatEUR(value)}
    </span>
  )
}
