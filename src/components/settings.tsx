"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  Cloud,
  Download,
  HardDrive,
  Heart,
  LifeBuoy,
  LogOut,
  Save,
  Send,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useStudy } from "./study-provider";
import {
  localDay,
  personalizeLegacyState,
  profileSchema,
  stateSchema,
  type Profile,
} from "@/lib/learning";
import { skillNames, type Skill } from "@/lib/content";
import {
  CLOUD_REQUEST_TIMEOUT,
  isCloudTimeout,
  supabase,
} from "@/lib/supabase";
import {
  currentBackupState,
  formatBytes,
  rawStudyData,
  studyDataBytes,
} from "@/lib/study-store";
import {
  deleteRecordingsBefore,
  OLD_RECORDING_DAYS,
  recordingUsage,
  type RecordingUsage,
} from "@/lib/recordings";
import {
  buildErrorReport,
  clearErrors,
  errorReportText,
  recentErrors,
  sendErrorReport,
} from "@/lib/error-log";
export function downloadJson(data: unknown, name: string) {
  downloadText(JSON.stringify(data, null, 2), name);
}
/**
 * Exports whatever the learner still has. With damaged storage the parsed
 * state is empty, so the raw text is the only copy worth saving.
 */
export function downloadBackup(damaged: boolean, name: string) {
  const raw = damaged ? rawStudyData() : null;
  if (raw === null) downloadJson(currentBackupState(), name);
  else downloadText(raw, name);
}
function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SettingsPage() {
  const { state, update, replace, toast, storageError } = useStudy();
  const [profile, setProfile] = useState<Profile>(state.profile);
  const profileVersion = JSON.stringify(state.profile);
  const [loadedProfile, setLoadedProfile] = useState(profileVersion);
  if (loadedProfile !== profileVersion) {
    setLoadedProfile(profileVersion);
    setProfile(state.profile);
  }
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const topics = [
    "Cuộc sống Sài Gòn",
    "Giáo dục",
    "Môi trường",
    "Giao thông",
    "Du lịch",
    "Công việc",
    "Sức khoẻ",
  ];
  function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ ...profile, onboarded: true });
    if (!parsed.success) {
      setError(
        "Kiểm tra tên gọi, ngày thi và thời lượng học từ 10 đến 120 phút nhé.",
      );
      return;
    }
    setError("");
    update((s) => ({ ...s, profile: parsed.data }));
    toast(
      `Đã lưu. Kế hoạch hôm nay đã được điều chỉnh cho ${parsed.data.name}.`,
    );
  }
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      setError("Bản sao vượt quá giới hạn 10 MB.");
      return;
    }
    try {
      const parsed = personalizeLegacyState(
        stateSchema.parse(JSON.parse(await selected.text())),
      );
      if (
        !window.confirm(
          `Nhập bản sao của ${parsed.profile.name} với ${parsed.attempts.length} lượt học? Bản hiện tại sẽ được tải xuống trước khi thay thế.`,
        )
      )
        return;
      downloadBackup(
        Boolean(storageError),
        `may-before-import-${localDay()}.json`,
      );
      replace({ ...parsed, updatedAt: new Date().toISOString() });
      setProfile(parsed.profile);
      toast("Đã khôi phục bản sao học tập.");
    } catch {
      setError(
        "Không nhập được: file không hợp lệ hoặc bộ nhớ bị chặn. Dữ liệu hiện tại vẫn được giữ.",
      );
    }
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Heart size={15} />
            MADE FOR {profile.name.toLocaleUpperCase("vi")}
          </div>
          <h1>Góc học, theo cách của {profile.name}.</h1>
          <p>
            Một hành trình được làm riêng, để {profile.name} học đúng nhịp và
            vẫn thấy vui mỗi ngày.
          </p>
        </div>
      </div>
      <div className="settings-layout">
        <form className="panel" onSubmit={save}>
          <div className="section-title">
            <UserRound size={20} />
            <h2>Làm quen một chút</h2>
          </div>
          <div className="form-grid">
            <label className="field full">
              <span>Tên thân mật trong góc học</span>
              <input
                value={
                  profile.name === "bạn" && !profile.onboarded
                    ? ""
                    : profile.name
                }
                placeholder="Tên hoặc biệt danh"
                required
                maxLength={40}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
              />
              <small>
                “Gùa” là cách gọi riêng được dùng trong lời động viên.
              </small>
            </label>
            <label className="field">
              <span>Mục tiêu VSTEP</span>
              <select
                value={profile.target}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    target: e.target.value as Profile["target"],
                  }))
                }
              >
                <option value="B1">B1 · Bậc 3</option>
                <option value="B2">B2 · Bậc 4</option>
                <option value="C1">C1 · Bậc 5</option>
              </select>
            </label>
            <label className="field">
              <span>Trình độ tự đánh giá</span>
              <select
                value={profile.level}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    level: e.target.value as Profile["level"],
                  }))
                }
              >
                <option value="starting">Chưa rõ / đang xây nền</option>
                <option value="B1">Khoảng B1</option>
                <option value="B2">Khoảng B2</option>
              </select>
            </label>
            <label className="field">
              <span>Ngày thi dự kiến</span>
              <input
                type="date"
                value={profile.examDate}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, examDate: e.target.value }))
                }
              />
              <small>Để trống nếu {profile.name} chưa chốt lịch.</small>
            </label>
            <label className="field">
              <span>Số phút học mỗi ngày</span>
              <input
                type="number"
                min={10}
                max={120}
                required
                value={profile.dailyMinutes}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    dailyMinutes: Number(e.target.value),
                  }))
                }
              />
              <small>10–120 phút. Có thể giảm vào ngày mệt.</small>
            </label>
            <label className="field full">
              <span>Kỹ năng muốn ưu tiên</span>
              <select
                value={profile.focus}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, focus: e.target.value as Skill }))
                }
              >
                {Object.entries(skillNames).map(([value, name]) => (
                  <option value={value} key={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="field full">
              <span>Những chủ đề {profile.name} thích</span>
              <div className="tag-list">
                {topics.map((topic) => (
                  <button
                    type="button"
                    key={topic}
                    aria-pressed={profile.interests.includes(topic)}
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        interests: p.interests.includes(topic)
                          ? p.interests.filter((t) => t !== topic)
                          : [...p.interests, topic],
                      }))
                    }
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {profile.target === "C1" && (
            <p className="notice" style={{ marginTop: 20 }}>
              Bạn có thể đặt mục tiêu C1; kho bài hiện tại tập trung B1–B2, chưa
              đủ để chuẩn bị toàn diện cho C1.
            </p>
          )}
          {error && (
            <p className="notice error" role="alert" style={{ marginTop: 20 }}>
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="button primary" type="submit">
              <Save size={16} />
              Lưu nhịp học của mình
            </button>
          </div>
        </form>
        <div className="stack">
          <CloudSettings storageError={storageError} />
          <section className="panel">
            <div className="section-title">
              <LifeBuoy size={20} />
              <h2>Khi có gì đó hỏng</h2>
            </div>
            <p className="help-copy">
              Bấm <strong>Gửi báo lỗi</strong> để chép sẵn một bản mô tả tình
              trạng máy và{" "}
              {recentErrors().length
                ? `${recentErrors().length} lỗi gần nhất`
                : "các lỗi gần nhất nếu có"}
              , rồi dán vào tin nhắn gửi cho người dựng ứng dụng. Bản mô tả{" "}
              <strong>không chứa</strong> bài viết, bản ghi âm hay nội dung đã
              gõ — chỉ có thông tin máy, số lượng dữ liệu và thông báo lỗi.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  void sendErrorReport(
                    errorReportText(buildErrorReport(state, storageError)),
                  ).then((how) => {
                    if (how === "share") toast("Đã mở chỗ gửi báo lỗi.");
                    else if (how === "copy")
                      toast("Đã chép báo lỗi. Dán vào tin nhắn và gửi đi.");
                    else
                      toast(
                        "Máy này không chép được. Tải file báo lỗi giúp mình.",
                      );
                  });
                }}
              >
                <Send size={15} />
                Gửi báo lỗi
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  downloadJson(
                    buildErrorReport(state, storageError),
                    `may-bao-loi-${localDay()}.json`,
                  );
                  toast("Đã tải file báo lỗi.");
                }}
              >
                <Download size={15} />
                Tải file báo lỗi
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  clearErrors();
                  toast("Đã xoá danh sách lỗi trên máy này.");
                }}
              >
                <Trash2 size={15} />
                Xoá danh sách lỗi
              </button>
            </div>
          </section>
          <section className="panel">
            <div className="section-title">
              <ClipboardCheck size={20} />
              <h2>Nhờ giáo viên duyệt học liệu</h2>
            </div>
            <p className="help-copy">
              Toàn bộ bài học trong Mây do người dựng ứng dụng tự biên soạn và
              chưa có giáo viên nào duyệt. Ở đây in được từng gói tài liệu — ngữ
              liệu, câu hỏi, đáp án đang dùng và ô trống để người chấm ghi nhận
              xét — để gửi đi nhờ xem giúp.
            </p>
            <div className="button-row">
              <Link className="button secondary" href="/review-pack/bank">
                <ClipboardCheck size={15} />
                Mở gói duyệt học liệu
              </Link>
            </div>
          </section>
          <StoragePanel />
          <section className="panel">
            <div className="section-title">
              <Download size={20} />
              <h2>Bản sao của hành trình</h2>
            </div>
            <p className="help-copy">
              Xuất tiến độ, bài viết, bản nháp và lịch ôn ra file JSON. File
              không chứa bản ghi âm: bản ghi của từng buổi nằm ở trang Lịch sử,
              mở buổi học rồi tải hoặc xóa từng bản.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  downloadBackup(
                    Boolean(storageError),
                    `may-backup-${localDay()}.json`,
                  )
                }
              >
                <Download size={15} />
                Xuất bản sao
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => file.current?.click()}
              >
                <Upload size={15} />
                Nhập bản sao
              </button>
              <input
                ref={file}
                className="file-input"
                type="file"
                accept=".json,application/json"
                aria-label="Chọn bản sao JSON"
                onChange={importFile}
              />
            </div>
            <details>
              <summary>Khôi phục khi dữ liệu có vấn đề</summary>
              <p className="help-copy">
                Nếu Mây báo lỗi dữ liệu, tải bản gốc trước khi nhập bản sao hợp
                lệ.
              </p>
              <button
                type="button"
                className="button secondary small"
                style={{ marginTop: 10 }}
                onClick={() => {
                  try {
                    downloadJson(
                      { raw: localStorage.getItem("may-study-v1") },
                      `may-recovery-${localDay()}.json`,
                    );
                  } catch {
                    toast("Trình duyệt đang chặn quyền đọc bộ nhớ.");
                  }
                }}
              >
                Tải dữ liệu gốc để kiểm tra
              </button>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
