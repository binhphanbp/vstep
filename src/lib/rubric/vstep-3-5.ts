/**
 * The marking scale the grader uses, as data with a version.
 *
 * STATUS: NOT THE OFFICIAL DESCRIPTORS. The document that holds them, "Mô tả
 * khái quát các điểm Viết, Nói VSTEP.3-5" (Trung tâm Khảo thí, ĐH Ngoại ngữ –
 * ĐHQGHN, linked from vstep.vnu.edu.vn/dinh-dang-de-thi-vstep-3-5/), could not
 * be read when this was written. Until it is, each band below is described from
 * the public CEFR descriptors (Council of Europe, Companion Volume 2020) for
 * the level the official table assigns to that score range:
 *   under 4.0 — not rated · 4.0–5.5 — B1 (bậc 3) · 6.0–8.0 — B2 (bậc 4) ·
 *   8.5–10 — C1 (bậc 5).
 * The criteria themselves (Writing: task fulfilment, organisation, vocabulary,
 * grammar; Speaking: grammar, vocabulary, pronunciation, fluency, discourse
 * management) are the ones the published VSTEP studies report.
 *
 * When the official text is available, replace the descriptors, set
 * `official: true`, record the source and bump RUBRIC_VERSION; results keep the
 * version they were graded under.
 */
import type {
  Band,
  SpeakingCriterion,
  WritingCriterion,
} from "../grading/scores";

export const RUBRIC_VERSION = "cefr-fallback-1";

export const RUBRIC_SOURCE = {
  official: false,
  label:
    "Dựng theo mô tả CEFR công khai, chưa đối chiếu văn bản chính thức của VSTEP",
} as const;

/** The whole-number marks a band covers on one criterion. */
export const BAND_MARKS: Record<Band, readonly [number, number]> = {
  "below-b1": [0, 3],
  b1: [4, 5],
  b2: [6, 8],
  c1: [9, 10],
};

export function bandOfMark(mark: number): Band {
  if (mark >= 9) return "c1";
  if (mark >= 6) return "b2";
  if (mark >= 4) return "b1";
  return "below-b1";
}

export type Descriptor = { en: string; vi: string };
type Scale = Record<Band, Descriptor>;

export const WRITING_RUBRIC: Record<
  WritingCriterion,
  { label: string; scale: Scale }
