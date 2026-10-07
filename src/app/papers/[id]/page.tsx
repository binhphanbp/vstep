import { notFound } from "next/navigation";
import { PaperRunner } from "@/components/paper-runner";
import { paperCatalog } from "@/lib/papers";

export function generateStaticParams() {
  return paperCatalog.map((paper) => ({ id: paper.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: paperCatalog.find((paper) => paper.id === id)?.title ?? "Đề luyện",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!paperCatalog.some((paper) => paper.id === id)) notFound();
  return <PaperRunner paperId={id} />;
}
