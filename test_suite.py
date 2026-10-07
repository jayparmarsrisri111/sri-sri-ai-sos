from backend.evidence_manager import EvidenceManager
from backend.pdf_generator import generate_police_dossier_pdf
from pathlib import Path
import io
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def test_full_flow():
    mgr = EvidenceManager()
    inc = mgr.create_incident('Rohan Dave', '+91 9988776655', ['112', '+91 9900011223'])
    inc_id = inc['incident_id']
    print(f'1. Created test incident: {inc_id}')

    # Minimal valid 1x1 JPEG bytes
    sample_photo = bytes.fromhex(
        "ffd8ffe000104a46494600010101006000600000ffdb00430008060607060508070707"
        "0909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c28"
        "372c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f"
        "0000010501010101010100000000000000000102030405060708090a0bffda00080101"
        "00003f00bf00ffd9"
    )

    c1 = mgr.save_chunk(inc_id, 'photo', sample_photo, 'jpg', {'lat': 23.0225, 'lng': 72.5714, 'accuracy': 5}, 'environment', 1)
    print(f"2. Photo chunk #1 saved, chain hash: {c1['chain_hash'][:16]}...")

    # Minimal valid WAV header
    sample_audio = bytes.fromhex(
        "524946462400000057415645666d74201000000001000100401f0000803e0000020010006461746100000000"
    )
    c2 = mgr.save_chunk(inc_id, 'audio', sample_audio, 'wav', {'lat': 23.0228, 'lng': 72.5719, 'accuracy': 6}, 'mic', 2)
    print(f"3. Audio chunk #2 saved, chain hash: {c2['chain_hash'][:16]}...")

    # Verify integrity
    verification = mgr.verify_integrity(inc_id)
    print(f"4. Verification result: {verification}")
    assert verification['valid'] is True, "Verification failed!"

    # Test PDF generation
    meta = mgr.get_incident_metadata(inc_id)
    timeline = mgr.get_incident_timeline(inc_id)
    pdf_path = mgr.get_incident_dir(inc_id) / 'test_dossier.pdf'
    pdf_out = generate_police_dossier_pdf(meta, timeline, str(pdf_path), mgr.storage_dir)
    print(f"5. PDF Dossier generated: {pdf_out}")
    assert Path(pdf_out).exists()
    print("ALL TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.")

if __name__ == '__main__':
    test_full_flow()
