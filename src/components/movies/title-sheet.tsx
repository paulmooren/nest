"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/toast";
import { StarPicker, Stars } from "@/components/movies/stars";
import { SECTION_HEADING } from "@/components/recipes/recipes-ui";
import { KIND_LABEL, progressLabel, RATING_NOTE_MAX, STATUS_LABEL, STATUSES, type TitleStatus } from "@/lib/movies";

export type TitleRow = inferRouterOutputs<AppRouter>["movies"]["list"][number];
type Member = { user: { id: string; name: string | null; email: string; image?: string | null } };

/**
 * One Title, opened from the list: where it stands (Want to watch, Watching, Watched), your own rating
 * and note, and what the others thought. Whoever can edit its Watchlist can also move or delete it.
 */
export function TitleSheet({
  title,
  meId,
  members,
  canEdit,
  watchlists,
  onChanged,
  onClose,
}: {
  title: TitleRow;
  meId: string;
  members: Member[];
  canEdit: boolean;
  /** Watchlists the Member can edit, to move the Title to. */
  watchlists: { id: string; name: string }[];
  onChanged: () => Promise<unknown>;
  onClose: () => void;
}) {
  const setStatus = trpc.movies.setStatus.useMutation({ onSuccess: onChanged });
  const update = trpc.movies.update.useMutation({ onSuccess: onChanged });
  const rate = trpc.movies.rate.useMutation({ onSuccess: onChanged });
  const setProgress = trpc.movies.setProgress.useMutation({ onSuccess: onChanged });
  const remove = trpc.movies.delete.useMutation({ onSuccess: onChanged });
  const mine = title.ratings.find((r) => r.userId === meId);
  const [stars, setStars] = useState<number | null>(mine?.halfStars ?? null);
  const [note, setNote] = useState(mine?.note ?? "");
  const [confirming, setConfirming] = useState(false);

  const others = title.ratings.filter((r) => r.userId !== meId && (r.halfStars !== null || r.note));
  const items = watchlists.map((w) => ({ value: w.id, label: w.name }));
  const noteChanged = note.trim() !== (mine?.note ?? "");

  const saveRating = async (halfStars: number | null, text: string) => {
    try {
      await rate.mutateAsync({ titleId: title.id, halfStars, note: text.trim() });
    } catch {
      showToast("Couldn't save your rating");
    }
  };

  return (
    <>
      <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={title.name} description={KIND_LABEL[title.kind]}>
        <div className="flex flex-col gap-5">
          {canEdit ? (
            <ChoiceChips<TitleStatus>
              label="Status"
              value={title.status}
              onChange={(status) => setStatus.mutate({ id: title.id, status })}
              options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{STATUS_LABEL[title.status]}</p>
          )}
          {title.watchedAt && (
            <p className="-mt-3 text-sm text-muted-foreground">
              Watched on {new Date(title.watchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}

          {title.kind === "SERIES" && canEdit && (
            <div className="flex flex-col gap-2">
              <h3 className={SECTION_HEADING}>Where you are</h3>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <Counter
                  label="Season"
                  value={title.season}
                  max={99}
                  onChange={(season) => setProgress.mutate({ id: title.id, season, episode: season === null ? null : season === title.season ? title.episode : 1 })}
                />
                <Counter
                  label="Episode"
                  value={title.episode}
                  max={999}
                  onChange={(episode) => setProgress.mutate({ id: title.id, season: episode === null ? title.season : (title.season ?? 1), episode })}
                />
              </div>
            </div>
          )}
          {title.kind === "SERIES" && !canEdit && progressLabel(title) && <p className="text-sm text-muted-foreground">Up to {progressLabel(title)}</p>}

          <div className="flex flex-col gap-2">
            <h3 className={SECTION_HEADING}>Your rating</h3>
            <StarPicker
              value={stars}
              onChange={(next) => {
                setStars(next);
                void saveRating(next, note);
              }}
            />
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={RATING_NOTE_MAX}
              placeholder="What did you think?"
              aria-label="Your note"
              className="min-h-20"
            />
            {noteChanged && (
              <Button variant="outline" className="self-start" disabled={rate.isPending} onClick={() => saveRating(stars, note)}>
                Save note
              </Button>
            )}
          </div>

          {others.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className={SECTION_HEADING}>What the others thought</h3>
              {others.map((r) => {
                const member = members.find((m) => m.user.id === r.userId);
                const name = member?.user.name || member?.user.email || "Someone";
                return (
                  <div key={r.userId} className="flex gap-3">
                    <Avatar name={name} image={member?.user.image} size={24} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {name}
                        {r.halfStars !== null && <Stars halfStars={r.halfStars} />}
                      </span>
                      {r.note && <p className="text-sm break-words text-muted-foreground">{r.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canEdit && (
            <div className="flex flex-col gap-4 border-t pt-4">
              {items.length > 1 && (
                <Field id="title-watchlist" label="Watchlist">
                  <Select items={items} value={title.watchlistId} onValueChange={(v) => v && v !== title.watchlistId && update.mutate({ id: title.id, watchlistId: v })}>
                    <SelectTrigger id="title-watchlist" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Button variant="outline" className="self-start text-destructive" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            </div>
          )}
        </div>
      </ResponsiveSheet>

      <ConfirmDelete
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete "${title.name}"?`}
        description="Everyone's ratings of it are deleted too. This can't be undone."
        onConfirm={async () => {
          await remove.mutateAsync({ id: title.id });
          onClose();
        }}
      />
    </>
  );
}

/** Season or episode: a number stepped up or down. Stepping below 1 stops keeping track of it. */
function Counter({ label, value, max, onChange }: { label: string; value: number | null; max: number; onChange: (value: number | null) => void }) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <span className="w-16 text-sm text-muted-foreground">{label}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`${label} back one`}
        disabled={value === null}
        onClick={() => onChange(value === null || value <= 1 ? null : value - 1)}
      >
        <MinusIcon />
      </Button>
      <span className="min-w-10 text-center text-base font-medium tabular-nums md:text-sm" aria-live="polite">
        {value ?? "–"}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`${label} on one`}
        disabled={value !== null && value >= max}
        onClick={() => onChange((value ?? 0) + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
