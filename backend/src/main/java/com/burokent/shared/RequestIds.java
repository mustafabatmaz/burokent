package com.burokent.shared;

import org.jspecify.annotations.Nullable;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/** Id of the current HTTP request, set by the request id filter; also returned in the {@code X-Request-Id} header. */
public final class RequestIds {

    public static final String HEADER = "X-Request-Id";
    public static final String ATTRIBUTE = RequestIds.class.getName();

    private RequestIds() {}

    public static @Nullable String current() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }
        return (String) attributes.getAttribute(ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
    }
}
