package com.gala.otw_server.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Logs one line per request, e.g. {@code GET /rooms/123 200 in 12ms}.
 * 4xx logs at WARN and 5xx at ERROR so failing endpoints stand out.
 * Only method, path, query, status and duration are logged — never headers or bodies (JWTs, passwords).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("http");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            int status = res.getStatus();
            String query = req.getQueryString() == null ? "" : "?" + req.getQueryString();
            long ms = System.currentTimeMillis() - start;
            if (status >= 500) {
                log.error("{} {}{} {} in {}ms", req.getMethod(), req.getRequestURI(), query, status, ms);
            } else if (status >= 400) {
                log.warn("{} {}{} {} in {}ms", req.getMethod(), req.getRequestURI(), query, status, ms);
            } else {
                log.info("{} {}{} {} in {}ms", req.getMethod(), req.getRequestURI(), query, status, ms);
            }
        }
    }
}
