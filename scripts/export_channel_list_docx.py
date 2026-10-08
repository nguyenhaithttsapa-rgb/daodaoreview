import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from datetime import datetime
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_channel_docx(output_path="Danh_Sach_Kenh_Da_Cao.docx"):
    doc = docx.Document()

    # Cấu hình lề trang (1.8 cm)
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)

    # 1. TIÊU ĐỀ CHÍNH
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("DANH SÁCH CÁC KÊNH FANPAGE FACEBOOK CÀO PHIM\nDAODAOREVIEW.COM")
    title_run.font.name = "Arial"
    title_run.font.size = Pt(17)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(16, 44, 87)

    # Phụ đề
    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = sub_p.add_run(f"Hệ thống: Zero-Overlap Round-Robin (5 phút/lần) | Cập nhật: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    sub_run.font.name = "Arial"
    sub_run.font.size = Pt(10)
    sub_run.font.italic = True
    sub_run.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph()

    # 2. KHUNG TỔNG QUAN NGUYÊN TẮC (SUMMARY BOX)
    summary_table = doc.add_table(rows=1, cols=1)
    summary_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = summary_table.cell(0, 0)
    set_cell_background(cell, "F1F5F9")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

    p_rule = cell.paragraphs[0]
    r1 = p_rule.add_run("⚡ QUY CHUẨN CÀO PHIM BẮT BUỘC (PROJECT RULES):\n")
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(180, 83, 9)
    r1.font.size = Pt(10.5)

    rules_text = (
        "1. Tiêu Chuẩn Thời Lượng: Phim BẮT BUỘC từ 30 phút trở lên (duration >= 1800s). Loại bỏ 100% clip ngắn dưới 30 phút.\n"
        "2. Cấm Ca Nhạc / OST: Tuyệt đối không cào MV, bài hát, karaoke, status âm nhạc không có cốt truyện.\n"
        "3. Kiểm Tra Quyền Nhúng (Embed Gatekeeper): Bỏ qua ngay lập tức mọi video bị cấm nhúng (checkEmbeddable).\n"
        "4. Tải Ảnh Poster Thật: Lưu trực tiếp thumbnail gốc vào public/thumbnails/{id}.jpg.\n"
        "5. Quy Chuẩn Lô Kế Tiếp (Lô n+1): Mỗi lượt quét Lô (n+1), toàn bộ 5 kênh được quét BẮT BUỘC KHÔNG ĐƯỢC TRÙNG "
        "với bất kỳ kênh nào của tất cả các Lô trước đó (Lô 1 đến Lô n): Lô_{n+1} ∩ (∪_{i=1}^n Lô_i) = ∅. "
        "Toàn bộ các kênh được quét được lưu trữ, đồng bộ và cập nhật thường xuyên vào file Word này."
    )
    r2 = p_rule.add_run(rules_text)
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph()

    # 3. DANH SÁCH CHI TIẾT CÁC LÔ KÊNH
    batches_data = [
        {
            "batch_title": "LÔ 1: Hoạt Hình 3D Tu Tiên & Huyền Huyễn Đỉnh Cao (5 Kênh)",
            "status": "ĐÃ CÀO (Chu kỳ 1, 4, 6)",
            "status_color": "166534",
            "channels": [
                ("1", "Hoạt Hình 3D Trung Quốc", "https://www.facebook.com/hh3dtq/videos", "Donghua 3D Tu Tiên", "Đã quét & nạp"),
                ("2", "Hoạt Hình 3D Review", "https://www.facebook.com/hoathinh3dreview/videos", "Donghua 3D Tóm Tắt", "Đã quét & nạp"),
                ("3", "Review 3D Hay (Hoạt Hình Tu Tiên)", "https://www.facebook.com/review3dhay/videos", "Tu Chân Huyền Huyễn", "Đã quét & lọc >=30p"),
                ("4", "HH3D Vietsub (Donghua Tu Chân)", "https://www.facebook.com/hh3d.vietsub/videos", "Donghua Vietsub Full", "Đã quét & lọc >=30p"),
                ("5", "Hoạt Hình 3D VN", "https://www.facebook.com/hoathinh3d.vn/videos", "3D Anime Tổng Hợp", "Đã quét & lọc >=30p")
            ]
        },
        {
            "batch_title": "LÔ 2: Phim Ngắn Trọng Sinh, Tổng Tài, Báo Thù & Cổ Trang (5 Kênh)",
            "status": "ĐÃ CÀO (Chu kỳ 2, 6)",
            "status_color": "166534",
            "channels": [
                ("6", "Đại Đạo Review (Phim Ngắn & Trọng Sinh)", "https://www.facebook.com/profile.php?id=61566431730101&sk=videos", "Trọng Sinh Báo Thù Full", "Đã quét & nạp"),
                ("7", "Phim Ngắn Tổng Tài Hay", "https://www.facebook.com/phimngan.tongtai/videos", "Tổng Tài & Đô Thị", "Đã quét & lọc >=30p"),
                ("8", "Review Phim Trung Quốc (Donghua & Phim Ngắn)", "https://www.facebook.com/reviewphimtrungquoc/videos", "Phim Ngắn & Donghua", "Đã quét & lọc >=30p"),
                ("9", "Review Phim Ngắn Hay", "https://www.facebook.com/reviewphimngan.hay/videos", "Kịch Tính Gia Đấu", "Đã quét & lọc >=30p"),
                ("10", "Phim Ngắn Trọng Sinh Kịch Tính", "https://www.facebook.com/phimngan.trongsinh/videos", "Trọng Sinh Khởi Nghiệp", "Đã quét & lọc >=30p")
            ]
        },
        {
            "batch_title": "LÔ 3: Donghua 3D & Phim Ngắn Vietsub Tuyển Chọn (5 Kênh)",
            "status": "ĐÃ CÀO (Chu kỳ 3, 6 - Đã nạp 2 phim 1h11m và 2h06m)",
            "status_color": "166534",
            "channels": [
                ("11", "Donghua 3D Hay", "https://www.facebook.com/donghua3dhay/videos", "Hoạt Hình 3D Hot", "Đã quét & lọc >=30p"),
                ("12", "Review Phim 3D Donghua", "https://www.facebook.com/reviewphim3d.donghua/videos", "Review Phim 3D Full", "Đã quét & lọc >=30p"),
                ("13", "Hoạt Hình 3D Hay", "https://www.facebook.com/hoathinh3d.hay/videos", "Hoạt Hình Chọn Lọc", "Đã quét & lọc >=30p"),
                ("14", "Phim Ngắn Vietsub Tuyển Chọn", "https://www.facebook.com/phimngan.vietsub/videos", "Phim Ngắn Full Vietsub", "Đã nạp 2 phim dài full!"),
                ("15", "Review Phim Ngắn TQ", "https://www.facebook.com/reviewphimngan.tq/videos", "Review Phim Ngắn TQ", "Đã quét & lọc >=30p")
            ]
        },
        {
            "batch_title": "LÔ KẾ TIẾP (LÔ 4): 5 KÊNH MỚI HOÀN TOÀN (100% KHÔNG TRÙNG LÔ 1, 2, 3)",
            "status": "⭐ ĐANG KÍCH HOẠT LÔ KẾ TIẾP (n+1)",
            "status_color": "1D4ED8",
            "channels": [
                ("16", "Hoạt Hình 3D Thuyết Minh", "https://www.facebook.com/hoathinh3df/videos", "Donghua 3D Thuyết Minh Full", "Kênh Mới Lô n+1 - Quét kế tiếp"),
                ("17", "Mê Hoạt Hình 3D Trung Quốc", "https://www.facebook.com/mehoathinh3dtq/videos", "3D Donghua Tu Tiên Mới", "Kênh Mới Lô n+1 - Quét kế tiếp"),
                ("18", "Review Phim Hay Mỗi Ngày", "https://www.facebook.com/reviewphimhaymoingay/videos", "Review Phim Dài Full", "Kênh Mới Lô n+1 - Quét kế tiếp"),
                ("19", "Phim Hay Tuyển Chọn", "https://www.facebook.com/phimhaytuyenchon.official/videos", "Phim Hay Trọn Bộ", "Kênh Mới Lô n+1 - Quét kế tiếp"),
                ("20", "Kho Phim Hoạt Hình 3D", "https://www.facebook.com/khophimhoathinh3d/videos", "Tuyển Tập Hoạt Hình 3D", "Kênh Mới Lô n+1 - Quét kế tiếp")
            ]
        },
        {
            "batch_title": "LÔ TIẾP SAU (LÔ 5): 5 KÊNH MỚI TIẾP NỐI (100% KHÔNG TRÙNG LÔ 1, 2, 3, 4)",
            "status": "⭐ DỰ PHÒNG LÔ (n+2) - KHÔNG TRÙNG LẶP",
            "status_color": "0284C7",
            "channels": [
                ("21", "Thế Giới Donghua 3D", "https://www.facebook.com/thegioidonghua3d/videos", "Donghua 3D Chiếu Rạp", "Kênh Mới Lô n+2"),
                ("22", "Tu Tiên Giới 3D", "https://www.facebook.com/tutiengioi3d/videos", "Tu Tiên Huyền Huyễn Mới", "Kênh Mới Lô n+2"),
                ("23", "Phim Ngắn Báo Thù Kịch Tính", "https://www.facebook.com/phimnganbaothu/videos", "Báo Thù & Trọng Sinh", "Kênh Mới Lô n+2"),
                ("24", "Tuyển Tập Phim Ngắn Hay", "https://www.facebook.com/tuyentapphimnganhay/videos", "Phim Ngắn Đô Thị Kịch Tính", "Kênh Mới Lô n+2"),
                ("25", "Mê Donghua Tu Chân", "https://www.facebook.com/medonghuatuchan/videos", "Donghua Tu Chân Đỉnh Cao", "Kênh Mới Lô n+2")
            ]
        }
    ]

    for batch in batches_data:
        # Tiêu đề Lô
        bp = doc.add_paragraph()
        br1 = bp.add_run(f"📁 {batch['batch_title']}\n")
        br1.font.bold = True
        br1.font.size = Pt(11.5)
        br1.font.color.rgb = RGBColor(30, 41, 59)

        br2 = bp.add_run(f"Trạng thái: {batch['status']}")
        br2.font.bold = True
        br2.font.size = Pt(9.5)
        r, g, b = int(batch['status_color'][:2], 16), int(batch['status_color'][2:4], 16), int(batch['status_color'][4:], 16)
        br2.font.color.rgb = RGBColor(r, g, b)

        # Bảng kênh
        table = doc.add_table(rows=1, cols=5)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        headers = ["STT", "Tên Kênh / Fanpage", "Đường Dẫn URL (Videos)", "Thể Loại", "Trạng Thái"]
        col_widths = [Inches(0.5), Inches(2.2), Inches(2.3), Inches(1.3), Inches(1.2)]

        hdr_cells = table.rows[0].cells
        for i, h_text in enumerate(headers):
            hdr_cells[i].text = h_text
            set_cell_background(hdr_cells[i], "1E293B")
            set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.runs[0]
            run.font.bold = True
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(255, 255, 255)

        for row_data in batch['channels']:
            row_cells = table.add_row().cells
            for i, val in enumerate(row_data):
                row_cells[i].text = val
                set_cell_margins(row_cells[i], top=80, bottom=80, left=80, right=80)
                p = row_cells[i].paragraphs[0]
                run = p.runs[0]
                run.font.size = Pt(8.5)
                if i == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    set_cell_background(row_cells[i], "F8FAFC")
                elif i == 1:
                    run.font.bold = True
                elif i == 2:
                    run.font.color.rgb = RGBColor(37, 99, 235)
                elif i == 4:
                    if "Mới" in val:
                        set_cell_background(row_cells[i], "EFF6FF")
                        run.font.bold = True
                        run.font.color.rgb = RGBColor(29, 78, 216)
                    elif "nạp" in val:
                        set_cell_background(row_cells[i], "F0FDF4")
                        run.font.bold = True
                        run.font.color.rgb = RGBColor(22, 101, 52)

        # Set column widths
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = w

        doc.add_paragraph()

    # 4. CHỮ KÝ HỆ THỐNG
    footer_p = doc.add_paragraph()
    footer_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fr = footer_p.add_run("Bản quyền hệ thống © DaoDaoReview.com - Powered by Antigravity AI Engine")
    fr.font.size = Pt(8.5)
    fr.font.italic = True
    fr.font.color.rgb = RGBColor(148, 163, 184)

    doc.save(output_path)
    print(f"✅ Đã tạo thành công file Word tại: {output_path}")

if __name__ == "__main__":
    create_channel_docx("Danh_Sach_Kenh_Da_Cao.docx")
    # Đồng thời cập nhật vào file Word có sẵn nếu cần
    create_channel_docx("New Microsoft Word Document.docx")
