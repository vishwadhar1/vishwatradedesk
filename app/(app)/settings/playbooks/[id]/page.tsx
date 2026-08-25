import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { PlaybookEditor } from "../PlaybookEditor";

export default async function EditPlaybookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [playbook] = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.id, id));
  if (!playbook) notFound();

  return <PlaybookEditor playbook={playbook} />;
}
