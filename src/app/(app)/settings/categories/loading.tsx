import { LoadingScreen, FormSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingScreen>
      <FormSkeleton fields={5} />
    </LoadingScreen>
  );
}