> = {
  task: {
    label: "Hoàn thành nhiệm vụ",
    scale: {
      "below-b1": {
        en: "Does not address the task, or covers few of the required points; too short or too unclear to judge; the reader is not informed.",
        vi: "Chưa đáp ứng đề hoặc chỉ nêu được rất ít ý bắt buộc; bài quá ngắn hoặc quá khó hiểu để đánh giá.",
      },
      b1: {
        en: "Addresses all or most of the required points, though some are only mentioned and not developed; ideas are simple and mostly relevant; the format and tone are mostly suitable for a simple letter or essay.",
        vi: "Nêu đủ hoặc gần đủ các ý bắt buộc nhưng một số ý chỉ được nhắc tới, chưa phát triển; ý đơn giản, phần lớn liên quan; hình thức và giọng văn cơ bản phù hợp.",
      },
      b2: {
        en: "Addresses all required points and develops most of them with reasons or examples; a clear position where one is asked for; format and register suitable; ideas relevant throughout.",
        vi: "Nêu đủ các ý bắt buộc và phát triển phần lớn bằng lý do hoặc ví dụ; có quan điểm rõ khi đề yêu cầu; hình thức và giọng văn phù hợp; ý bám sát đề.",
      },
      c1: {
        en: "Addresses every required point fully and develops each with well-chosen reasons and examples; a clear, well-supported position; register consistently suited to the reader; the reader is fully informed.",
        vi: "Nêu đầy đủ mọi ý bắt buộc, mỗi ý được phát triển bằng lý do và ví dụ chọn lọc; quan điểm rõ và có dẫn chứng; giọng văn nhất quán, người đọc được cung cấp đủ thông tin.",
      },
    },
  },
  organization: {
    label: "Tổ chức bài và liên kết",
    scale: {
      "below-b1": {
        en: "Little or no organisation; ideas are not linked and the reader cannot follow the text.",
        vi: "Gần như không có bố cục; các ý rời rạc, người đọc khó theo dõi.",
      },
      b1: {
        en: "Simple ordering or paragraphing; links ideas with basic connectors (and, but, because, then) that are often repeated; progression is sometimes unclear.",
        vi: "Sắp xếp hoặc chia đoạn đơn giản; nối ý bằng từ nối cơ bản (and, but, because, then), hay lặp lại; mạch triển khai đôi lúc chưa rõ.",
      },
      b2: {
        en: "Clear paragraphs in a logical order (greeting–body–closing, or introduction–body–conclusion); a range of linking devices, mostly used well; the reader follows with little effort.",
        vi: "Chia đoạn rõ, thứ tự hợp lý (mở – thân – kết); dùng nhiều loại từ nối, phần lớn đúng; người đọc theo dõi dễ dàng.",
      },
      c1: {
        en: "Well structured, with controlled use of organisational patterns, connectors and cohesive devices; balanced paragraphs and smooth progression; at most minor lapses.",
        vi: "Bố cục chặt chẽ, dùng chủ động các kiểu tổ chức, từ nối và phương tiện liên kết; các đoạn cân đối, mạch trôi chảy; nhiều nhất chỉ có lỗi nhỏ.",
      },
    },
  },
  vocabulary: {
    label: "Từ vựng",
    scale: {
      "below-b1": {
        en: "Very limited vocabulary; wrong word choices often prevent understanding.",
        vi: "Vốn từ rất hạn chế; chọn từ sai thường làm người đọc không hiểu.",
      },
      b1: {
        en: "Enough vocabulary for familiar topics, with noticeable repetition; errors in word choice or spelling are visible but the meaning stays clear.",
        vi: "Đủ từ cho chủ đề quen thuộc nhưng lặp từ nhiều; có lỗi chọn từ hoặc chính tả nhưng vẫn hiểu được ý.",
      },
      b2: {
        en: "A good range on general topics, including some less common words and collocations; occasional wrong choices or spelling slips that do not get in the way.",
        vi: "Vốn từ khá rộng cho chủ đề chung, có một số từ ít gặp và cụm kết hợp; thỉnh thoảng chọn từ chưa chuẩn hoặc sai chính tả nhưng không cản trở.",
      },
      c1: {
        en: "A broad range used flexibly and precisely, including less common and idiomatic items; rare slips.",
        vi: "Vốn từ rộng, dùng linh hoạt và chính xác, có từ ít gặp và thành ngữ; hiếm khi sai.",
      },
    },
  },
  grammar: {
    label: "Ngữ pháp",
    scale: {
      "below-b1": {
        en: "Errors in basic structures are frequent and often prevent understanding.",
        vi: "Lỗi ở cấu trúc cơ bản xuất hiện nhiều và thường làm người đọc không hiểu.",
      },
      b1: {
        en: "Reasonable accuracy in simple structures; attempts at complex sentences usually contain errors; errors are noticeable but the meaning is mostly clear.",
        vi: "Dùng cấu trúc đơn giản khá đúng; câu phức thường có lỗi; lỗi dễ thấy nhưng phần lớn vẫn hiểu được.",
      },
      b2: {
        en: "Good control; a mix of simple and complex sentences; some errors, but they do not impede understanding.",
        vi: "Kiểm soát ngữ pháp tốt; xen kẽ câu đơn và câu phức; còn lỗi nhưng không cản trở việc hiểu.",
      },
      c1: {
        en: "Consistently high accuracy across a wide range of structures; errors are rare and hard to spot.",
        vi: "Chính xác ổn định trên nhiều cấu trúc; lỗi hiếm và khó nhận ra.",
      },
    },
  },
};

export const SPEAKING_RUBRIC: Record<
  SpeakingCriterion,
  { label: string; scale: Scale }
