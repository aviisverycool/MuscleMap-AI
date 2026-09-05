import * as THREE from "three";

// Outline the combined silhouette, rather than each separate body mesh, so
// intersecting joints never produce internal rings or overlapping lines.
export function createBodyMapOutline(renderer, scene, camera) {
  const mask = new THREE.WebGLRenderTarget(1, 1, {
    samples: Math.min(4, renderer.capabilities.maxSamples),
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const depthMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });
  const outlineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      silhouette: { value: mask.texture },
      pixelStep: { value: new THREE.Vector2() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D silhouette;
      uniform vec2 pixelStep;
      varying vec2 vUv;
      void main() {
        float center = texture2D(silhouette, vUv).a;
        float surrounding = center;
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixelStep;
            surrounding = max(surrounding, texture2D(silhouette, vUv + offset).a);
          }
        }
        gl_FragColor = vec4(1.0, 1.0, 1.0, max(0.0, surrounding - center));
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const outlineScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outlineMaterial);
  outlineScene.add(quad);
  const outlineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const drawingSize = new THREE.Vector2();

  return {
    resize() {
      renderer.getDrawingBufferSize(drawingSize);
      mask.setSize(drawingSize.x, drawingSize.y);
      const thickness = 1.5 * renderer.getPixelRatio();
      outlineMaterial.uniforms.pixelStep.value.set(
        thickness / drawingSize.x,
        thickness / drawingSize.y,
      );
    },
    render() {
      const previousAutoClear = renderer.autoClear;
      const previousOverride = scene.overrideMaterial;
      try {
        renderer.autoClear = true;
        renderer.setRenderTarget(mask);
        scene.overrideMaterial = maskMaterial;
        renderer.render(scene, camera);

        renderer.setRenderTarget(null);
        // Invisible front surfaces still occlude selected parts behind them.
        scene.overrideMaterial = depthMaterial;
        renderer.render(scene, camera);
        renderer.autoClear = false;
        scene.overrideMaterial = null;
        renderer.render(scene, camera);
        renderer.render(outlineScene, outlineCamera);
      } finally {
        scene.overrideMaterial = previousOverride;
        renderer.autoClear = previousAutoClear;
        renderer.setRenderTarget(null);
      }
    },
    dispose() {
      mask.dispose();
      maskMaterial.dispose();
      depthMaterial.dispose();
      outlineMaterial.dispose();
      quad.geometry.dispose();
    },
  };
}
