# Encryption Engine

AES-256-GCM encryption service exposed over gRPC, with LZ4 compression.

## Stack

- **C++17** with CMake
- **gRPC** + **Protobuf** for the service interface
- **OpenSSL** (`EVP_aes_256_gcm`) for authenticated encryption
- **LZ4** for fast compression before encryption

## Environment Variables

| Variable     | Description                           | Example                                                          |
|-------------|---------------------------------------|------------------------------------------------------------------|
| `MASTER_KEY` | 64-character hex string (32 bytes)   | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |

## Proto

```protobuf
service EncryptionService {
  rpc Encrypt(EncryptRequest) returns (EncryptResponse);
  rpc Decrypt(DecryptRequest) returns (DecryptResponse);
}
```

### Encrypt flow

1. Receive plaintext string
2. LZ4 compress
3. Generate random 12-byte IV
4. AES-256-GCM encrypt with `MASTER_KEY`
5. Return base64-encoded: `ciphertext`, `iv`, `auth_tag`

### Decrypt flow

1. Receive base64-encoded `ciphertext`, `iv`, `auth_tag`
2. AES-256-GCM decrypt + authenticate
3. LZ4 decompress
4. Return plaintext

## Build & Run

```bash
# Native
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
MASTER_KEY=<64-hex-chars> ./build/encryption_engine

# Docker
docker build -t encryption-engine .
docker run -e MASTER_KEY=<64-hex-chars> -p 50051:50051 encryption-engine
```
