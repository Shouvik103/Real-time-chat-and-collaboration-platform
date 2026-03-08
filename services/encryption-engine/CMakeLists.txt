cmake_minimum_required(VERSION 3.16)
project(encryption-engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── Dependencies ─────────────────────────────────────────────────────────────

find_package(OpenSSL REQUIRED)
find_package(Protobuf REQUIRED)
find_package(gRPC CONFIG REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(LZ4 REQUIRED IMPORTED_TARGET liblz4)

# ── Proto code generation ────────────────────────────────────────────────────

set(PROTO_SRC_DIR "${CMAKE_SOURCE_DIR}/proto")
set(PROTO_GEN_DIR "${CMAKE_BINARY_DIR}/generated")
file(MAKE_DIRECTORY ${PROTO_GEN_DIR})

set(PROTO_FILE "${PROTO_SRC_DIR}/encryption.proto")
set(PB_CC  "${PROTO_GEN_DIR}/encryption.pb.cc")
set(PB_H   "${PROTO_GEN_DIR}/encryption.pb.h")
set(GRPC_CC "${PROTO_GEN_DIR}/encryption.grpc.pb.cc")
set(GRPC_H  "${PROTO_GEN_DIR}/encryption.grpc.pb.h")

find_program(PROTOC protoc REQUIRED)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin REQUIRED)

add_custom_command(
    OUTPUT ${PB_CC} ${PB_H} ${GRPC_CC} ${GRPC_H}
    COMMAND ${PROTOC}
        --proto_path=${PROTO_SRC_DIR}
        --cpp_out=${PROTO_GEN_DIR}
        --grpc_out=${PROTO_GEN_DIR}
        --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN}
        ${PROTO_FILE}
    DEPENDS ${PROTO_FILE}
    COMMENT "Generating Protobuf/gRPC C++ sources"
)

# ── Executable ───────────────────────────────────────────────────────────────

add_executable(encryption_engine
    src/main.cpp
    src/crypto/aes_gcm.cpp
    src/crypto/compressor.cpp
    src/server/encryption_service_impl.cpp
    ${PB_CC}
    ${GRPC_CC}
)

target_include_directories(encryption_engine PRIVATE
    ${PROTO_GEN_DIR}
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(encryption_engine PRIVATE
    OpenSSL::SSL
    OpenSSL::Crypto
    PkgConfig::LZ4
    protobuf::libprotobuf
    gRPC::grpc++
    gRPC::grpc++_reflection
)
