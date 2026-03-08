#include "aes_gcm.h"

#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>

#include <algorithm>
#include <stdexcept>
#include <memory>

namespace crypto {

// ── helpers ─────────────────────────────────────────────────────────────────

std::vector<uint8_t> hex_to_bytes(const std::string& hex) {
    if (hex.size() != static_cast<size_t>(kKeyLength * 2)) {
        throw std::invalid_argument("MASTER_KEY must be exactly 64 hex characters (32 bytes)");
    }
    std::vector<uint8_t> bytes(kKeyLength);
    for (size_t i = 0; i < kKeyLength; ++i) {
        auto hi = hex[i * 2];
        auto lo = hex[i * 2 + 1];
        auto nibble = [](char c) -> uint8_t {
            if (c >= '0' && c <= '9') return static_cast<uint8_t>(c - '0');
            if (c >= 'a' && c <= 'f') return static_cast<uint8_t>(c - 'a' + 10);
            if (c >= 'A' && c <= 'F') return static_cast<uint8_t>(c - 'A' + 10);
            throw std::invalid_argument("Invalid hex character in MASTER_KEY");
        };
        bytes[i] = static_cast<uint8_t>((nibble(hi) << 4) | nibble(lo));
    }
    return bytes;
}

std::string base64_encode(const uint8_t* data, size_t len) {
    BIO* b64 = BIO_new(BIO_f_base64());
    BIO* bmem = BIO_new(BIO_s_mem());
    b64 = BIO_push(b64, bmem);
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
    BIO_write(b64, data, static_cast<int>(len));
    BIO_flush(b64);
    BUF_MEM* bptr = nullptr;
    BIO_get_mem_ptr(b64, &bptr);
    std::string result(bptr->data, bptr->length);
    BIO_free_all(b64);
    return result;
}

std::vector<uint8_t> base64_decode(const std::string& encoded) {
    BIO* b64 = BIO_new(BIO_f_base64());
    BIO* bmem = BIO_new_mem_buf(encoded.data(), static_cast<int>(encoded.size()));
    bmem = BIO_push(b64, bmem);
    BIO_set_flags(bmem, BIO_FLAGS_BASE64_NO_NL);
    std::vector<uint8_t> buffer(encoded.size());
    int decoded_len = BIO_read(bmem, buffer.data(), static_cast<int>(buffer.size()));
    BIO_free_all(bmem);
    if (decoded_len < 0) {
        throw std::runtime_error("Base64 decode failed");
    }
    buffer.resize(static_cast<size_t>(decoded_len));
    return buffer;
}

// ── encrypt ─────────────────────────────────────────────────────────────────

EncryptResult aes_gcm_encrypt(const std::vector<uint8_t>& key,
                              const uint8_t* plaintext,
                              size_t plaintext_len) {
    if (key.size() != kKeyLength) {
        throw std::invalid_argument("Key must be 32 bytes for AES-256");
    }

    // Generate random IV
    std::vector<uint8_t> iv(kIvLength);
    if (RAND_bytes(iv.data(), kIvLength) != 1) {
        throw std::runtime_error("Failed to generate random IV");
    }

    std::unique_ptr<EVP_CIPHER_CTX, decltype(&EVP_CIPHER_CTX_free)> ctx(
        EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
    if (!ctx) throw std::runtime_error("EVP_CIPHER_CTX_new failed");

    if (EVP_EncryptInit_ex(ctx.get(), EVP_aes_256_gcm(), nullptr, nullptr, nullptr) != 1)
        throw std::runtime_error("EVP_EncryptInit_ex failed");

    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_SET_IVLEN, kIvLength, nullptr) != 1)
        throw std::runtime_error("Failed to set IV length");

    if (EVP_EncryptInit_ex(ctx.get(), nullptr, nullptr, key.data(), iv.data()) != 1)
        throw std::runtime_error("EVP_EncryptInit_ex (key+iv) failed");

    std::vector<uint8_t> ciphertext(plaintext_len + kTagLength);
    int out_len = 0;
    if (EVP_EncryptUpdate(ctx.get(), ciphertext.data(), &out_len, plaintext,
                          static_cast<int>(plaintext_len)) != 1)
        throw std::runtime_error("EVP_EncryptUpdate failed");

    int final_len = 0;
    if (EVP_EncryptFinal_ex(ctx.get(), ciphertext.data() + out_len, &final_len) != 1)
        throw std::runtime_error("EVP_EncryptFinal_ex failed");

    ciphertext.resize(static_cast<size_t>(out_len + final_len));

    std::vector<uint8_t> tag(kTagLength);
    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_GET_TAG, kTagLength, tag.data()) != 1)
        throw std::runtime_error("Failed to get auth tag");

    return {std::move(ciphertext), std::move(iv), std::move(tag)};
}

// ── decrypt ─────────────────────────────────────────────────────────────────

std::vector<uint8_t> aes_gcm_decrypt(const std::vector<uint8_t>& key,
                                     const uint8_t* ciphertext,
                                     size_t ciphertext_len,
                                     const uint8_t* iv,
                                     size_t iv_len,
                                     const uint8_t* tag,
                                     size_t tag_len) {
    if (key.size() != kKeyLength)
        throw std::invalid_argument("Key must be 32 bytes for AES-256");

    std::unique_ptr<EVP_CIPHER_CTX, decltype(&EVP_CIPHER_CTX_free)> ctx(
        EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
    if (!ctx) throw std::runtime_error("EVP_CIPHER_CTX_new failed");

    if (EVP_DecryptInit_ex(ctx.get(), EVP_aes_256_gcm(), nullptr, nullptr, nullptr) != 1)
        throw std::runtime_error("EVP_DecryptInit_ex failed");

    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_SET_IVLEN,
                            static_cast<int>(iv_len), nullptr) != 1)
        throw std::runtime_error("Failed to set IV length");

    if (EVP_DecryptInit_ex(ctx.get(), nullptr, nullptr, key.data(), iv) != 1)
        throw std::runtime_error("EVP_DecryptInit_ex (key+iv) failed");

    std::vector<uint8_t> plaintext(ciphertext_len);
    int out_len = 0;
    if (EVP_DecryptUpdate(ctx.get(), plaintext.data(), &out_len, ciphertext,
                          static_cast<int>(ciphertext_len)) != 1)
        throw std::runtime_error("EVP_DecryptUpdate failed");

    // Set expected auth tag before final
    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_SET_TAG,
                            static_cast<int>(tag_len),
                            const_cast<uint8_t*>(tag)) != 1)
        throw std::runtime_error("Failed to set auth tag");

    int final_len = 0;
    if (EVP_DecryptFinal_ex(ctx.get(), plaintext.data() + out_len, &final_len) != 1)
        throw std::runtime_error("Authentication failed — data may be corrupted or wrong key");

    plaintext.resize(static_cast<size_t>(out_len + final_len));
    return plaintext;
}

}  // namespace crypto
