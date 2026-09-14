/**
 * Vocabulary cards written for the questions that test a word in context.
 *
 * A "từ vựng trong ngữ cảnh" question already contains almost a whole card:
 * the word is in the stem and the sentence that settles it is the evidence
 * quote. What it does not contain is a Vietnamese meaning or a pronunciation —
 * the correct option is an English gloss ("worth the effort it costs"), which
 * would make a card noticeably worse than the twenty written by hand.
 *
 * So the meaning and the IPA are authored here, once per question, and the
 * example is the sentence from the passage she actually met the word in. The
 * cards are content, not learner data: state stores only which ones she added
 * and when, so a card can be corrected later without touching her history.
 */
export type WordCard = {
  word: string;
  ipa: string;
  meaning: string;
  example: string;
  topic: string;
};
export const wordCards: Record<string, WordCard> = {
  rc4: {
    word: "regularly",
    ipa: "/ˈreɡjələli/",
    meaning: "thường xuyên, đều đặn",
    example:
      "However, many visitors returned regularly and recommended the café to their friends.",
    topic: "Cuộc sống Sài Gòn",
  },
  rm4: {
    word: "durable",
    ipa: "/ˈdjʊərəbl/",
    meaning: "bền, giữ được lâu",
    example:
      "Reviewing material across several days generally produces more durable learning than a single long session.",
    topic: "Giáo dục",
  },
  rk4: {
    word: "doubtful",
    ipa: "/ˈdaʊtfl/",
    meaning: "còn nghi ngại, chưa bị thuyết phục",
    example:
      "Mrs Tam was doubtful: she did not want to photograph every bundle of herbs.",
    topic: "Cuộc sống Sài Gòn",
  },
  rh4: {
    word: "explicitly",
    ipa: "/ɪkˈsplɪsɪtli/",
    meaning: "nói rõ thành lời, không để người khác tự đoán",
    example: "anyone who needed an answer sooner had to say so explicitly",
    topic: "Sức khoẻ",
  },
  rs4: {
    word: "costs",
    ipa: "/kɒsts/",
    meaning: "cái giá phải trả, mặt bất lợi (không chỉ là tiền)",
    example:
      "There were costs. Preparing the underlined work takes a teacher about twice as long as marking a sheet.",
    topic: "Giáo dục",
  },
  rb5: {
    word: "unglamorous",
    ipa: "/ʌnˈɡlæmərəs/",
    meaning: "không hào nhoáng, tầm thường mà hữu ích",
    example:
      "The repair was unglamorous. The city moved a bus stop back by twenty metres.",
    topic: "Giao thông",
  },
  frc9: {
    word: "worthwhile",
    ipa: "/ˌwɜːθˈwaɪl/",
    meaning: "đáng công, đáng để bỏ sức ra làm",
    example:
      "Nevertheless, she considered the reduction in disposable packaging worthwhile.",
    topic: "Cuộc sống Sài Gòn",
  },
  frt2: {
    word: "unpredictably",
    ipa: "/ˌʌnprɪˈdɪktəbli/",
    meaning: "thất thường, không đoán trước được",
    example: "may still ride a motorbike if the bus arrives unpredictably",
    topic: "Giao thông",
  },
  frm4: {
    word: "manageable",
    ipa: "/ˈmænɪdʒəbl/",
    meaning: "vừa sức, kham được",
    example:
      "tasks must still be manageable, and learners need opportunities to recover",
    topic: "Giáo dục",
  },
  frg7: {
    word: "surplus",
    ipa: "/ˈsɜːpləs/",
    meaning: "phần dư ra sau khi đã chia đủ",
    example: "offer any surplus to neighbours who wanted to try the produce",
    topic: "Môi trường",
  },
};
/** Cards live under their own prefix so they cannot collide with v1…v20. */
export const SAVED_WORD_PREFIX = "w:";
