"use client";
import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  Download,
  Heart,
  LogOut,
  Save,
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
import { supabase } from "@/lib/supabase";
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SettingsPage() {
  const { state, update, replace, toast } = useStudy();
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
      downloadJson(state, `may-before-import-${localDay()}.json`);
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
          <CloudSettings />
          <section className="panel">
            <div className="section-title">
              <Download size={20} />
              <h2>Bản sao của hành trình</h2>
            </div>
            <p className="help-copy">
              Xuất tiến độ, bài viết, bản nháp và lịch ôn ra file JSON. File
              không chứa bản ghi âm; hãy tải từng bản tại bài Nói.
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() =>
                  downloadJson(state, `may-backup-${localDay()}.json`)
                }
              >
                <Download size={15} />
                Xuất bản sao
              </button>
              <button
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
function CloudSettings() {
  const { state, replace, toast } = useStudy();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState("");
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
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
      if (error)
        throw Error(
          "Chưa đăng nhập được. Kiểm tra email, mật khẩu và tài khoản đã được chủ website cấp.",
        );
      setPassword("");
      toast("Đã đăng nhập. Chọn tải hoặc lưu bản sao để đồng bộ.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không kết nối được.");
    } finally {
      setBusy(false);
    }
  }
  async function sync(direction: "push" | "pull") {
    if (!supabase || !user) return;
    setBusy(true);
    setError("");
    try {
      if (direction === "pull") {
        const { data, error } = await supabase
          .from("study_snapshots")
          .select("payload,revision,updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
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
        const parsed = stateSchema.parse(data.payload);
        if (
          !window.confirm(
            `Tải bản sao ngày ${new Date(data.updated_at).toLocaleString("vi-VN")} (${parsed.attempts.length} lượt học)? Bản thiết bị hiện tại được xuất trước khi thay thế.`,
          )
        )
          return;
        downloadJson(state, `may-before-cloud-${localDay()}.json`);
        replace({ ...parsed, updatedAt: new Date().toISOString() });
        localStorage.setItem(`may-revision:${user.id}`, String(data.revision));
        setLast("Đã tải bản sao và cập nhật hồ sơ trên thiết bị.");
      } else {
        const expected = Number(
          localStorage.getItem(`may-revision:${user.id}`) ?? 0,
        );
        const { data, error } = await supabase.rpc("save_study_snapshot", {
          p_payload: stateSchema.parse(state),
          p_expected_revision: expected,
        });
        if (error) {
          if (error.message.includes("revision_conflict"))
            throw Error(
              "Đám mây có bản mới hơn. Xuất bản thiết bị trước, rồi tải bản đám mây để tránh ghi đè mất tiến độ.",
            );
          throw Error(
            "Chưa lưu được lên đám mây. Kiểm tra mạng, migration và tài khoản được phép.",
          );
        }
        localStorage.setItem(`may-revision:${user.id}`, String(data));
        setLast(
          `Đã lưu lên đám mây lúc ${new Date().toLocaleTimeString("vi-VN")}.`,
        );
      }
      toast("Đồng bộ thành công.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không đồng bộ được. Dữ liệu thiết bị vẫn còn.",
      );
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
              className="button primary small"
              disabled={busy}
              onClick={() => sync("push")}
            >
              <Upload size={15} />
              Lưu lên đám mây
            </button>
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => sync("pull")}
            >
              <Download size={15} />
              Tải về thiết bị
            </button>
          </div>
          <button
            className="text-link"
            style={{ marginTop: 18 }}
            disabled={busy}
            onClick={async () => {
              if (!supabase) return;
              const { error } = await supabase.auth.signOut();
              if (error) setError("Không đăng xuất được. Thử lại nhé.");
              else toast("Đã đăng xuất. Dữ liệu thiết bị được giữ lại.");
            }}
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
          <button className="button primary" disabled={busy}>
            {busy ? "Đang kết nối…" : "Đăng nhập"}
          </button>
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
