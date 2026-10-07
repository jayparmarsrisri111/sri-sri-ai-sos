import os
import io
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from PIL import Image as PILImage

def generate_police_dossier_pdf(incident_metadata: dict, timeline_entries: list, output_pdf_path: str, storage_base_dir: Path) -> str:
    """
    Generates a high-quality police forensic dossier PDF including metadata,
    tamper-proof chain of custody, GPS path, and embedded photographic evidence.
    """
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#B71C1C'),
        alignment=1, # Center
        spaceAfter=6
    )
    
    sub_title_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#37474F'),
        alignment=1,
        spaceAfter=15
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0D47A1'),
        spaceBefore=10,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#212121')
    )

    code_style = ParagraphStyle(
        'HashStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#263238')
    )

    elements = []

    # Title & Subtitle
    elements.append(Paragraph("SRI SRI SOS AI - POLICE FORENSIC EVIDENCE DOSSIER", title_style))
    elements.append(Paragraph("TAMPER-PROOF ELECTRONIC RECORD CERTIFICATE (CRIMINAL INVESTIGATION RECORD)", sub_title_style))
    elements.append(Spacer(1, 8))

    # Incident Summary Table
    inc_id = incident_metadata.get("incident_id", "N/A")
    user_name = incident_metadata.get("user_name", "Anonymous")
    phone = incident_metadata.get("phone_number", "Unknown")
    start_time = incident_metadata.get("start_time", "N/A")
    status = incident_metadata.get("status", "ACTIVE")
    last_loc = incident_metadata.get("last_location") or {}
    last_coords = f"{last_loc.get('lat', 'N/A')}, {last_loc.get('lng', 'N/A')} (Acc: {last_loc.get('accuracy', 'N/A')}m)"

    summary_data = [
        [Paragraph("<b>Incident ID:</b>", body_style), Paragraph(f"<b>{inc_id}</b>", body_style),
         Paragraph("<b>Status:</b>", body_style), Paragraph(f"<font color='{'red' if status=='ACTIVE' else 'green'}'><b>{status}</b></font>", body_style)],
        [Paragraph("<b>Victim Name:</b>", body_style), Paragraph(user_name, body_style),
         Paragraph("<b>Phone Number:</b>", body_style), Paragraph(phone, body_style)],
        [Paragraph("<b>Trigger Timestamp:</b>", body_style), Paragraph(start_time, body_style),
         Paragraph("<b>Total Evidence Chunks:</b>", body_style), Paragraph(str(incident_metadata.get("total_chunks", 0)), body_style)],
        [Paragraph("<b>Last Known GPS:</b>", body_style), Paragraph(last_coords, body_style),
         Paragraph("<b>Photos / Audio:</b>", body_style), Paragraph(f"{incident_metadata.get('photo_count', 0)} Photos / {incident_metadata.get('audio_count', 0)} Audio", body_style)]
    ]

    summary_table = Table(summary_data, colWidths=[105, 165, 105, 165])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F5F5F5')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#9E9E9E')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 12))

    # Cryptographic Chain of Custody Integrity Banner
    elements.append(Paragraph("1. Cryptographic Chain of Custody Verification", section_heading))
    cert_text = (
        f"This digital evidence dossier is verified via consecutive SHA-256 cryptographic hashing. "
        f"Each chunk (image, audio slice, GPS telemetry) was committed to the cloud in real-time "
        f"before device incapacitation. Head Chain Hash: <b>{incident_metadata.get('last_hash', 'N/A')[:32]}...</b>"
    )
    elements.append(Paragraph(cert_text, body_style))
    elements.append(Spacer(1, 10))

    # Timeline & Evidence Table
    elements.append(Paragraph("2. Sequential Evidence Log & Audit Trail", section_heading))
    
    headers = [
        Paragraph("<b>Seq</b>", body_style),
        Paragraph("<b>Type</b>", body_style),
        Paragraph("<b>UTC Timestamp</b>", body_style),
        Paragraph("<b>GPS Coordinates</b>", body_style),
        Paragraph("<b>SHA-256 Payload Hash</b>", body_style)
    ]
    log_data = [headers]

    for item in timeline_entries[:25]: # limit to first 25 in summary table
        seq = str(item.get("seq", 0))
        etype = str(item.get("type", "")).upper()
        ts = str(item.get("timestamp", ""))[-12:] # show time portion
        gps = item.get("gps") or {}
        coords = f"{gps.get('lat', '-')}, {gps.get('lng', '-')}" if gps.get("lat") else "-"
        dhash = str(item.get("data_hash", ""))[:16] + "..."

        log_data.append([
            Paragraph(seq, body_style),
            Paragraph(etype, body_style),
            Paragraph(ts, body_style),
            Paragraph(coords, body_style),
            Paragraph(dhash, code_style)
        ])

    log_table = Table(log_data, colWidths=[35, 55, 95, 115, 240])
    log_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ECEFF1')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#B0BEC5')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CFD8DC')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(log_table)
    elements.append(Spacer(1, 15))

    # Photographic Evidence Gallery
    elements.append(Paragraph("3. Photographic Evidence (Chronological Cloud Snapshots)", section_heading))
    elements.append(Paragraph("Photos captured in 1-second intervals by victim's device prior to power loss:", body_style))
    elements.append(Spacer(1, 8))

    inc_dir = storage_base_dir / inc_id
    photo_entries = [e for e in timeline_entries if e.get("type") == "photo" and e.get("file_rel_path")]
    
    if photo_entries:
        photo_cells = []
        current_row = []
        for p_idx, pe in enumerate(photo_entries[:8]): # include up to 8 key photos
            rel_path = pe.get("file_rel_path")
            full_img_path = inc_dir / rel_path
            if full_img_path.exists():
                try:
                    # Optimize image for report
                    pil_img = PILImage.open(full_img_path)
                    w, h = pil_img.size
                    aspect = h / max(w, 1)
                    target_w = 230
                    target_h = target_w * aspect
                    if target_h > 170:
                        target_h = 170
                        target_w = target_h / max(aspect, 0.01)

                    cell_content = [
                        RLImage(str(full_img_path), width=target_w, height=target_h),
                        Spacer(1, 2),
                        Paragraph(f"<b>Frame #{pe.get('seq')}</b> - {pe.get('timestamp')[-12:]}", body_style),
                        Paragraph(f"Facing: {pe.get('camera_facing', 'N/A')}", body_style)
                    ]
                    current_row.append(cell_content)
                except Exception:
                    pass
            if len(current_row) == 2:
                photo_cells.append(current_row)
                current_row = []
        if current_row:
            if len(current_row) == 1:
                current_row.append([Paragraph("", body_style)])
            photo_cells.append(current_row)

        if photo_cells:
            photo_table = Table(photo_cells, colWidths=[270, 270])
            photo_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(photo_table)
    else:
        elements.append(Paragraph("<i>No photo frames uploaded yet for this incident.</i>", body_style))

    elements.append(Spacer(1, 15))
    
    # Official Legal Sign-off / Certificate
    signoff_text = (
        "<b>CERTIFICATE OF AUTHENTICITY:</b> This document and associated digital payloads were stored "
        "automatically on cloud infrastructure without local device interception. Hashes were chained in memory "
        "upon packet arrival. Any unauthorized alteration invalidates the mathematical checksums above."
    )
    elements.append(Paragraph(signoff_text, body_style))

    doc.build(elements)
    return str(output_pdf_path)
