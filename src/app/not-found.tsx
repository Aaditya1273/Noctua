import { ButtonLink, PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <div>
      <PageHeader title="Not found" lead="That task, skill or page does not exist — it may belong to a database that was reset." />
      <ButtonLink href="/">Back to overview</ButtonLink>
    </div>
  );
}
