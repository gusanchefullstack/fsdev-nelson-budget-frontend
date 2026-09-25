import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  return (
    <section aria-labelledby="dashboard-title" className="grid gap-4">
      <h1 id="dashboard-title" className="text-2xl font-bold">
        Welcome, {user.firstName}
      </h1>
    </section>
  );
}
