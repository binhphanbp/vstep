# Báo cáo tình trạng Mây VSTEP — 07/10/2026

Tài liệu để mở phiên làm việc tiếp theo mà không phải đọc lại cả lịch sử. Mọi con số dưới đây lấy từ mã nguồn, CI hoặc lần kiểm tra thực tế ghi kèm; chỗ nào chưa kiểm được thì nói thẳng là chưa kiểm.

## 1. Tóm tắt

- **Phạm vi hiện tại: desktop, mạng tốt.** Điện thoại để sau; chưa phải việc cần làm lúc này.
- Website đang chạy ở **https://vstep-turtle.vercel.app** và Gùa đã được gửi link để dùng thật.
- Bản đang chạy là commit `0d9f5cc` (PR #34 trên `main`). CI `check` xanh trên bản đó và workflow "Smoke production" (lần chạy 93) đạt.
- Trong hôm nay đã học thử như một người học thật qua gần hết các màn, tìm và sửa các lỗi nhìn thấy được (mục 4). Không còn lỗi nào đã biết mà chưa sửa, trừ hai điểm nhỏ cố ý để nguyên (mục 4.3).
- Phần còn mở **không còn nằm ở code**: học liệu chưa có giáo viên duyệt, chưa có nguồn chính thức cho số liệu F12 và rubric C1. Mục 6 nêu rõ.

## 2. Đang chạy ở đâu

| Hạng mục | Hiện trạng |
| --- | --- |
| Địa chỉ cho Gùa | https://vstep-turtle.vercel.app (alias công khai của Vercel) |
| Bản đang phục vụ | `0d9f5cc` trên `main` |
| Kiểm thử trước khi merge | GitHub Actions "Validate Mây" (`check.yml`): lint, typecheck, unit, build, audit dependency, E2E trên bản production, axe |
| Kiểm tra sau deploy | "Smoke production" (`production-smoke.yml`) chạy khi Vercel deploy xong; lần 93 đạt cho `0d9f5cc` |
| Lưu dữ liệu | Trên máy (localStorage `may-study-v1`, IndexedDB `may-recordings`); đồng bộ đám mây Supabase là tùy chọn |
| Dependency | Next 16.4.0, React 19, `npm audit --omit=dev` báo 0 lỗ hổng ở lần chạy ngày 07/10 |

Chưa làm: mở lại trang production bằng mắt sau PR #34 (chỉ dựa vào CI và smoke).

## 3. Số liệu hiện hành

| Số liệu | Giá trị |
| --- | --- |
| Kiểm thử unit (Vitest) | 183 |
| Kiểm thử E2E (Playwright, bản production) | 67 = 63 Chromium + 2 Firefox + 2 WebKit |
| Route được dựng sẵn | 106 |
| Màn được quét axe | 16 |
| Thư viện bài | 42 bài (12 Đọc + 12 Nghe + 9 Viết + 9 Nói) và 2 đề đủ cấu trúc |
| Câu Đọc/Nghe có chú giải bằng chứng | 258/258 |
| Thẻ từ vựng | 68 |

Một ca kiểm thử (`tests/unit/documents.test.ts`) làm CI đỏ nếu các con số này trong tài liệu lệch khỏi mã. Khi thêm hay bớt kiểm thử, phải sửa số trong `STATUS.md`, `HANDOVER.md`, `QUALITY.md` và `PRODUCT.md`.

## 4. Đợt kiểm tra thực tế hôm nay

Cách làm: mở bản production dựng sẵn, thao tác như người học (thiết lập lần đầu, Đọc, Nghe, Viết, Nói với micro giả, Sổ lỗi, từ vựng, tìm kiếm thư viện, lịch sử, phòng thi, sao lưu, báo lỗi, mất mạng, trang lỗi). Mỗi lỗi tìm được đều có ca kiểm thử mới đã chạy thử trên bản chưa sửa (đỏ) rồi trên bản đã sửa (xanh).

### 4.1 Lỗi đã sửa và đã merge

| PR | Lỗi | Sửa |
| --- | --- | --- |
| #28 | CI đỏ vì advisory mới của `next`, `sharp`, `source-map-js` dù mã không đổi | Nâng lên next 16.4.0, sharp 0.35.5; production 0 lỗ hổng |
| #29 | Dấu tick của ngày hôm nay trong dải tuần trắng trên nền gần trắng (tương phản 1,10:1) | Thêm luật CSS giữ nền hồng; 2,2:1 như các ngày trước |
| #30 | "thời gian Gùacó" ở trang Lộ trình (JSX nuốt dấu cách) | Thêm khoảng trắng tường minh; ca E2E quét 13 trang tìm tên dính chữ |
| #31 | Xong bài chỉ có "Luyện lại"; lịch ôn hiện "02:54:06 8/10/2026" | Nút "Bài tiếp theo hôm nay" kèm số bài còn lại; lịch ôn nói "ngày mai", "3 ngày nữa", "ngày 27/10" |
| #32 | Nghe hết rồi bấm phát lại chỉ phát câu cuối | Trạng thái "đã nghe hết", nút thành "Nghe lại từ đầu" |
| #33 | Ngày giờ có giây và giờ đứng trước ngày; khung biểu đồ tuần kéo cao gần 600px; báo lỗi đếm "4 bài nháp" cho người không có nháp | `whenLabel()` dùng chung ("7/10/2026 · 03:36"); căn trên khung biểu đồ; chỉ đếm bản nháp có chữ |
| #34 | Thanh trên cùng ghi "Cẩm nang VSTEP" ở trang 404 và offline; trang offline không có lối ra | Tên đúng theo từng trang; thêm nút "Về góc học hôm nay" |

Đợt rà ba đường trên desktop (đổi hồ sơ giữa chừng, mô phỏng 56 ngày, hai đề đủ cấu trúc làm trọn): kế hoạch, giai đoạn tuần thi và phần so sánh hai lần thi đều đúng; một lỗi duy nhất, **trang Tiến bộ dựng mọi lượt đã học không giới hạn**, nay hiện 20 buổi mới nhất và xem thêm từng 20. Chi tiết trong `docs/QUALITY.md`, mục "Rà ba đường chưa đi".

Đợt rà các đường hiếm trên desktop (mất mạng giữa lúc nộp, bấm nộp hai lần, Back/Forward, qua nửa đêm, múi giờ khác, tên lạ): ba lỗi nhỏ đã sửa, gồm ảnh đại diện vỡ khi tên bắt đầu bằng emoji, "Gùa" gõ bằng dấu tổ hợp mất nhãn "Rùa nhỏ", và giờ ở lịch sử lệch giờ Việt Nam khi máy ở múi giờ khác. Chi tiết trong `docs/QUALITY.md`, mục "Rà các đường hiếm".

Trước đó trong cùng đợt: #27 (trần 6 bài/ngày bỏ phí 36–68% ngân sách, nay trần 8 và phần dư được nói ra), #26 (mất mạng chỉ mở được 1/9 trang, nay 9/9 và bài của hôm nay mở được).

### 4.2 Đã kiểm và đúng, không đổi gì

Thiết lập lần đầu và Cài đặt; kiểm tra khi nộp bài; Sổ lỗi và làm lại; vòng đời thẻ từ vựng; tìm kiếm thư viện; đọc lại bài Viết trong lịch sử; gói gửi giáo viên; xuất backup (không kèm audio) và nhập (từ chối file hỏng); bảng dung lượng; nút Gửi báo lỗi (share, clipboard); phòng thi (tải lại giữ đáp án và đồng hồ, hết giờ tự chuyển phần, ghi vào Tiến bộ); phát lại, tải về, xóa bản ghi âm trong lịch sử; trang 404.

### 4.3 Hai điểm nhỏ cố ý để nguyên

- Địa chỉ `/practice/<id sai>` trả HTTP 200 kèm trang thân thiện thay vì 404. Người học không thấy khác biệt.
- Chỉ đáng sửa nếu sau này cần công cụ giám sát phân biệt được trang lỗi với trang thật.

## 5. Quyết định của chủ website đang có hiệu lực

- **Không đổi font.** Đã hỏi về Gilroy rồi dừng; giữ font hiện tại.
- **Không bật cổng chặn build trên Vercel.** Script `scripts/vercel-ignore-build.mjs` nằm trong repo nhưng không dùng. Quy trình thay thế: luôn chờ CI xanh trước khi merge (đã làm vậy với mọi PR hôm nay). Rủi ro còn lại: bản lỗi lên trang thật trước khi CI kịp đỏ nếu ai đó merge không chờ.
- **Đổi tên "Mây": đang cân nhắc, chưa quyết.** Đổi được, rủi ro thấp (khoảng 32 tệp; khóa lưu trữ `may-study-v1` giữ nguyên nên Gùa không mất dữ liệu; địa chỉ web đổi là việc riêng trên Vercel và phải gửi lại link). Cần tên mới và phạm vi (chỉ chữ hay cả logo "mây.").
- **Tên miền riêng:** chưa có; cần chủ website mua và có quyền Vercel.

## 6. Việc chỉ chủ website làm được

| Việc | Vì sao mình không tự làm |
| --- | --- |
| Nhờ giáo viên duyệt học liệu (in sáu tập tại `/review-pack/bank`) | Nội dung hoàn toàn tự biên soạn, chưa bài nào qua thẩm định; kết quả duyệt chỉ ghi vào `provenance.ts` bằng tay |
| Cung cấp số liệu F12 của ULIS và rubric C1 chính thức | Không tự bịa số liệu hay thang chấm |
| Mua tên miền riêng, quyết định đổi tên | Cần tài khoản và quyết định của chủ |
| Kênh nhận báo lỗi và theo dõi hoạt động (nếu muốn) | Cần chọn dịch vụ và chính sách dữ liệu |
| Branch protection trên GitHub, bật auto-merge | Cài đặt repo |

## 7. Giới hạn trung thực của sản phẩm (đang ghi trong giao diện)

- Học liệu tự biên soạn, chưa được thẩm định hay hiệu chuẩn; nhãn B1/B2 chỉ là ý định biên soạn.
- Không quy đổi kết quả sang bậc B1/B2/C1; không gọi bộ tiêu chí tự kiểm tra là rubric chính thức.
- Không có chấm Viết/Nói bằng AI hay giáo viên; không gửi nội dung học đến dịch vụ AI bên ngoài.
- Bài Nghe dùng giọng tổng hợp của thiết bị; thiết bị thiếu giọng tiếng Anh sẽ được báo rõ.
- Backup JSON và đám mây không chứa audio; bản ghi tải riêng. File báo lỗi không kèm bài viết, bản nháp hay bản ghi.
- Chưa nghiệm thu trên điện thoại thật (iOS/Android). Hoãn có chủ đích: phạm vi hiện tại là desktop.

## 8. Đề xuất việc tiếp theo

Theo thứ tự nên làm:

1. **Quan sát Gùa dùng thật vài ngày**, ghi lại chỗ vướng. Đây là nguồn lỗi đáng tin hơn mọi vòng tự kiểm tra tiếp theo.
2. **Chốt chuyện tên "Mây"** (giữ hoặc đổi). Nếu đổi, mình làm đồng bộ ở mọi nơi rồi chạy lại toàn bộ kiểm thử và merge theo quy trình cũ.
3. **Rà tiếp trên desktop:** ba đường (đổi hồ sơ, nhiều tuần dữ liệu, hai đề đủ cấu trúc) đã rà xong; các đường hiếm cũng đã rà; còn lại là thời gian luyện qua nửa đêm và đổi đồng hồ hệ thống giữa lúc thi (chưa kiểm được bằng công cụ hiện có). Điện thoại để sau, khi nào cần thì dùng danh sách 20 mục `docs/UAT-DIEN-THOAI.md`.
4. **Gửi bộ hồ sơ học liệu cho giáo viên**; khi có kết quả, ghi vào `provenance.ts`.
5. Việc mình có thể làm tiếp mà không cần chờ ai (chỉ làm khi được yêu cầu): thêm học liệu mới (thư viện hiện đủ khoảng 88 phút mới mỗi ngày, khoảng sáu tuần là gặp hết 42 bài), rà soát thêm các đường hiếm (hết mạng giữa lúc nộp, hai thiết bị đồng bộ), và cập nhật báo cáo Word.

## 9. Quy tắc giữ nguyên ở mọi phiên

- Cá nhân hóa cho Gùa là tính năng chính, không phải trang trí.
- Không bịa thành tích, điểm số hay đặc tả chính thức; mọi tuyên bố phải đo được.
- Không gửi nội dung học đến API AI bên ngoài; không quy đổi bậc B1/B2/C1; không gọi tài liệu tự soạn là đề thi hay rubric chính thức.
- File báo lỗi không chứa bài viết, bản nháp hay bản ghi âm.
- Nội dung học liệu bất biến theo phiên bản; sửa nội dung đã phát hành thì phải tăng version.
- Đọc `node_modules/next/dist/docs/` trước khi viết code Next (xem `AGENTS.md`): bản Next này có thay đổi so với kiến thức cũ.

## 10. Cách tiếp tục ở phiên mới

```
git fetch origin main && git checkout -B <nhánh> origin/main
npm ci
npm run check            # lint, typecheck, unit, build
npm run test:production  # build rồi chạy E2E trên bản production
```

Quy trình mỗi thay đổi: sửa trên nhánh, chạy kiểm thử, cập nhật số liệu trong tài liệu nếu số kiểm thử đổi, mở PR, chờ CI xanh, merge, rồi xem "Smoke production" của commit merge. Hướng dẫn phát hành và phục hồi: `docs/RELEASE-RUNBOOK.md`. Chi tiết kỹ thuật: `docs/HANDOVER.md` và `docs/QUALITY.md`.
