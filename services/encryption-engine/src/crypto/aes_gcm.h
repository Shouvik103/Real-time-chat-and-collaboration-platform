#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace crypto {

constexpr int kKeyLength = 32;   // AES-256
constexpr int kIvLength = 12;    // GCM recommended
constexpr int kTagLength = 16;   // 128-bit auth tag

struct EncryptResult {
    std::vector<uint8_t> ciphertext;
    std::vector<uint8_t> iv;
    std::vector<uint8_t> tag;
};

/// Parse a 64-character hex string into a 32-byte key.
/// Throws std::invalid_argument on bad input.
std::vector<uint8_t> hex_to_bytes(const std::string& hex);

/// Encrypt plaintext using AES-256-GCM.
/// Generates a cryptographically-random 12-byte IV.
EncryptResult aes_gcm_encrypt(const std::vector<uint8_t>& key,
                              const uint8_t* plaintext,
                              size_t plaintext_len);

/// Decrypt ciphertext using AES-256-GCM.
/// Returns the plaintext bytes.  Throws std::runtime_error on auth failure.
std::vector<uint8_t> aes_gcm_decrypt(const std::vector<uint8_t>& key,
                                     const uint8_t* ciphertext,
                                     size_t ciphertext_len,
                                     const uint8_t* iv,
                                     size_t iv_len,
                                     const uint8_t* tag,
                                     size_t tag_len);

/// Base64-encode raw bytes.
std::string base64_encode(const uint8_t* data, size_t len);

/// Base64-decode a string to raw bytes.
std::vector<uint8_t> base64_decode(const std::string& encoded);

}  // namespace crypto
