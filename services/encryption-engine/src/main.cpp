#include <cstdlib>
#include <iostream>
#include <string>

#include <grpcpp/grpcpp.h>

#include "crypto/aes_gcm.h"
#include "server/encryption_service_impl.h"

int main() {
    // ── Load master key from environment ────────────────────────────────────
    const char* key_env = std::getenv("MASTER_KEY");
    if (!key_env || std::string(key_env).empty()) {
        std::cerr << "[FATAL] MASTER_KEY environment variable is not set.\n"
                  << "        It must be a 64-character hex string (32 bytes).\n";
        return 1;
    }

    std::vector<uint8_t> master_key;
    try {
        master_key = crypto::hex_to_bytes(key_env);
    } catch (const std::exception& e) {
        std::cerr << "[FATAL] Invalid MASTER_KEY: " << e.what() << "\n";
        return 1;
    }

    // ── Configure gRPC server ───────────────────────────────────────────────
    const std::string listen_addr = "0.0.0.0:50051";

    server::EncryptionServiceImpl service(std::move(master_key));

    grpc::ServerBuilder builder;
    builder.AddListeningPort(listen_addr, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);
    builder.SetMaxReceiveMessageSize(16 * 1024 * 1024);  // 16 MB

    std::unique_ptr<grpc::Server> grpc_server(builder.BuildAndStart());
    if (!grpc_server) {
        std::cerr << "[FATAL] Failed to start gRPC server on " << listen_addr << "\n";
        return 1;
    }

    std::cout << "[INFO] Encryption Engine listening on " << listen_addr << "\n";
    grpc_server->Wait();

    return 0;
}
