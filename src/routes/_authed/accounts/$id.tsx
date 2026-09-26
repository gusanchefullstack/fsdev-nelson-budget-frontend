import { createFileRoute } from "@tanstack/react-router";
import { PartyDetailPage } from "@/features/parties/pages";

export const Route = createFileRoute("/_authed/accounts/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return <PartyDetailPage key={id} collection="accounts" id={id} />;
}
