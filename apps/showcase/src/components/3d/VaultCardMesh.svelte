<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import * as THREE from 'three';

  interface Props {
    rotationY?: number;
  }

  let { rotationY = 0 }: Props = $props();

  let groupRef = $state<THREE.Group>(new THREE.Group());
  let currentRotY = $state<number>(0);

  // Smooth lerp towards target rotation + subtle auto spin
  useTask((delta) => {
    currentRotY += (rotationY - currentRotY) * Math.min(delta * 4.0, 1.0);
    if (groupRef) {
      groupRef.rotation.y = currentRotY;
    }
  });

  // Material definitions
  const titaniumMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f524c,
    metalness: 0.8,
    roughness: 0.25,
  });

  const coralChipMaterial = new THREE.MeshStandardMaterial({
    color: 0xd96b4b,
    metalness: 0.6,
    roughness: 0.3,
  });

  const goldSealMaterial = new THREE.MeshStandardMaterial({
    color: 0x059669,
    emissive: 0x059669,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  const hazardLineMaterial = new THREE.MeshBasicMaterial({
    color: 0xd97706, // Month 12 Cliff warning
  });
</script>

<T.Group bind:ref={groupRef} position={[0, 0, 0]}>
  <!-- Card Main Slab (Standard ID-1 Ratio 3.38 x 2.14 x 0.08) -->
  <T.Mesh material={titaniumMaterial} castShadow receiveShadow>
    <T.BoxGeometry args={[3.38, 2.14, 0.08]} />
  </T.Mesh>

  <!-- BGB § 477 Month 12 Cliff Boundary Line -->
  <T.Mesh material={hazardLineMaterial} position={[0, -0.65, 0.045]}>
    <T.BoxGeometry args={[2.9, 0.04, 0.01]} />
  </T.Mesh>

  <!-- Laser-etched BGB Chip Front Plate -->
  <T.Mesh material={coralChipMaterial} position={[-0.95, 0.55, 0.045]}>
    <T.BoxGeometry args={[0.9, 0.55, 0.02]} />
  </T.Mesh>

  <!-- Reverse Side Cryptographic Sovereign Seal -->
  <T.Mesh material={goldSealMaterial} position={[0, 0.1, -0.045]}>
    <T.CylinderGeometry args={[0.35, 0.35, 0.03, 32]} />
  </T.Mesh>
</T.Group>
