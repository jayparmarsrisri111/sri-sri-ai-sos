import os
import json
import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage" / "incidents"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class EvidenceManager:
    def __init__(self, storage_dir: Path = STORAGE_DIR):
        self.storage_dir = storage_dir
        self.active_incidents: Dict[str, Dict[str, Any]] = {}

    def get_incident_dir(self, incident_id: str) -> Path:
        inc_dir = self.storage_dir / incident_id
        inc_dir.mkdir(parents=True, exist_ok=True)
        (inc_dir / "photos").mkdir(exist_ok=True)
        (inc_dir / "audio").mkdir(exist_ok=True)
        return inc_dir

    def create_incident(self, user_name: str = "Anonymous", phone_number: str = "Unknown", emergency_contacts: Optional[List[str]] = None) -> Dict[str, Any]:
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        short_id = hashlib.sha256(f"{time.time()}_{user_name}".encode()).hexdigest()[:8].upper()
        incident_id = f"SOS_{timestamp_str}_{short_id}"
        
        inc_dir = self.get_incident_dir(incident_id)
        
        genesis_payload = f"GENESIS:{incident_id}:{user_name}:{timestamp_str}"
        genesis_hash = hashlib.sha256(genesis_payload.encode()).hexdigest()

        metadata = {
            "incident_id": incident_id,
            "user_name": user_name,
            "phone_number": phone_number,
            "emergency_contacts": emergency_contacts or [],
            "start_time": datetime.now(timezone.utc).isoformat(),
            "status": "ACTIVE",
            "last_hash": genesis_hash,
            "total_chunks": 0,
            "photo_count": 0,
            "audio_count": 0,
            "last_location": None,
            "location_history": []
        }

        with open(inc_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        # Initialize chain of custody log
        chain_entry = {
            "seq": 0,
            "type": "GENESIS",
            "timestamp": metadata["start_time"],
            "data_hash": genesis_hash,
            "chain_hash": genesis_hash,
            "note": "Incident initialized - Digital Chain of Custody started"
        }
        with open(inc_dir / "chain_of_custody.jsonl", "w", encoding="utf-8") as f:
            f.write(json.dumps(chain_entry) + "\n")

        self.active_incidents[incident_id] = metadata
        return metadata

    def get_incident_metadata(self, incident_id: str) -> Optional[Dict[str, Any]]:
        if incident_id in self.active_incidents:
            return self.active_incidents[incident_id]
        
        meta_file = self.storage_dir / incident_id / "metadata.json"
        if meta_file.exists():
            with open(meta_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.active_incidents[incident_id] = data
                return data
        return None

    def get_metadata(self, incident_id: str) -> Optional[Dict[str, Any]]:
        return self.get_incident_metadata(incident_id)

    def save_chunk(self, 
                   incident_id: str, 
                   chunk_type: str, 
                   data_bytes: bytes, 
                   file_ext: str, 
                   gps: Optional[Dict[str, Any]] = None,
                   camera_facing: Optional[str] = "environment",
                   seq: Optional[int] = None) -> Dict[str, Any]:
        
        metadata = self.get_incident_metadata(incident_id)
        if not metadata:
            metadata = self.create_incident()
            incident_id = metadata["incident_id"]

        inc_dir = self.get_incident_dir(incident_id)
        timestamp = datetime.now(timezone.utc).isoformat()
        next_seq = metadata["total_chunks"] + 1 if seq is None else seq
        
        # Calculate individual payload hash
        data_hash = hashlib.sha256(data_bytes).hexdigest()
        
        # Calculate cryptographic chain hash: SHA256(prev_chain_hash + data_hash + seq + timestamp)
        prev_chain_hash = metadata["last_hash"]
        chain_input = f"{prev_chain_hash}:{data_hash}:{next_seq}:{timestamp}"
        chain_hash = hashlib.sha256(chain_input.encode()).hexdigest()
        
        # Determine destination folder and filename
        sub_folder = "photos" if chunk_type == "photo" else "audio" if chunk_type == "audio" else "other"
        filename = f"{chunk_type}_{next_seq:04d}_{int(time.time()*1000)}.{file_ext}"
        filepath = inc_dir / sub_folder / filename
        
        with open(filepath, "wb") as f:
            f.write(data_bytes)
            
        # Update metadata stats
        metadata["total_chunks"] = next_seq
        metadata["last_hash"] = chain_hash
        if chunk_type == "photo":
            metadata["photo_count"] += 1
        elif chunk_type == "audio":
            metadata["audio_count"] += 1
            
        if gps and "lat" in gps and "lng" in gps:
            loc_entry = {
                "seq": next_seq,
                "timestamp": timestamp,
                "lat": gps.get("lat"),
                "lng": gps.get("lng"),
                "accuracy": gps.get("accuracy"),
                "speed": gps.get("speed"),
                "altitude": gps.get("altitude")
            }
            metadata["last_location"] = loc_entry
            metadata["location_history"].append(loc_entry)

        # Write chain entry
        chain_entry = {
            "seq": next_seq,
            "type": chunk_type,
            "filename": filename,
            "file_rel_path": f"{sub_folder}/{filename}",
            "size_bytes": len(data_bytes),
            "camera_facing": camera_facing,
            "timestamp": timestamp,
            "gps": gps,
            "data_hash": data_hash,
            "prev_chain_hash": prev_chain_hash,
            "chain_hash": chain_hash
        }

        with open(inc_dir / "chain_of_custody.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(chain_entry) + "\n")

        with open(inc_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return chain_entry

    def list_incidents(self) -> List[Dict[str, Any]]:
        results = []
        if not self.storage_dir.exists():
            return results
        for item in sorted(self.storage_dir.iterdir(), reverse=True):
            if item.is_dir() and (item / "metadata.json").exists():
                try:
                    with open(item / "metadata.json", "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        results.append(meta)
                except Exception:
                    pass
        return results

    def get_incident_timeline(self, incident_id: str) -> List[Dict[str, Any]]:
        inc_dir = self.storage_dir / incident_id
        chain_file = inc_dir / "chain_of_custody.jsonl"
        if not chain_file.exists():
            return []
        
        entries = []
        with open(chain_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        entries.append(json.loads(line))
                    except Exception:
                        pass
        return entries

    def verify_integrity(self, incident_id: str) -> Dict[str, Any]:
        """
        Validates the entire chain of custody from genesis block to current head.
        Verifies every file's SHA256 matches and every link in the chain is mathematically unbroken.
        """
        entries = self.get_incident_timeline(incident_id)
        if not entries:
            return {"valid": False, "error": "No chain of custody found"}

        inc_dir = self.storage_dir / incident_id
        
        # Step 1: Check genesis
        genesis = entries[0]
        if genesis.get("seq") != 0:
            return {"valid": False, "error": "Genesis block sequence is not 0"}

        current_chain_hash = genesis.get("chain_hash")
        verified_count = 0

        for entry in entries[1:]:
            seq = entry.get("seq")
            data_hash = entry.get("data_hash")
            prev_hash = entry.get("prev_chain_hash")
            claimed_chain_hash = entry.get("chain_hash")
            timestamp = entry.get("timestamp")
            file_rel_path = entry.get("file_rel_path")

            # Check chain link
            if prev_hash != current_chain_hash:
                return {
                    "valid": False,
                    "error": f"Chain link mismatch at sequence #{seq}. Possible tampering or deletion detected!",
                    "broken_at_seq": seq
                }

            # Check physical file integrity
            if file_rel_path:
                actual_file = inc_dir / file_rel_path
                if not actual_file.exists():
                    return {
                        "valid": False,
                        "status": "TAMPER_DETECTED",
                        "error": f"Evidence file missing on disk: {file_rel_path}",
                        "broken_at_seq": seq
                    }
                
                with open(actual_file, "rb") as f:
                    actual_data = f.read()
                recomputed_data_hash = hashlib.sha256(actual_data).hexdigest()
                if recomputed_data_hash != data_hash:
                    return {
                        "valid": False,
                        "status": "TAMPER_DETECTED",
                        "error": f"File content tampered at sequence #{seq}! File hash {recomputed_data_hash} != {data_hash}",
                        "broken_at_seq": seq
                    }

            # Recompute chain hash
            expected_input = f"{prev_hash}:{data_hash}:{seq}:{timestamp}"
            expected_chain_hash = hashlib.sha256(expected_input.encode()).hexdigest()
            if expected_chain_hash != claimed_chain_hash:
                return {
                    "valid": False,
                    "status": "TAMPER_DETECTED",
                    "error": f"Chain hash calculation mismatch at sequence #{seq}",
                    "broken_at_seq": seq
                }

            current_chain_hash = claimed_chain_hash
            verified_count += 1

        return {
            "valid": True,
            "status": "TAMPER_PROOF_VERIFIED",
            "total_verified_chunks": verified_count,
            "final_chain_hash": current_chain_hash,
            "audit_message": f"All {verified_count} evidence blocks verified with 100% cryptographic integrity."
        }

    def close_incident(self, incident_id: str, reason: str = "Resolved by user") -> Dict[str, Any]:
        metadata = self.get_incident_metadata(incident_id)
        if not metadata:
            return {"error": "Incident not found"}
        
        metadata["status"] = "CLOSED"
        metadata["closed_at"] = datetime.now(timezone.utc).isoformat()
        metadata["close_reason"] = reason
        
        inc_dir = self.storage_dir / incident_id
        with open(inc_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
            
        return metadata

    def delete_incident(self, incident_id: str) -> bool:
        import shutil
        if incident_id in self.active_incidents:
            del self.active_incidents[incident_id]
        inc_dir = self.storage_dir / incident_id
        if inc_dir.exists():
            shutil.rmtree(inc_dir, ignore_errors=True)
            return True
        return False
