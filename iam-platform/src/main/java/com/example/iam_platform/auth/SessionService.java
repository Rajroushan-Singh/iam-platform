
package com.example.iam_platform.auth;

import com.example.iam_platform.user.User;
import com.example.iam_platform.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SessionService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    public SessionService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getActiveSessions(String email) {
        User user = findUser(email);

        return refreshTokenRepository
                .findAllByUser_IdAndRevokedFalseAndExpiresAtAfter(
                        user.getId(),
                        Instant.now()
                )
                .stream()
                .map(token -> new SessionResponse(
                        token.getId(),
                        token.getExpiresAt()
                ))
                .toList();
    }

    @Transactional
    public void revokeSession(String email, UUID sessionId) {
        User user = findUser(email);

        RefreshToken session = refreshTokenRepository
                .findByIdAndUser_Id(sessionId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Session not found"
                ));

        session.setRevoked(true);
        refreshTokenRepository.save(session);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }
}
