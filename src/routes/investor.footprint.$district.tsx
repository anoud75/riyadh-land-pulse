import { createFileRoute, redirect } from "@tanstack/react-router";

// The district footprint now lives on the map itself.
export const Route = createFileRoute("/investor/footprint/$district")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/investor/map", search: { footprint: params.district } });
  },
});
