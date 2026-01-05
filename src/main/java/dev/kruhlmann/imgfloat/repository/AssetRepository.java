package dev.kruhlmann.imgfloat.repository;

import dev.kruhlmann.imgfloat.model.Asset;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetRepository extends JpaRepository<Asset, String> {
    List<Asset> findByBroadcaster(String broadcaster);
    List<Asset> findByBroadcasterAndHiddenFalse(String broadcaster);
}
