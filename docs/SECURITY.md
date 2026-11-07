# ShareX Security & Privacy Architecture

ShareX is built on a zero-trust, privacy-first peer-to-peer foundation designed to eliminate central server custody of user data.

---

## 1. Storage-Free Architecture
- **No Cloud Storage**: Neither user files, chunks, nor raw payloads ever pass through or reside on cloud storage buckets or database tables.
- **Direct P2P DataChannels**: Transfers occur directly between the sender and receiver's browsers using WebRTC RTCDataChannel connections.
- **Worker Isolation**: The signaling worker is restricted to small JSON session metadata (SDP offers/answers and ICE candidate signals). Payloads exceeding 64KB are rejected to prevent file leakage through signaling channels.

---

## 2. WebRTC Transport Security
- **DTLS Encryption**: All WebRTC DataChannels are encrypted end-to-end via Datagram Transport Layer Security (DTLS).
- **SRTP / SCTP Protection**: Traffic between peers is authenticated and shielded against eavesdropping and tampering by intermediate network entities.

---

## 3. Cryptographic Integrity Verification (SHA-256)
- **Sender Hashing**: The sender computes the SHA-256 hash using the native browser Web Crypto API (`crypto.subtle.digest('SHA-256')`).
- **Receiver Hashing**: Upon assembling the received binary chunks, the receiver independently computes the SHA-256 hash of the received Blob.
- **Integrity Validation**: If the hashes match, the transfer is certified. If they differ, the file is rejected with a tampering/corruption error.

---

## 4. Consent & Authorization
- **Explicit Receiver Consent**: A peer cannot push files to a receiver without explicit confirmation. A modal displays the sender's device name, the list of file names, and the byte volume for receiver approval.
- **Ephemeral Pairing Codes**: Pairing codes (format `XXX-XXXX-XX`) expire after 5 minutes (300 seconds), after which the session room is discarded and rebuilt.
- **Rate Limiting**: The Cloudflare Worker enforces IP-based rate limiting (120 requests/minute) to mitigate brute-force attempts on pairing rooms.
