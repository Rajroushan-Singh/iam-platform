
package com.example.iam_platform.auth;

import com.example.iam_platform.security.JwtService;
import com.example.iam_platform.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final long refreshExpirationMs;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            @Value("${app.jwt.refresh-expiration-ms}")
            long refreshExpirationMs
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    @Transactional
    public String createRefreshToken(User user) {
        byte[] randomBytes = new byte[64];
        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setTokenHash(hashToken(rawToken));
        refreshToken.setUser(user);
        refreshToken.setExpiresAt(
                Instant.now().plusMillis(refreshExpirationMs)
        );
        refreshToken.setRevoked(false);

        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    @Transactional
    public LoginResponse refreshAccessToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidRefreshToken();
        }

        RefreshToken storedToken = refreshTokenRepository
                .findByTokenHash(hashToken(rawToken))
                .orElseThrow(this::invalidRefreshToken);

        if (storedToken.isRevoked()
                || !storedToken.getExpiresAt().isAfter(Instant.now())) {
            throw invalidRefreshToken();
        }

        User user = storedToken.getUser();

        if (!user.isEnabled() || user.isLocked()) {
            throw invalidRefreshToken();
        }

        // Revoke the old token before issuing its replacement.
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        String newRefreshToken = createRefreshToken(user);
        String newAccessToken = jwtService.generateToken(user);

        return new LoginResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                "Bearer",
                newAccessToken,
                newRefreshToken,
                jwtService.getExpirationMs() / 1000,
                "Access token refreshed successfully"
        );
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return java.util.HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 is not available", exception
            );
        }
    }

    private ResponseStatusException invalidRefreshToken() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid, expired, or revoked refresh token"
        );
    }


    @Transactional
    public void revokeRefreshToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }

        String tokenHash = hashToken(rawToken);

        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }


    @Transactional
    public void revokeAllForUser(User user) {
        refreshTokenRepository
                .findAllByUser_IdAndRevokedFalse(user.getId())
                .forEach(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

}
