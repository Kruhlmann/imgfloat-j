package com.imgfloat.app;

import com.imgfloat.app.config.TwitchCredentialsValidator;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TwitchEnvironmentValidationTest {

    @Test
    void failsToStartWhenTwitchCredentialsMissing() {
        assertThatThrownBy(() -> new SpringApplicationBuilder(ImgfloatApplication.class)
                .properties("server.port=0")
                .run())
                .hasRootCauseInstanceOf(IllegalArgumentException.class)
                .hasRootCauseMessage("Could not resolve placeholder 'TWITCH_CLIENT_ID' in value \"${TWITCH_CLIENT_ID}\"");
    }

    @Test
    void loadsCredentialsFromDotEnvFile() {
        ConfigurableApplicationContext context = null;
        try {
            context = new SpringApplicationBuilder(ImgfloatApplication.class)
                    .properties(
                            "server.port=0",
                            "spring.config.import=optional:file:src/test/resources/valid.env[.properties]")
                    .run();
            ConfigurableApplicationContext finalContext = context;
            assertThatCode(() -> finalContext.getBean(TwitchCredentialsValidator.class))
                    .doesNotThrowAnyException();
        } finally {
            if (context != null) {
                context.close();
            }
        }
    }
}
