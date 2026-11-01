
package com.example.iam_platform.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findAllByUser_IdAndRevokedFalseAndExpiresAtAfter(
            Long userId,
            Instant now
    );

    Optional<RefreshToken> findByIdAndUser_Id(
            UUID sessionId,
            Long userId
    );

    List<RefreshToken> findAllByUser_IdAndRevokedFalse(Long userId);
}
