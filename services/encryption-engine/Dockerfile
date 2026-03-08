# ===========================================================================
# Encryption Engine — Multi-stage Docker build
# Stage 1: build C++ project with all dev dependencies
# Stage 2: copy binary into a minimal runtime image
# ===========================================================================

# ── Stage 1: Builder ──────────────────────────────────────────────────────

FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake pkg-config \
      libssl-dev liblz4-dev \
      libgrpc++-dev libprotobuf-dev protobuf-compiler-grpc \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --parallel "$(nproc)"

# ── Stage 2: Runtime ─────────────────────────────────────────────────────

FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      libssl3 liblz4-1 \
      libgrpc++1 libprotobuf23 \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app
COPY --from=builder /app/build/encryption_engine .

USER appuser

EXPOSE 50051

ENTRYPOINT ["./encryption_engine"]
