import { notFound } from "next/navigation";
import { BankReviewPage } from "@/components/bank-review";
import { bankGroup, bankGroups } from "@/lib/review-bank";
export function generateStaticParams() {
  return bankGroups.map((group) => ({ group: group.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  return { title: `Duyệt học liệu · ${bankGroup(group)?.title ?? "Gói"}` };
}
export default async function Page({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const found = bankGroup(group);
  if (!found) notFound();
  return <BankReviewPage group={found} />;
}
