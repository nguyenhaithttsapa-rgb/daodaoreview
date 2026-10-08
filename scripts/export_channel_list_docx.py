import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from datetime import datetime
import json
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCHES_FILE = os.path.join(ROOT_DIR, "src", "data", "all_channel_batches.json")

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

    # Đọc dữ liệu từ all_channel_batches.json
    batches = []
    if os.path.exists(BATCHES_FILE):
        try:
            with open(BATCHES_FILE, 'r', encoding='utf-8') as f:
                batches = json.load(f)
        except Exception as e:
            print("Lỗi đọc batches:", e)

    total_channels = sum(len(b.get("channels", [])) for b in batches)

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
    sub_run = sub_p.add_run(f"Hệ thống: Mở Rộng Vô Hạn Lô (n+1) Không Trùng Lặp | Tổng: {len(batches)} Lô ({total_channels} Kênh) | {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
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
    r1 = p_rule.add_run("⚡ QUY CHUẨN CÀO PHIM VÔ HẠN (PROJECT RULES):\n")
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(180, 83, 9)
    r1.font.size = Pt(10.5)

    rules_text = (
        "1. Tiêu Chuẩn Thời Lượng: Phim BẮT BUỘC từ 30 phút trở lên (duration >= 1800s). Loại bỏ 100% clip ngắn dưới 30 phút.\n"
        "2. Cấm Ca Nhạc / OST: Tuyệt đối không cào MV, bài hát, karaoke, status âm nhạc không có cốt truyện.\n"
        "3. Kiểm Tra Quyền Nhúng (Embed Gatekeeper): Bỏ qua ngay lập tức mọi video bị cấm nhúng (checkEmbeddable).\n"
        "4. Tải Ảnh Poster Thật: Lưu trực tiếp thumbnail gốc vào public/thumbnails/{id}.jpg.\n"
        "5. Quy Chuẩn Mở Rộng Vô Hạn Lô (n+1): Mỗi lượt kế tiếp, số Lô tự động tăng thêm 1 (n+1 = 6, 7, 8... đến vô hạn). "
        "Toàn bộ 5 kênh ở Lô (n+1) BẮT BUỘC KHÔNG ĐƯỢC TRÙNG với bất kỳ kênh nào của tất cả các Lô trước đó (Lô 1 đến Lô n). "
        "Hệ thống không lặp lại kênh cũ mà liên tục tiến tới cào các kênh mới vô hạn.\n"
        "6. Lưu Trữ File Word: Toàn bộ danh sách kênh được tự động ghi nhận và đồng bộ vào file Word này."
    )
    r2 = p_rule.add_run(rules_text)
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph()

    # 3. DANH SÁCH CHI TIẾT TỪNG LÔ KÊNH
    global_index = 1
    for b in batches:
        b_num = b.get("batchNumber", 0)
        b_title = b.get("batchTitle", f"LÔ {b_num}")
        b_status = b.get("status", "Đang theo dõi")

        bp = doc.add_paragraph()
        br1 = bp.add_run(f"📁 {b_title}\n")
        br1.font.bold = True
        br1.font.size = Pt(11)
        br1.font.color.rgb = RGBColor(30, 41, 59)

        br2 = bp.add_run(f"Trạng thái: {b_status}")
        br2.font.bold = True
        br2.font.size = Pt(9.5)
        if "ĐÃ CÀO" in b_status:
            br2.font.color.rgb = RGBColor(22, 101, 52)
        elif "LÔ n+1" in b_status or "CHỜ" in b_status:
            br2.font.color.rgb = RGBColor(29, 78, 216)
        else:
            br2.font.color.rgb = RGBColor(14, 116, 144)

        table = doc.add_table(rows=1, cols=5)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        headers = ["STT", "Tên Kênh / Fanpage", "Đường Dẫn URL (Videos)", "Thể Loại", "Trạng Thái"]
        col_widths = [Inches(0.5), Inches(2.2), Inches(2.3), Inches(1.3), Inches(1.2)]

        hdr_cells = table.rows[0].cells
        for i, h_text in enumerate(headers):
            hdr_cells[i].text = h_text
            set_cell_background(hdr_cells[i], "1E293B")
            set_cell_margins(hdr_cells[i], top=90, bottom=90, left=90, right=90)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.runs[0]
            run.font.bold = True
            run.font.size = Pt(8.5)
            run.font.color.rgb = RGBColor(255, 255, 255)

        for ch in b.get("channels", []):
            row_cells = table.add_row().cells
            ch_name = ch.get("name", "")
            ch_url = ch.get("url", "")
            ch_cat = ch.get("category", "")
            ch_status = "Đã cào & nạp" if "ĐÃ CÀO" in b_status else "Chờ quét Lô n+1"

            data_cols = [str(global_index), ch_name, ch_url, ch_cat, ch_status]
            for i, val in enumerate(data_cols):
                row_cells[i].text = val
                set_cell_margins(row_cells[i], top=70, bottom=70, left=80, right=80)
                p = row_cells[i].paragraphs[0]
                run = p.runs[0]
                run.font.size = Pt(8)
                if i == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    set_cell_background(row_cells[i], "F8FAFC")
                elif i == 1:
                    run.font.bold = True
                elif i == 2:
                    run.font.color.rgb = RGBColor(37, 99, 235)
                elif i == 4:
                    if "nạp" in val:
                        set_cell_background(row_cells[i], "F0FDF4")
                        run.font.color.rgb = RGBColor(22, 101, 52)
                    else:
                        set_cell_background(row_cells[i], "EFF6FF")
                        run.font.color.rgb = RGBColor(29, 78, 216)

            global_index += 1

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
    print(f"✅ Đã cập nhật thành công file Word tại: {output_path} ({len(batches)} Lô, {total_channels} Kênh)")

if __name__ == "__main__":
    create_channel_docx(os.path.join(ROOT_DIR, "Danh_Sach_Kenh_Da_Cao.docx"))
    create_channel_docx(os.path.join(ROOT_DIR, "New Microsoft Word Document.docx"))
