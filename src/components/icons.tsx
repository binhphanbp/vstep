import {
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  type LucideIcon,
} from "lucide-react";
import type { Skill } from "@/lib/content";
export const skillIcons: Record<Skill, LucideIcon> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};
export function SkillIcon({
  skill,
  size = 22,
}: {
  skill: Skill;
  size?: number;
}) {
  const Icon = skillIcons[skill];
  return (
    <span className={`skill-icon ${skill}`}>
      <Icon size={size} />
    </span>
  );
}
