#include "encryption_service_impl.h"
#include "../crypto/aes_gcm.h"
#include "../crypto/compressor.h"

#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>

namespace {

std::string timestamp() {
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                  now.time_since_epoch()) %
              1000;
    std::ostringstream ss;
    ss << std::put_time(std::gmtime(&time), "%Y-%m-%dT%H:%M:%S")
       << '.' << std::setfill('0') << std::setw(3) << ms.count() << 'Z';
    return ss.str();
}

void log(const std::string& level, const std::string& msg) {
    std::cout << "[" << timestamp() << "] [" << level << "] " << msg << std::endl;
}

}  // namespace

namespace server {

EncryptionServiceImpl::EncryptionServiceImpl(std::vector<uint8_t> master_key)
    : master_key_(std::move(master_key)) {}

grpc::Status EncryptionServiceImpl::Encrypt(
    grpc::ServerContext* /*context*/,
    const encryption::EncryptRequest* request,
    encryption::EncryptResponse* response) {

    const auto& plaintext = request->plaintext();
    if (plaintext.empty()) {
        log("WARN", "Encrypt called with empty plaintext");
        return grpc::Status(grpc::StatusCode::INVALID_ARGUMENT, "Plaintext must not be empty");
    }

    try {
        // 1. Compress
        auto compressed = crypto::lz4_compress(
            reinterpret_cast<const uint8_t*>(plaintext.data()), plaintext.size());

        // 2. Encrypt
        auto result = crypto::aes_gcm_encrypt(master_key_, compressed.data(), compressed.size());

        // 3. Base64-encode outputs
        response->set_ciphertext(crypto::base64_encode(result.ciphertext.data(), result.ciphertext.size()));
        response->set_iv(crypto::base64_encode(result.iv.data(), result.iv.size()));
        response->set_auth_tag(crypto::base64_encode(result.tag.data(), result.tag.size()));

        log("INFO", "Encrypt OK — plaintext " + std::to_string(plaintext.size()) +
                     "B → compressed " + std::to_string(compressed.size()) +
                     "B → ciphertext " + std::to_string(result.ciphertext.size()) + "B");

        return grpc::Status::OK;

    } catch (const std::exception& e) {
        log("ERROR", std::string("Encrypt failed: ") + e.what());
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status EncryptionServiceImpl::Decrypt(
    grpc::ServerContext* /*context*/,
    const encryption::DecryptRequest* request,
    encryption::DecryptResponse* response) {

    if (request->ciphertext().empty() || request->iv().empty() || request->auth_tag().empty()) {
        log("WARN", "Decrypt called with missing fields");
        return grpc::Status(grpc::StatusCode::INVALID_ARGUMENT,
                            "ciphertext, iv, and auth_tag are all required");
    }

    try {
        // 1. Base64-decode inputs
        auto ciphertext = crypto::base64_decode(request->ciphertext());
        auto iv = crypto::base64_decode(request->iv());
        auto tag = crypto::base64_decode(request->auth_tag());

        // 2. Decrypt
        auto compressed = crypto::aes_gcm_decrypt(
            master_key_,
            ciphertext.data(), ciphertext.size(),
            iv.data(), iv.size(),
            tag.data(), tag.size());

        // 3. Decompress
        auto plaintext = crypto::lz4_decompress(compressed.data(), compressed.size());

        response->set_plaintext(std::string(plaintext.begin(), plaintext.end()));

        log("INFO", "Decrypt OK — ciphertext " + std::to_string(ciphertext.size()) +
                     "B → plaintext " + std::to_string(plaintext.size()) + "B");

        return grpc::Status::OK;

    } catch (const std::exception& e) {
        log("ERROR", std::string("Decrypt failed: ") + e.what());
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

}  // namespace server
