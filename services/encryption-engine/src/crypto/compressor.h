#pragma once

#include <cstdint>
#include <vector>

namespace crypto {

/// LZ4 compress raw bytes.  Returns a self-contained frame including the
/// original uncompressed length as a 4-byte little-endian prefix so we can
/// decompress without knowing the size up-front.
std::vector<uint8_t> lz4_compress(const uint8_t* data, size_t len);

/// LZ4 decompress bytes produced by lz4_compress().
std::vector<uint8_t> lz4_decompress(const uint8_t* data, size_t len);

}  // namespace crypto
