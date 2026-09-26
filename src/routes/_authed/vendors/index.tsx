import { createFileRoute } from "@tanstack/react-router";
import { PartyListPage } from "@/features/parties/pages";

export const Route = createFileRoute("/_authed/vendors/")({
  component: () => <PartyListPage collection="vendors" />,
});
