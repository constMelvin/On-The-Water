package com.gala.otw_server.security.auth;

import com.gala.otw_server.common.DomainExceptions.AccountRequiredException;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

/**
 * AOP before-advice for {@link RequireAccount}: rejects anonymous sessions with
 * {@code 401 ACCOUNT_REQUIRED}.
 */
@Aspect
@Component
public class AccountRequiredAspect {

    private final CurrentUserProvider currentUser;

    public AccountRequiredAspect(CurrentUserProvider currentUser) {
        this.currentUser = currentUser;
    }

    @Before("@annotation(com.gala.otw_server.security.auth.RequireAccount) "
            + "|| @within(com.gala.otw_server.security.auth.RequireAccount)")
    public void enforce() {
        if (currentUser.isAnonymous()) {
            throw new AccountRequiredException();
        }
    }
}