function CloudSettings({ storageError }: { storageError: string }) {
  const { replace, toast } = useStudy();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState("");
  const pendingSync = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let activeUser: string | null = null;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user.id ?? null;
      if (activeUser !== nextUser || event === "SIGNED_OUT") {
        const pending = pendingSync.current;
        pendingSync.current = null;
        pending?.abort();
        if (pending) setBusy(false);
        setLast("");
        setError("");
      }
      activeUser = nextUser;
      // Session is used for display only; Supabase verifies Auth/RLS on requests.
      setUser(session?.user ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
      const pending = pendingSync.current;
      pendingSync.current = null;
      pending?.abort();
    };
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (isCloudTimeout(error))
          throw Error(
            "Kết nối đăng nhập mất quá lâu. Kiểm tra mạng rồi thử lại; tiến độ trên thiết bị vẫn còn.",
          );
        throw Error(
          "Chưa đăng nhập được. Kiểm tra email, mật khẩu và tài khoản đã được chủ website cấp.",
        );
      }
      setPassword("");
      toast("Đã đăng nhập. Chọn tải hoặc lưu bản sao để đồng bộ.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không kết nối được.");
    } finally {
      setBusy(false);
    }
  }
  async function sync(direction: "push" | "pull") {
    if (!supabase || !user || pendingSync.current) return;
    // With damaged device data the in-memory state is empty, and the cloud
    // keeps only one row: pushing it would destroy the last good copy.
    if (direction === "push" && storageError) {
      setError(
        "Dữ liệu trên thiết bị đang lỗi nên chưa thể lưu lên đám mây — làm vậy sẽ ghi đè bản đám mây bằng một hồ sơ trống. Hãy xuất bản gốc ở mục sao lưu, rồi tải bản đám mây về hoặc nhập lại một bản hợp lệ.",
      );
      return;
    }
    const controller = new AbortController();
    pendingSync.current = controller;
    const timeout = window.setTimeout(() => {
      if (pendingSync.current !== controller) return;
      pendingSync.current = null;
      controller.abort();
      setBusy(false);
      setError(
        "Kết nối mất quá lâu. Dữ liệu thiết bị vẫn còn. Nếu vừa lưu lên đám mây, hãy xuất bản thiết bị rồi tải bản đám mây để kiểm tra trước khi thử lại.",
      );
    }, CLOUD_REQUEST_TIMEOUT);
    setBusy(true);
    setError("");
    setLast("");
    try {
      if (direction === "pull") {
        const { data, error } = await supabase
          .from("study_snapshots")
          .select("payload,revision,updated_at")
          .eq("user_id", user.id)
          .abortSignal(controller.signal)
          .maybeSingle();
        if (pendingSync.current !== controller) return;
        if (error)
          throw Error(
            "Không tải được bản sao. Kiểm tra kết nối và cấu hình quyền Supabase.",
          );
        if (!data) {
          toast(
            "Chưa có bản sao trên đám mây. Hãy lưu bản đầu tiên từ thiết bị này.",
          );
          return;
        }
        const result = stateSchema.safeParse(data.payload);
        if (
          !result.success ||
          !Number.isSafeInteger(data.revision) ||
          data.revision < 1 ||
          !Number.isFinite(Date.parse(data.updated_at))
        )
          throw Error(
            "Bản sao trên đám mây không hợp lệ. Dữ liệu trên thiết bị vẫn được giữ nguyên.",
          );
        const parsed = result.data;
        if (
          !window.confirm(
            `Tải bản sao ngày ${new Date(data.updated_at).toLocaleString("vi-VN")} (${parsed.attempts.length} lượt học)? Bản thiết bị hiện tại được xuất trước khi thay thế.`,
          )
        )
          return;
        downloadBackup(
          Boolean(storageError),
          `may-before-cloud-${localDay()}.json`,
        );
        replace({ ...parsed, updatedAt: new Date().toISOString() });
        try {
          localStorage.setItem(
            `may-revision:${user.id}`,
            String(data.revision),
          );
        } catch {
          throw Error(
            "Đã tải bản đám mây nhưng thiết bị không lưu được mã đồng bộ. Bản cũ đã được tải xuống; hãy giải phóng dung lượng trước lần đồng bộ tiếp theo.",
          );
        }
        setLast("Đã tải bản sao và cập nhật hồ sơ trên thiết bị.");
      } else {
        const expected = Number(
          localStorage.getItem(`may-revision:${user.id}`) ?? 0,
        );
        const uploaded = stateSchema.parse(currentBackupState());
        const { data, error } = await supabase
          .rpc("save_study_snapshot", {
            p_payload: uploaded,
            p_expected_revision: expected,
          })
          .abortSignal(controller.signal);
        if (pendingSync.current !== controller) return;
        if (error) {
          if (error.message.includes("revision_conflict"))
            throw Error(
              "Đám mây có bản mới hơn. Xuất bản thiết bị trước, rồi tải bản đám mây để tránh ghi đè mất tiến độ.",
            );
          throw Error(
            "Chưa lưu được lên đám mây. Kiểm tra mạng, migration và tài khoản được phép.",
          );
        }
        try {
          localStorage.setItem(`may-revision:${user.id}`, String(data));
        } catch {
          downloadJson(
            currentBackupState(),
            `may-after-cloud-${localDay()}.json`,
          );
          throw Error(
            "Cloud đã nhận bản sao nhưng thiết bị không lưu được mã đồng bộ. Mây đã xuất bản thiết bị; hãy tải bản cloud để đối chiếu sau khi giải phóng dung lượng.",
          );
        }
        if (currentBackupState().updatedAt !== uploaded.updatedAt) {
          setLast(
            "Có thay đổi mới trên thiết bị chưa được lưu lên đám mây. Bấm Lưu lên đám mây lần nữa để cập nhật bản mới nhất.",
          );
          toast("Đã lưu bản trước đó. Thay đổi mới vẫn ở trên thiết bị.");
          return;
        }
        setLast(
          `Đã lưu lên đám mây lúc ${new Date().toLocaleTimeString("vi-VN")}.`,
        );
      }
      toast("Đồng bộ thành công.");
    } catch (e) {
      if (pendingSync.current !== controller) return;
      setError(
        e instanceof Error
          ? e.message
          : "Không đồng bộ được. Dữ liệu thiết bị vẫn còn.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (pendingSync.current === controller) {
        pendingSync.current = null;
        setBusy(false);
      }
    }
  }
  async function logout() {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    setLast("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        const { data } = await supabase.auth.getSession();
        setError(
          data.session
            ? "Không đăng xuất được. Kiểm tra kết nối rồi thử lại nhé."
            : "Đã đăng xuất trên thiết bị, nhưng chưa xác nhận được việc kết thúc phiên trên máy chủ. Dữ liệu học vẫn được giữ lại.",
        );
        return;
      }
      toast("Đã đăng xuất. Dữ liệu thiết bị được giữ lại.");
    } catch {
      setError("Không đăng xuất được. Kiểm tra kết nối rồi thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <div className="section-title">
        <Cloud size={21} />
        <h2>Mang theo tiến độ</h2>
      </div>
      {!supabase ? (
        <>
          <span className="pill">Đang lưu trên thiết bị</span>
          <p className="help-copy">
            Bạn có thể học ngay. Lưu giữa các thiết bị sẽ hoạt động khi chủ
            website kết nối Supabase; hiện chưa có kết nối đám mây.
          </p>
        </>
      ) : user ? (
        <>
          <p className="help-copy">
            Đã đăng nhập: {user.email}. Chọn lưu từ thiết bị này hoặc tải bản đã
            lưu. Không tự gộp hai bản khác nhau.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button primary small"
              disabled={busy || Boolean(storageError)}
              onClick={() => sync("push")}
            >
              <Upload size={15} />
              Lưu lên đám mây
            </button>
            <button
              type="button"
              className="button secondary small"
              disabled={busy}
              onClick={() => sync("pull")}
            >
              <Download size={15} />
              Tải về thiết bị
            </button>
          </div>
          <button
            type="button"
            className="text-link"
            style={{ marginTop: 18 }}
            disabled={busy}
            onClick={logout}
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </>
      ) : (
        <form onSubmit={login} className="stack">
          <p className="help-copy">
            Dùng tài khoản riêng đã được chủ website tạo. Không có đăng ký công
            khai.
          </p>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Đang kết nối…" : "Đăng nhập"}
          </button>
          <details>
            <summary>Quên mật khẩu?</summary>
            <p className="help-copy">
              Nhờ chủ website đặt lại tài khoản trong Supabase. Không tạo tài
              khoản mới và không gửi mật khẩu qua tin nhắn; tiến độ đang lưu
              trên thiết bị vẫn dùng được khi chưa đăng nhập.
            </p>
          </details>
        </form>
      )}
      {last && (
        <p className="help-copy" role="status">
          {last}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert" style={{ marginTop: 15 }}>
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * What the app is keeping on this device, in bytes she can read.
 *
 * Recordings are the largest thing the app writes and they live only here:
 * the JSON backup and the cloud snapshot carry no audio. Until now nothing
 * could say how much room they took, and removing one meant finding its
 * session in the history. This panel measures the real numbers — no estimate
 * is invented when the browser refuses to give one — and offers the one bulk
 * action that is safe to offer: takes older than a month.
 */
function StoragePanel() {
  const { toast } = useStudy();
  type Report = {
    data: number;
    usage: RecordingUsage | null;
    quota: { usage: number; quota: number } | null;
    cutoff: number;
    failed: boolean;
  };
  const [report, setReport] = useState<Report | null>(null);
  // Reading the recording store is asynchronous, so the numbers arrive
  // together in one state write: a panel about storage must not show a figure
  // it has not measured yet.
  const measure = useCallback(
    () =>
      Promise.all([
        recordingUsage().then(
          (usage) => ({ usage, failed: false }),
          () => ({ usage: null, failed: true }),
        ),
        Promise.resolve()
          .then(() => navigator.storage?.estimate?.())
          .then(
            (estimate) =>
              estimate?.usage != null && estimate?.quota != null
                ? { usage: estimate.usage, quota: estimate.quota }
                : null,
            () => null,
          ),
      ]).then(([takes, quota]) =>
        setReport({
          data: studyDataBytes(),
          usage: takes.usage,
          failed: takes.failed,
          quota,
          cutoff: Date.now() - OLD_RECORDING_DAYS * 86400000,
        }),
      ),
    [],
  );
  useEffect(() => {
    void measure();
  }, [measure]);
  const usage = report?.usage ?? null;
  const hasOld = Boolean(
    report && usage?.count && usage.oldest && usage.oldest < report.cutoff,
  );
  return (
    <section className="panel">
      <div className="section-title">
        <HardDrive size={20} />
        <h2>Chỗ ở của dữ liệu</h2>
      </div>
      <div className="history-row">
        <div>
          <h3>Dữ liệu học</h3>
          <small>Tiến độ, bài viết, bản nháp và lịch ôn.</small>
        </div>
        <div className="skill-accuracy">
          <strong>{report ? formatBytes(report.data) : "—"}</strong>
          <small>trong trình duyệt</small>
        </div>
      </div>
      <div className="history-row">
        <div>
          <h3>Bản ghi âm</h3>
          <small>
            {report?.failed
              ? "Không đọc được kho bản ghi trên máy này."
              : "Chỉ nằm trên máy này; bản sao JSON và cloud không chứa âm thanh."}
          </small>
        </div>
        <div className="skill-accuracy">
          <strong>{usage ? formatBytes(usage.bytes) : "—"}</strong>
          <small>{usage ? `${usage.count} bản ghi` : "chưa đo được"}</small>
        </div>
      </div>
      {report?.quota ? (
        <p className="help-copy">
          Trình duyệt báo ứng dụng đang dùng {formatBytes(report.quota.usage)}{" "}
          trong khoảng {formatBytes(report.quota.quota)} được cấp. Đây là ước
          lượng của trình duyệt, không phải con số Mây tự tính.
        </p>
      ) : (
        <p className="help-copy">
          Trình duyệt này không cho biết dung lượng còn lại, nên Mây chỉ hiện
          phần tự đo được.
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          onClick={() => void measure()}
        >
          Đo lại
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!hasOld}
          onClick={async () => {
            if (
              !window.confirm(
                `Xoá các bản ghi cũ hơn ${OLD_RECORDING_DAYS} ngày? Việc này không thể hoàn tác.`,
              )
            )
              return;
            try {
              const removed = await deleteRecordingsBefore(
                Date.now() - OLD_RECORDING_DAYS * 86400000,
              );
              await measure();
              toast(
                removed
                  ? `Đã xoá ${removed} bản ghi cũ.`
                  : "Không có bản ghi nào đủ cũ để xoá.",
              );
            } catch {
              toast("Không xoá được bản ghi trên máy này.");
            }
          }}
        >
          <Trash2 size={15} />
          Xoá bản ghi cũ hơn {OLD_RECORDING_DAYS} ngày
        </button>
      </div>
      <p className="help-copy">
        Xoá từng bản ghi của một buổi cụ thể ở trang Lịch sử. Bản ghi bị xoá
        không khôi phục được.
      </p>
    </section>
  );
}
