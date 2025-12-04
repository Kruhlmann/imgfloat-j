package com.imgfloat.app;

import com.imgfloat.app.model.TransformRequest;
import com.imgfloat.app.model.VisibilityRequest;
import com.imgfloat.app.service.ChannelDirectoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;

import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ChannelDirectoryServiceTest {
    private ChannelDirectoryService service;
    private SimpMessagingTemplate messagingTemplate;

    @BeforeEach
    void setup() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        service = new ChannelDirectoryService(messagingTemplate);
    }

    @Test
    void createsAssetsAndBroadcastsEvents() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", samplePng());

        Optional<?> created = service.createAsset("caster", file);
        assertThat(created).isPresent();
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(org.mockito.ArgumentMatchers.contains("/topic/channel/caster"), captor.capture());
    }

    @Test
    void updatesTransformAndVisibility() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", samplePng());
        String channel = "caster";
        String id = service.createAsset(channel, file).orElseThrow().getId();

        TransformRequest transform = new TransformRequest();
        transform.setX(10);
        transform.setY(20);
        transform.setWidth(200);
        transform.setHeight(150);
        transform.setRotation(45);

        assertThat(service.updateTransform(channel, id, transform)).isPresent();

        VisibilityRequest visibilityRequest = new VisibilityRequest();
        visibilityRequest.setHidden(false);
        assertThat(service.updateVisibility(channel, id, visibilityRequest)).isPresent();
    }

    private byte[] samplePng() throws IOException {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
