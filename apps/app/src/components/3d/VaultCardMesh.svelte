<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import * as THREE from 'three';

  interface Props {
    step?: number;
    rotationY?: number;
  }

  let { step = 1, rotationY = 0 }: Props = $props();

  let groupRef = $state<THREE.Group>(new THREE.Group());
  let currentRotY = $state<number>(0);

  // Smooth lerp towards target rotation
  useTask((delta) => {
    currentRotY += (rotationY - currentRotY) * Math.min(delta * 5.0, 1.0);
    if (groupRef) {
      groupRef.rotation.y = currentRotY;
    }
  });

  // Material definitions
  // 1. Brushed Gunmetal Titanium (Hardware card front)
  const titaniumMaterial = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.22,
  });

  // 2. Deep Matte Forest Teal Acrylic (Subscription card back / container)
  const tealAcrylicMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2f524c,
    roughness: 0.35,
    transmission: 0.55,
    thickness: 0.5,
    reflectivity: 0.6,
  });

  // 3. Emissive Accent Badges
  const lockSealMaterial = new THREE.MeshStandardMaterial({
    color: 0x059669,
    emissive: 0x059669,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  const hazardLineMaterial = new THREE.MeshBasicMaterial({
    color: 0xd97706, // Month 12 Cliff warning
  });

  const urgentBeaconMaterial = new THREE.MeshBasicMaterial({
    color: 0xdc2626, // 7-day urgent beacon
  });

  const warningBeaconMaterial = new THREE.MeshBasicMaterial({
    color: 0xd97706, // 30-day warning beacon
  });

  const protectedBeaconMaterial = new THREE.MeshBasicMaterial({
    color: 0x059669, // Protected beacon
  });
</script>

<T.Group bind:ref={groupRef} position={[0, 0, 0]}>
  <!-- Card Main Slab (Width 3.375, Height 2.125, Depth 0.08 - ID-1 Standard Credit/Card Ratio) -->
  <T.Mesh material={titaniumMaterial} castShadow receiveShadow>
    <T.BoxGeometry args={[3.38, 2.14, 0.08]} />
  </T.Mesh>

  <!-- Month 12 Hazard Line (BGB § 477 Beweislastumkehr boundary on front side z=0.045) -->
  <T.Mesh
    material={hazardLineMaterial}
    position={[0, -0.65, 0.045]}
  >
    <T.BoxGeometry args={[2.9, 0.04, 0.01]} />
  </T.Mesh>

  <!-- Laser-etched BGB Badge Front Plate -->
  <T.Mesh
    material={tealAcrylicMaterial}
    position={[-0.95, 0.6, 0.045]}
  >
    <T.BoxGeometry args={[1.0, 0.35, 0.01]} />
  </T.Mesh>

  <!-- Reverse Side (Cryptographic Sovereign Lock Vault z=-0.045) -->
  <T.Mesh
    material={tealAcrylicMaterial}
    position={[0, 0, -0.045]}
  >
    <T.BoxGeometry args={[3.2, 1.95, 0.01]} />
  </T.Mesh>

  <!-- Cryptographic Lock Seal Glyphs on Reverse Side -->
  <T.Mesh
    material={lockSealMaterial}
    position={[0, 0.1, -0.055]}
  >
    <T.CylinderGeometry args={[0.3, 0.3, 0.04, 32]} />
  </T.Mesh>

  <!-- Step 3: Color-Coded Urgency Beacons -->
  {#if step === 3}
    <T.Group position={[0.8, -0.2, 0.05]}>
      <T.Mesh material={urgentBeaconMaterial} position={[-0.4, 0, 0]}>
        <T.SphereGeometry args={[0.08, 16, 16]} />
      </T.Mesh>
      <T.Mesh material={warningBeaconMaterial} position={[0, 0, 0]}>
        <T.SphereGeometry args={[0.08, 16, 16]} />
      </T.Mesh>
      <T.Mesh material={protectedBeaconMaterial} position={[0.4, 0, 0]}>
        <T.SphereGeometry args={[0.08, 16, 16]} />
      </T.Mesh>
    </T.Group>
  {/if}
</T.Group>
