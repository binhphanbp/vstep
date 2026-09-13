import type { Question } from "./content";

/**
 * Fixes each question's option order from its own id.
 *
 * The authored order had fallen into a repeating pattern: across the exam's
 * Reading section the keys read BCADB BCADB…, so guessing that cycle scored
 * 33 of 40 without reading a word. Deriving the order from the id instead
 * gives a position that carries no pattern, and gives the same order every
 * time the learner meets the question, so a saved draft still means what it
 * said.
 *
 * The salt was picked by measuring every bank over 3000 candidates: it is the
 * one where no repeating cycle beats half the keys, no letter takes more than
 * a third of a bank, and no lesson shows the same key three times in a row.
 * Exact balance was deliberately not forced — a four-question lesson holding
 * one of each letter would let the last answer be deduced from the first
 * three. Changing the salt reshuffles published content and needs the same
 * lesson version bump this one did.
 * `tests/unit/option-order.test.ts` measures all of it.
 */
const SALT = "may-r269";

const ORDERS: number[][] = [];
for (const first of [0, 1, 2, 3])
  for (const second of [0, 1, 2, 3])
    if (second !== first)
      for (const third of [0, 1, 2, 3])
        if (third !== first && third !== second)
          for (const fourth of [0, 1, 2, 3])
            if (fourth !== first && fourth !== second && fourth !== third)
              ORDERS.push([first, second, third, fourth]);

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++)
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return value >>> 0;
}

export function withStableOptionOrder<T extends Question>(question: T): T {
  if (question.options.length !== ORDERS[0].length) return question;
  const order = ORDERS[hash(`${SALT}:${question.id}`) % ORDERS.length];
  const reordered: T = {
    ...question,
    options: order.map((index) => question.options[index]),
    answer: order.indexOf(question.answer),
  };
  // Notes are aligned to options, so they have to move with them.
  if (question.optionNotes)
    reordered.optionNotes = order.map((index) => question.optionNotes![index]);
  return reordered;
}
