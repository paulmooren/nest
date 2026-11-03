import { redirect } from "next/navigation";

// Accounts live on the Budget page now.
export default function AccountsPage() {
  redirect("/finance/budgets");
}
