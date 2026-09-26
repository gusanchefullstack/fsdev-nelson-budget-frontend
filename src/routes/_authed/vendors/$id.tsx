import { createFileRoute } from "@tanstack/react-router";
import { PartyDetailPage } from "@/features/parties/pages";

export const Route = createFileRoute("/_authed/vendors/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return <PartyDetailPage key={id} collection="vendors" id={id} />;
}
