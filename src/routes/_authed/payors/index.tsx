import { createFileRoute } from "@tanstack/react-router";
import { PartyListPage } from "@/features/parties/pages";

export const Route = createFileRoute("/_authed/payors/")({
  component: () => <PartyListPage collection="payors" />,
});