> = {
  grammar: {
    label: "Ngữ pháp",
    scale: {
      "below-b1": {
        en: "Only isolated phrases or memorised patterns; errors in basic structures are frequent and often impede understanding.",
        vi: "Chỉ nói được cụm rời hoặc mẫu câu học thuộc; lỗi cấu trúc cơ bản nhiều, thường gây khó hiểu.",
      },
      b1: {
        en: "Simple structures used with reasonable accuracy; complex sentences are attempted but usually contain errors; the meaning is mostly clear.",
        vi: "Dùng cấu trúc đơn giản khá đúng; có thử câu phức nhưng thường sai; phần lớn vẫn hiểu được.",
      },
      b2: {
        en: "Good control; a mix of simple and complex sentences; errors occur but do not impede understanding and are often self-corrected.",
        vi: "Kiểm soát tốt; xen kẽ câu đơn và câu phức; còn lỗi nhưng không cản trở và thường tự sửa.",
      },
      c1: {
        en: "Consistently high accuracy over a wide range of structures; slips are rare and usually corrected at once.",
        vi: "Chính xác ổn định trên nhiều cấu trúc; lỗi hiếm và thường tự sửa ngay.",
      },
    },
  },
  vocabulary: {
    label: "Từ vựng",
    scale: {
      "below-b1": {
        en: "Very limited vocabulary; often cannot find the word needed.",
        vi: "Vốn từ rất hạn chế; thường không tìm được từ cần dùng.",
      },
      b1: {
        en: "Enough vocabulary to talk about familiar topics, with repetition and circumlocution; occasional wrong word choices.",
        vi: "Đủ từ để nói về chủ đề quen thuộc nhưng lặp từ và diễn đạt vòng; thỉnh thoảng chọn từ sai.",
      },
      b2: {
        en: "A good range on general and many abstract topics, with some collocations and less common words; slips do not impede.",
        vi: "Vốn từ khá rộng cho chủ đề chung và nhiều chủ đề trừu tượng, có cụm kết hợp và từ ít gặp; lỗi nhỏ không cản trở.",
      },
      c1: {
        en: "A broad range used flexibly and precisely, with idiomatic items; rare slips.",
        vi: "Vốn từ rộng, linh hoạt, chính xác, có thành ngữ; hiếm khi sai.",
      },
    },
  },
  pronunciation: {
    label: "Phát âm",
    scale: {
      "below-b1": {
        en: "Pronunciation often makes the speech hard to understand; the listener must work hard.",
        vi: "Phát âm thường làm lời nói khó hiểu; người nghe phải rất cố gắng.",
      },
      b1: {
        en: "Generally intelligible, but a noticeable accent and mispronounced words or stress sometimes need the listener's effort.",
        vi: "Nhìn chung nghe hiểu được nhưng giọng nặng, có từ phát âm hoặc trọng âm sai khiến người nghe đôi lúc phải cố gắng.",
      },
      b2: {
        en: "Clearly intelligible; stress and intonation mostly appropriate; an accent may be present but rarely affects understanding.",
        vi: "Rõ ràng, dễ hiểu; trọng âm và ngữ điệu phần lớn phù hợp; có thể còn giọng nhưng hiếm khi ảnh hưởng.",
      },
      c1: {
        en: "Clear, natural pronunciation; stress and intonation used to convey meaning; effortless to follow.",
        vi: "Phát âm rõ, tự nhiên; dùng trọng âm và ngữ điệu để truyền ý; nghe không tốn sức.",
      },
    },
  },
  fluency: {
    label: "Độ trôi chảy",
    scale: {
      "below-b1": {
        en: "Very hesitant, with long pauses and fragmented speech; the speaker often cannot continue.",
        vi: "Ngập ngừng nhiều, ngắt quãng dài, lời nói rời rạc; thường không nói tiếp được.",
      },
      b1: {
        en: "Keeps going, but with noticeable pauses to plan and repair, especially in longer stretches.",
        vi: "Vẫn duy trì được nhưng ngắt để suy nghĩ hoặc sửa lời khá rõ, nhất là khi nói dài.",
      },
      b2: {
        en: "Speaks at length at a fairly even pace; few long pauses; hesitation mainly when searching for ideas or words.",
        vi: "Nói được dài với nhịp khá đều; ít ngắt dài; ngập ngừng chủ yếu khi tìm ý hoặc từ.",
      },
      c1: {
        en: "Fluent and spontaneous, almost effortless; only conceptually difficult points slow the flow.",
        vi: "Trôi chảy, tự nhiên, gần như không gắng sức; chỉ các ý khó mới làm chậm lại.",
      },
    },
  },
  discourse: {
    label: "Phát triển ý và liên kết",
    scale: {
      "below-b1": {
        en: "Answers are very short or off the point; ideas are not linked.",
        vi: "Câu trả lời rất ngắn hoặc lạc đề; các ý không liên kết.",
      },
      b1: {
        en: "Answers the questions and gives some detail; links ideas with basic connectors, often repeated; development is limited.",
        vi: "Trả lời đúng câu hỏi và có thêm chi tiết; nối ý bằng từ nối cơ bản, hay lặp; phát triển ý còn hạn chế.",
      },
      b2: {
        en: "Develops ideas with reasons and examples; stays on topic; uses a range of linking devices so that the talk is coherent.",
        vi: "Phát triển ý bằng lý do, ví dụ; bám chủ đề; dùng nhiều từ nối nên bài nói mạch lạc.",
      },
      c1: {
        en: "Develops each point fully and rounds it off; well-structured, coherent speech with controlled use of cohesive devices.",
        vi: "Triển khai đầy đủ từng ý và kết lại; lời nói có cấu trúc, mạch lạc, dùng phương tiện liên kết chủ động.",
      },
    },
  },
};
