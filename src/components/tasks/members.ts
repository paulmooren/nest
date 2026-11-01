import type { Member } from "@/components/tasks/types";

export const memberName = (m: Member) => m.user.name || m.user.email;

/** Members with the current one first: the order every assignee picker uses. */
export function meFirst(members: Member[], currentUserId: string) {
  return [...members].sort((a, b) => (a.user.id === currentUserId ? -1 : b.user.id === currentUserId ? 1 : 0));
}

/** "You", a name, or "Everyone": who a todo or reminder is for. */
export function assigneeLabel(ownerId: string | null, members: Member[], currentUserId: string) {
  if (ownerId === null) return "Everyone";
  if (ownerId === currentUserId) return "You";
  const m = members.find((x) => x.user.id === ownerId);
  return m ? memberName(m) : "Someone";
}

/** Choice-chip options for "Assigned to". */
export function assigneeOptions(members: Member[], currentUserId: string) {
  return [
    ...meFirst(members, currentUserId).map((m) => ({
      value: m.user.id,
      label: m.user.id === currentUserId ? "You" : memberName(m),
    })),
    { value: "everyone", label: "Everyone" },
  ];
}
