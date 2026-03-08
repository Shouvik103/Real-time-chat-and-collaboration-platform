#pragma once

#include <grpcpp/grpcpp.h>
#include "encryption.grpc.pb.h"

#include <cstdint>
#include <vector>

namespace server {

class EncryptionServiceImpl final : public encryption::EncryptionService::Service {
public:
    explicit EncryptionServiceImpl(std::vector<uint8_t> master_key);

    grpc::Status Encrypt(grpc::ServerContext* context,
                         const encryption::EncryptRequest* request,
                         encryption::EncryptResponse* response) override;

    grpc::Status Decrypt(grpc::ServerContext* context,
                         const encryption::DecryptRequest* request,
                         encryption::DecryptResponse* response) override;

private:
    std::vector<uint8_t> master_key_;
};

}  // namespace server
