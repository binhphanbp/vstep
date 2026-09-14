"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  Mic,
  Download,
  Trash2,
} from "lucide-react";
import { saveRecording, getRecording, deleteRecording } from "@/lib/recordings";
import { speechChunks } from "@/lib/speech";
let speechOwner: symbol | null = null;
export function RecordingHistory({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  // Each submitted session keeps its own copy on the device for ever. Without a
  // way to remove one, practising Speaking daily only ever adds to the pile.
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Nghe lại bản ghi của buổi này</summary>
      {open &&
        (removed ? (
          <p className="help-copy">
            Đã xóa bản ghi của buổi này khỏi thiết bị. Kết quả buổi học vẫn được
            giữ nguyên.
          </p>
        ) : (
          <>
            <Recorder id={id} readOnly />
            <button
              type="button"
              className="button secondary small"
              onClick={async () => {
                if (
                  !window.confirm(
                    "Xóa hẳn bản ghi của buổi này khỏi thiết bị? Không khôi phục được.",
                  )
                )
                  return;
                try {
                  await deleteRecording(id);
                  setRemoved(true);
                } catch {
                  setError("Không xóa được bản ghi. Hãy thử lại.");
                }
              }}
            >
              <Trash2 size={14} />
              Xóa bản ghi này
            </button>
          </>
        ))}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
/**
 * The listening player.
 *
 * It used to have three controls: play, stop, speed. That is not enough to
 * study a recording with — there was no way to pause, to hear one sentence
 * again, or to know how far through the passage you were. Because the audio is
 * the device's own speech synthesis rather than a file, there is no waveform to
 * scrub: the unit that can be addressed is the sentence. So the timeline is
 * "câu 3/18", seeking is by sentence, and a single sentence can be repeated
 * without restarting the passage. No sentence text is shown, so the control
 * strip is safe in the exam room where the transcript stays closed.
 */
export function AudioPlayer({
  text,
  allowSpeed = true,
  variant = "panel",
  label = "Phát bài nghe",
}: {
  text: string;
  allowSpeed?: boolean;
  variant?: "panel" | "inline";
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [at, setAt] = useState(0);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState("");
  const [noVoice, setNoVoice] = useState(false);
  const run = useRef(0);
  const owner = useRef(Symbol("audio-player"));
  const parts = useMemo(() => speechChunks(text), [text]);
  useEffect(() => {
    const token = owner.current;
    const playback = run;
    return () => {
      playback.current++;
      if (speechOwner === token) {
        speechOwner = null;
        window.speechSynthesis?.cancel();
      }
    };
  }, []);
  function stop() {
    run.current++;
    if (speechOwner === owner.current) {
      speechOwner = null;
      window.speechSynthesis?.cancel();
    }
    setPlaying(false);
    setPaused(false);
  }
  function play(from = 0) {
    if (!("speechSynthesis" in window)) {
      setError("Trình duyệt chưa hỗ trợ giọng đọc. Hãy thử Chrome hoặc Edge.");
      return;
    }
    stop();
    window.speechSynthesis.cancel();
    speechOwner = owner.current;
    setError("");
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices
      .filter((v) => v.lang.startsWith("en"))
      .sort((a, b) => Number(b.lang === "en-GB") - Number(a.lang === "en-GB"));
    // Said plainly rather than left to sound wrong: a device with no English
    // voice reads English with a Vietnamese one, and the practice is useless
    // without the learner knowing why.
    setNoVoice(voices.length > 0 && englishVoices.length === 0);
    const id = run.current;
    let index = Math.max(0, Math.min(from, parts.length - 1));
    setPlaying(true);
    setPaused(false);
    const next = () => {
      if (id !== run.current) return;
      if (index >= parts.length) {
        if (speechOwner === owner.current) speechOwner = null;
        setPlaying(false);
        setAt(parts.length ? parts.length - 1 : 0);
        return;
      }
      const part = parts[index];
      setAt(index);
      index++;
      const utterance = new SpeechSynthesisUtterance(part.text);
      const voice = englishVoices[part.speaker % englishVoices.length];
      utterance.lang = "en-GB";
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.onend = next;
      utterance.onerror = (e) => {
        if (id !== run.current) return;
        run.current++;
        if (speechOwner === owner.current) speechOwner = null;
        setPlaying(false);
        setPaused(false);
        if (e.error !== "interrupted" && e.error !== "canceled") {
          setError(
            "Không phát được giọng đọc. Kiểm tra giọng tiếng Anh trong cài đặt trình duyệt rồi thử lại.",
          );
        }
      };
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        run.current++;
        if (speechOwner === owner.current) speechOwner = null;
        setPlaying(false);
        setPaused(false);
        setError(
          "Không phát được giọng đọc. Kiểm tra giọng tiếng Anh trong cài đặt trình duyệt rồi thử lại.",
        );
      }
    };
    next();
  }
  function hold() {
    if (!playing) return;
    if (paused) {
      window.speechSynthesis?.resume();
      setPaused(false);
    } else {
      window.speechSynthesis?.pause();
      setPaused(true);
    }
  }
  function move(step: number) {
    const target = Math.max(0, Math.min(at + step, parts.length - 1));
    setAt(target);
    play(target);
  }
  if (variant === "inline")
    return (
      <div className="evidence-audio">
        <button
          type="button"
          className="button secondary small"
          onClick={playing ? stop : () => play(0)}
        >
          {playing ? <Square size={14} /> : <Play size={14} />}{" "}
          {playing ? "Dừng" : label}
        </button>
        {error && (
          <p role="alert" className="help-copy">
            {error}
          </p>
        )}
      </div>
    );
  const position = parts.length ? at + 1 : 0;
  return (
    <div className="audio-panel">
      <div className="panel-heading">
        <h2>
          <Volume2 size={17} style={{ display: "inline", marginRight: 8 }} />
          Bài nghe luyện tập
        </h2>
      </div>
      <div className="audio-controls">
        <button
          type="button"
          className="button primary"
          onClick={playing ? stop : () => play(at)}
          aria-label={playing ? "Dừng bài nghe" : "Phát bài nghe"}
        >
          {playing ? <Square size={15} /> : <Play size={15} />}{" "}
          {playing ? "Dừng" : "Phát bài nghe"}
        </button>
        <button
          type="button"
          className="button secondary small"
          onClick={hold}
          disabled={!playing}
          aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        {allowSpeed && (
          <select
            aria-label="Tốc độ nghe"
            value={rate}
            disabled={playing}
            onChange={(e) => setRate(Number(e.target.value))}
          >
            <option value={0.8}>0.8×</option>
            <option value={1}>1×</option>
            <option value={1.2}>1.2×</option>
          </select>
        )}
      </div>
      {parts.length > 1 && (
        <div className="audio-seek">
          <div
            className="audio-track"
            role="img"
            aria-label={`Đang ở câu ${position} trên ${parts.length}`}
          >
            <span style={{ width: `${(position / parts.length) * 100}%` }} />
          </div>
          <div className="audio-seek-row">
            <span className="audio-position">
              Câu {position}/{parts.length}
            </span>
            <button
              type="button"
              className="button secondary small"
              onClick={() => move(-1)}
              aria-label="Câu trước"
            >
              <SkipBack size={14} />
              Câu trước
            </button>
            <button
              type="button"
              className="button secondary small"
              onClick={() => play(at)}
              aria-label="Nghe lại câu này"
            >
              <RotateCcw size={14} />
              Nghe lại câu này
            </button>
            <button
              type="button"
              className="button secondary small"
              onClick={() => move(1)}
              aria-label="Câu sau"
            >
              <SkipForward size={14} />
              Câu sau
            </button>
          </div>
        </div>
      )}
      <small>
        Giọng đọc tổng hợp của thiết bị · Nội dung tự biên soạn. Chưa thay thế
        bản thu đề thi chuẩn.
      </small>
      {noVoice && (
        <p role="status" className="notice">
          Thiết bị này chưa có giọng tiếng Anh nên câu đang được đọc bằng giọng
          mặc định. Cài thêm giọng tiếng Anh trong cài đặt hệ thống để nghe đúng
          phát âm.
        </p>
      )}
      {error && (
        <p role="alert" className="help-copy">
          {error}
        </p>
      )}
    </div>
  );
}
export type TakeState = {
  ready: boolean;
  /** Seconds captured, present only when this take was just recorded. */
  duration?: number;
  /** When the take reached storage; 0 for one restored from before timestamps. */
  savedAt: number;
};
export function Recorder({
  id,
  onReady,
  readOnly = false,
}: {
  id: string;
  onReady?: (take: TakeState) => void;
  readOnly?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [mime, setMime] = useState("audio/webm");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const callback = useRef(onReady);
  const currentUrl = useRef("");
  const mounted = useRef(true);
  const captureStarted = useRef(0);
  useEffect(() => {
    callback.current = onReady;
  }, [onReady]);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const load = () =>
      getRecording(id)
        .then((stored) => {
          if (stored && !cancelled && recorder.current?.state !== "recording") {
            if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
            const next = URL.createObjectURL(stored.blob);
            currentUrl.current = next;
            setUrl(next);
            setMime(stored.blob.type);
            // No duration: this take was restored, not captured just now.
            if (!readOnly)
              callback.current?.({ ready: true, savedAt: stored.savedAt });
          }
        })
        .catch(() => {
          if (!cancelled) setError("Không mở được kho bản ghi trên thiết bị.");
        });
    void load();
    const saved = (event: Event) => {
      if (readOnly && (event as CustomEvent<string>).detail === id) void load();
    };
    window.addEventListener("may-recording-saved", saved);
    return () => {
      window.removeEventListener("may-recording-saved", saved);
      cancelled = true;
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    };
  }, [id, readOnly]);
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(
      () =>
        setSeconds(
          Math.max(0, Math.floor((Date.now() - captureStarted.current) / 1000)),
        ),
      1000,
    );
    const leave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", leave);
    };
  }, [recording]);
  useEffect(() => {
    if (seconds >= 600 && recording) recorder.current?.stop();
  }, [seconds, recording]);
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(
        "Ghi âm cần HTTPS hoặc localhost và trình duyệt hỗ trợ MediaRecorder.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(
        media,
        type ? { mimeType: type } : undefined,
      );
      recorder.current = rec;
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onerror = () => {
        if (mounted.current)
          setError("Ghi âm bị gián đoạn. Hãy kiểm tra micro và thử lại.");
        media.getTracks().forEach((t) => t.stop());
        if (mounted.current) setRecording(false);
      };
      rec.onstop = async () => {
        const duration = Math.max(
          1,
          Math.round((Date.now() - captureStarted.current) / 1000),
        );
        media.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        if (!blob.size) {
          if (mounted.current) {
            setError("Bản ghi rỗng. Hãy thử lại.");
            setRecording(false);
          }
          return;
        }
        try {
          await saveRecording(id, blob);
          callback.current?.({ ready: true, duration, savedAt: Date.now() });
          window.dispatchEvent(
            new CustomEvent("may-recording-saved", { detail: id }),
          );
        } catch {
          callback.current?.({ ready: false, savedAt: 0 });
          if (mounted.current)
            setError(
              "Không lưu được vào thiết bị. Tải bản ghi xuống trước khi rời trang.",
            );
        }
        if (mounted.current) {
          if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
          const next = URL.createObjectURL(blob);
          currentUrl.current = next;
          setUrl(next);
          setMime(blob.type);
          setRecording(false);
        }
      };
      setSeconds(0);
      callback.current?.({ ready: false, savedAt: 0 });
      captureStarted.current = Date.now();
      rec.start(1000);
      setRecording(true);
    } catch (e) {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (!mounted.current) return;
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Chưa được cấp quyền micro. Cho phép micro ở thanh địa chỉ rồi thử lại."
          : "Không mở được micro. Kiểm tra thiết bị có đang được ứng dụng khác sử dụng.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {!readOnly && (
        <div className="record-controls">
          <button
            type="button"
            disabled={busy}
            className={`button ${recording ? "danger" : "primary"}`}
            onClick={() =>
              recording ? recorder.current?.stop() : void start()
            }
          >
            {recording ? <Square size={16} /> : <Mic size={16} />}{" "}
            {recording
              ? "Dừng ghi âm"
              : busy
                ? "Đang mở micro…"
                : url
                  ? "Ghi lại bản mới"
                  : "Bắt đầu ghi âm"}
          </button>
          {recording && (
            <>
              <span className="recording-dot" />
              <span role="timer">
                {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
            </>
          )}
        </div>
      )}
      {url ? (
        <>
          <audio controls src={url} />
          <a
            href={url}
            download={`may-${id}.${mime.includes("mp4") ? "m4a" : "webm"}`}
            className="text-link"
          >
            <Download size={15} />
            Tải bản ghi
          </a>
        </>
      ) : readOnly ? (
        <p className="help-copy">
          Không có bản ghi cho buổi này trên thiết bị.
        </p>
      ) : null}
      {!readOnly && (
        <p className="help-copy">
          Micro chỉ mở khi bạn bấm ghi âm. Bản mới thay bản cũ của bài này; lưu
          trên thiết bị, không gửi lên máy chủ. Tối đa 10 phút mỗi bản.
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
