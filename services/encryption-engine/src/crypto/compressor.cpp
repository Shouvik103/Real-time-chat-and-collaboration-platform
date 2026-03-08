#include "compressor.h"

#include <lz4.h>
#include <cstring>
#include <stdexcept>

namespace crypto {

std::vector<uint8_t> lz4_compress(const uint8_t* data, size_t len) {
    if (len == 0) return {};

    int max_dst = LZ4_compressBound(static_cast<int>(len));
    // 4-byte LE prefix storing original size, then compressed payload
    std::vector<uint8_t> output(4 + static_cast<size_t>(max_dst));

    // Store original size as little-endian uint32
    uint32_t original_size = static_cast<uint32_t>(len);
    std::memcpy(output.data(), &original_size, 4);

    int compressed_size = LZ4_compress_default(
        reinterpret_cast<const char*>(data),
        reinterpret_cast<char*>(output.data() + 4),
        static_cast<int>(len),
        max_dst);

    if (compressed_size <= 0) {
        throw std::runtime_error("LZ4 compression failed");
    }

    output.resize(4 + static_cast<size_t>(compressed_size));
    return output;
}

std::vector<uint8_t> lz4_decompress(const uint8_t* data, size_t len) {
    if (len < 4) {
        throw std::runtime_error("LZ4 decompression failed — input too short");
    }

    // Read original size from 4-byte LE prefix
    uint32_t original_size = 0;
    std::memcpy(&original_size, data, 4);

    if (original_size == 0) return {};
    if (original_size > 64 * 1024 * 1024) {
        throw std::runtime_error("LZ4 decompression refused — claimed size exceeds 64 MB limit");
    }

    std::vector<uint8_t> output(original_size);
    int decompressed = LZ4_decompress_safe(
        reinterpret_cast<const char*>(data + 4),
        reinterpret_cast<char*>(output.data()),
        static_cast<int>(len - 4),
        static_cast<int>(original_size));

    if (decompressed < 0) {
        throw std::runtime_error("LZ4 decompression failed — data may be corrupted");
    }

    output.resize(static_cast<size_t>(decompressed));
    return output;
}

}  // namespace crypto
