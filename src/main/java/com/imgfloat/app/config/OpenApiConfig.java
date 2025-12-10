package com.imgfloat.app.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI imgfloatOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Imgfloat API")
                        .description("OpenAPI documentation for Imgfloat admin and broadcaster APIs.")
                        .version("v1"));
    }
}
