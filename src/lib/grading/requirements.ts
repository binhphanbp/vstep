/**
 * The points a task requires, fixed per task so the grader checks the same
 * list every time instead of re-reading the task and deciding afresh.
 *
 * Three sources, in order:
 *  1. APPROVED_REQUIREMENTS — a list the owner has approved for one task.
 *  2. The task's own bullet or numbered lines (Task 1 letters and emails list
 *     their points that way), which is the task text itself, not an opinion.
 *  3. A template for the common essay types (Task 2). These are the owner's to
 *     approve once; until ESSAY_TEMPLATES_APPROVED is true they are not used,
 *     so no essay is graded against a list nobody has signed off.
 */
export type Requirement = { id: string; text: string };

const point = (id: string, text: string): Requirement => ({ id, text });

/**
 * Lists for the tasks whose points are sentences, not bullets. Each one is the
 * task's own instruction split at its commas: nothing is added to what the
 * task says, so nothing is expected of the learner that the task did not ask.
 * Keyed by the lesson id or the paper slot id.
 */
export const APPROVED_REQUIREMENTS: Record<string, Requirement[]> = {
  "writing-email": [
    point("r1", "recommend a place or area to stay"),
    point("r2", "suggest activities you could do together"),
    point("r3", "give advice about what to pack"),
  ],
  "writing-request": [
    point("r1", "explain why you want to join"),
    point("r2", "ask about evening or weekend classes"),
    point("r3", "request information about fees and learning materials"),
  ],
  "writing-complaint": [
    point("r1", "describe the problem"),
    point("r2", "explain when and where you bought the fan"),
    point("r3", "say what you would like the shop to do"),
  ],
  "writing-apology": [
    point("r1", "apologise and explain the situation"),
    point("r2", "suggest another way you can help"),
    point("r3", "propose a new time to meet"),
  ],
  "writing-directions": [
    point("r1", "explain how to travel there by bus or motorbike"),
    point("r2", "describe what to look for near your home"),
    point("r3", "say what to do if they get lost"),
  ],
  "review-1309-writing-2": [
    point(
      "r1",
      "explain the reasons some learners prefer attending classes in person",
    ),
    point(
      "r2",
      "support the answer with examples from the writer's own learning experience",
    ),
  ],
};

/**
 * The three templates below read the kind of essay off the task's own wording
 * ("discuss both views", "to what extent do you agree", "causes… solutions…").
 * Accepted by the owner on 09/10/2026, when Task 2 could not be graded without
 * them; they can be reviewed in this file and set back to false at any time.
 */
export const ESSAY_TEMPLATES_APPROVED = true;

const LIST_LINE = /^(?:[•·*-]|\d+[.)])\s+\S/;

/** The bullet or numbered lines of a task text, in order. */
export function bulletRequirements(prompt: string): Requirement[] {
  return prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => LIST_LINE.test(line))
    .map((line, index) => ({
      id: `r${index + 1}`,
      text: line.replace(/^(?:[•·*-]|\d+[.)])\s+/, "").replace(/[;.]$/, ""),
    }));
}

const ONE_WITH_REASONS: Requirement = {
  id: "support",
  text: "Supports the ideas with reasons and examples",
};

export const ESSAY_TEMPLATES: {
  type: string;
  matches: RegExp;
  requirements: Requirement[];
}[] = [
  {
    type: "discuss both views",
    matches: /discuss both (?:of )?(?:these |the )?views?/i,
    requirements: [
      { id: "view1", text: "Discusses the first view" },
      { id: "view2", text: "Discusses the second view" },
      { id: "opinion", text: "Gives the writer's own opinion" },
      ONE_WITH_REASONS,
    ],
  },
  {
    type: "extent of agreement",
    matches: /to what extent|do you agree or disagree|agree or disagree/i,
    requirements: [
      {
        id: "position",
        text: "States a clear position (agree, disagree or partly agree)",
      },
      { id: "reasons", text: "Gives reasons for that position" },
      { id: "examples", text: "Includes relevant examples" },
    ],
  },
  {
    type: "causes and solutions",
    matches: /causes?\b[\s\S]*\b(?:solutions?|what can be done|reduce)/i,
    requirements: [
      { id: "causes", text: "Explains the main causes" },
      { id: "solutions", text: "Suggests what can be done about it" },
      ONE_WITH_REASONS,
    ],
  },
];

export function essayTemplateFor(prompt: string) {
  return ESSAY_TEMPLATES.find((template) => template.matches.test(prompt));
}

/** Approved list, then the task's own lines, then an approved essay template, else null. */
export function requirementsFor(
  slotId: string,
  prompt: string,
  options: { templatesApproved?: boolean } = {},
): Requirement[] | null {
  const approved = APPROVED_REQUIREMENTS[slotId];
  if (approved?.length) return approved;
  const bullets = bulletRequirements(prompt);
  if (bullets.length >= 2) return bullets;
  if (options.templatesApproved ?? ESSAY_TEMPLATES_APPROVED)
    return essayTemplateFor(prompt)?.requirements ?? null;
  return null;
}
