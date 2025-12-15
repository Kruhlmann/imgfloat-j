package dev.kruhlmann.imgfloat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.unit.DataSize;

@Configuration
public class UploadLimitsConfig {

    private final Environment environment;

    public UploadLimitsConfig(Environment environment) {
        this.environment = environment;
    }

    @Bean
    public long uploadLimitBytes() {
        String value = environment.getProperty("spring.servlet.multipart.max-file-size");
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                "spring.servlet.multipart.max-file-size is not set"
            );
        }

        return DataSize.parse(value).toBytes();
    }

    @Bean
    public long uploadRequestLimitBytes() {
        String value = environment.getProperty("spring.servlet.multipart.max-request-size");
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                "spring.servlet.multipart.max-request-size is not set"
            );
        }

        return DataSize.parse(value).toBytes();
    }
}
