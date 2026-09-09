import { notFound } from "next/navigation";
import { allLessons as lessons } from "@/lib/full-exam-content";
import { PracticeSession } from "@/components/practice";
export function generateStaticParams() {
  return lessons.map((l) => ({ id: l.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: lessons.find((l) => l.id === id)?.title ?? "Bài học" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) notFound();
  return <PracticeSession key={id} lesson={lesson} />;
}
