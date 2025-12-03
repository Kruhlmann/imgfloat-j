package com.imgfloat.app.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler;
import org.springframework.security.oauth2.core.OAuth2AuthorizationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.http.converter.OAuth2ErrorHttpMessageConverter;
import org.springframework.util.StreamUtils;

/**
 * Twitch occasionally returns error payloads without an {@code error} code field. The default
 * {@link OAuth2ErrorHttpMessageConverter} refuses to deserialize such payloads and throws an
 * {@link HttpMessageNotReadableException}. That propagates up as a 500 before we can surface a
 * meaningful login failure to the user. This handler falls back to a safe, synthetic
 * {@link OAuth2Error} so the login flow can fail gracefully.
 */
class TwitchOAuth2ErrorResponseErrorHandler extends OAuth2ErrorResponseErrorHandler {

    @Override
    public void handleError(ClientHttpResponse response) throws IOException {
        try {
            super.handleError(response);
        } catch (HttpMessageNotReadableException ex) {
            throw asAuthorizationException(response, ex);
        }
    }

    private OAuth2AuthorizationException asAuthorizationException(ClientHttpResponse response,
                                                                   HttpMessageNotReadableException ex) throws IOException {
        String body = StreamUtils.copyToString(response.getBody(), StandardCharsets.UTF_8);
        String description = "Failed to parse Twitch OAuth error response" + (body.isBlank() ? "." : ": " + body);
        OAuth2Error oauth2Error = new OAuth2Error("invalid_token_response", description, null);
        return new OAuth2AuthorizationException(oauth2Error, ex);
    }
}
