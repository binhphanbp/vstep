"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { readBackupMark, reminderFor } from "@/lib/backup-mark";
import { downloadBackup } from "@/lib/download";
import { localDay } from "@/lib/learning";
import { formatNoteDate } from "./note-box";
import { useStudy } from "./study-provider";

/**
 * Says so when the notes would be lost with the browser's data, and makes the
 * copy one click away. Notes, scratch pages and highlights live only in this
 * browser until a copy is made, and nothing else would ever mention it: it
 * draws nothing at all while there is nothing to ask.
 */
export function BackupNudge() {
  const { state, ready, storageError, toast } = useStudy();
  // Making a copy changes what is on the device, not the profile: ask again.
  const [copies, refresh] = useState(0);
  // Worked out when the notes or the copies change, not on every render: the
  // home page redraws often, and a full book is two thousand notes.
  const notes = state.notes;
  const reminder = useMemo(
    () => (ready ? reminderFor(notes, readBackupMark()) : null),
    // `copies` is not read inside: a new copy changes what is on the device.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, notes, copies],
  );
  if (!reminder) return null;
  const sentence =
    reminder.why === "many"
      ? `${reminder.since} ghi chú mới chưa nằm trong bản sao lưu nào (${
          reminder.last
            ? `bản gần nhất: ${formatNoteDate(reminder.last)}`
            : "chưa có bản nào"
        }).`
      : reminder.last
        ? `${reminder.since} ghi chú chưa nằm trong bản sao lưu nào; bản gần nhất đã ${reminder.days} ngày trước.`
        : `${reminder.since} ghi chú chưa nằm trong bản sao lưu nào, ghi chú đầu tiên đã ${reminder.days} ngày tuổi.`;
  return (
    <div className="notice backup-nudge no-print" role="status">
      <p>{sentence} Ghi chú chỉ nằm trên máy này cho đến khi được sao lưu.</p>
      <div className="backup-nudge-actions">
        <button
          type="button"
          className="button primary small"
          onClick={() => {
            downloadBackup(
              Boolean(storageError),
              `may-backup-${localDay()}.json`,
            );
            refresh((count) => count + 1);
            toast(
              "Đã tải bản sao lưu. Hãy cất file ở nơi an toàn, như Google Drive hoặc USB.",
            );
          }}
        >
          <Download size={14} />
          Tải bản sao lưu ngay
        </button>
        <Link className="text-link" href="/settings">
          Lưu lên đám mây ở Cài đặt
        </Link>
      </div>
    </div>
  );
}
