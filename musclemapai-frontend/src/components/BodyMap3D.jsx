import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three";

const DEFAULT_COLOR = new THREE.Color("#91a6b0");
const JOINT_COLOR = new THREE.Color("#7f959f");
const CORE_COLOR = new THREE.Color("#a2b4bb");
const HOVER_COLOR = new THREE.Color("#65d6b6");
const SELECTED_COLOR = new THREE.Color("#ff7b55");
const FULLY_ZOOMED_OUT_DISTANCE = 17;

function BodyMap3D({ onSelect, selectedPart }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const [webglError, setWebglError] = useState("");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let animationFrame;
    let resizeObserver;
    let controls;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, -0.1, FULLY_ZOOMED_OUT_DISTANCE);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 8;
      controls.maxDistance = FULLY_ZOOMED_OUT_DISTANCE;
      controls.minPolarAngle = Math.PI * 0.2;
      controls.maxPolarAngle = Math.PI * 0.78;
      controls.target.set(0, -0.15, 0);
      controls.mouseButtons.LEFT = null;
      controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
      controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      controls.update();
      controls.saveState();
      controlsRef.current = controls;

      scene.add(new THREE.HemisphereLight(0xe9fbff, 0x26323a, 2.4));

      const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
      keyLight.position.set(4, 7, 7);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x66d8bd, 2.1);
      rimLight.position.set(-5, 2, -5);
      scene.add(rimLight);

      const body = new THREE.Group();
      body.position.y = 0.1;
      scene.add(body);

      const selectableMeshes = [];

      const addPart = ({
        name,
        frontPart = name,
        backPart = name,
        geometry,
        position,
        rotation = [0, 0, 0],
        scale = [1, 1, 1],
        color = DEFAULT_COLOR,
      }) => {
        const material = new THREE.MeshStandardMaterial({
          color: color.clone(),
          emissive: 0x000000,
          roughness: 0.62,
          metalness: 0.04,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.scale.set(...scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
          name,
          frontPart,
          backPart,
          baseColor: color.clone(),
        };
        body.add(mesh);
        selectableMeshes.push(mesh);
        return mesh;
      };

      addPart({
        name: "Head",
        frontPart: "Face and head",
        backPart: "Back of head",
        geometry: new THREE.SphereGeometry(0.52, 30, 22),
        position: [0, 3.24, 0],
        scale: [0.84, 1.04, 0.86],
        color: CORE_COLOR,
      });
      addPart({
        name: "Neck",
        frontPart: "Neck",
        backPart: "Back of neck",
        geometry: new THREE.CylinderGeometry(0.2, 0.23, 0.42, 20),
        position: [0, 2.68, 0],
        color: JOINT_COLOR,
      });
      addPart({
        name: "Torso",
        frontPart: "Chest",
        backPart: "Upper back",
        geometry: new THREE.CapsuleGeometry(0.7, 0.72, 10, 24),
        position: [0, 1.62, 0],
        scale: [1.13, 1, 0.66],
        color: CORE_COLOR,
      });
      addPart({
        name: "Abdomen",
        frontPart: "Abdomen",
        backPart: "Lower back",
        geometry: new THREE.CapsuleGeometry(0.5, 0.35, 8, 22),
        position: [0, 0.46, 0],
        scale: [1.05, 1, 0.75],
        color: DEFAULT_COLOR,
      });
      addPart({
        name: "Pelvis",
        frontPart: "Hips",
        backPart: "Glutes",
        geometry: new THREE.CapsuleGeometry(0.54, 0.22, 8, 22),
        position: [0, -0.35, 0],
        scale: [1.18, 0.9, 0.82],
        color: CORE_COLOR,
      });

      const addArm = (side, direction) => {
        const x = direction;
        addPart({
          name: `${side} shoulder`,
          geometry: new THREE.SphereGeometry(0.36, 22, 16),
          position: [x * 0.98, 2.1, 0],
          scale: [1.08, 0.98, 1],
          color: JOINT_COLOR,
        });
        addPart({
          name: `${side} upper arm`,
          frontPart: `${side} bicep`,
          backPart: `${side} tricep`,
          geometry: new THREE.CapsuleGeometry(0.24, 0.9, 8, 20),
          position: [x * 1.66, 2.1, 0],
          rotation: [0, 0, Math.PI / 2],
        });
        addPart({
          name: `${side} elbow`,
          geometry: new THREE.SphereGeometry(0.25, 20, 14),
          position: [x * 2.38, 2.1, 0],
          color: JOINT_COLOR,
        });
        addPart({
          name: `${side} forearm`,
          geometry: new THREE.CapsuleGeometry(0.2, 0.88, 8, 20),
          position: [x * 2.98, 2.1, 0],
          rotation: [0, 0, Math.PI / 2],
        });
        addPart({
          name: `${side} hand`,
          geometry: new THREE.CapsuleGeometry(0.19, 0.22, 8, 18),
          position: [x * 3.66, 2.1, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [0.82, 1.08, 0.7],
          color: CORE_COLOR,
        });
      };

      // Anatomical left/right: the mannequin faces the initial camera.
      addArm("Left", 1);
      addArm("Right", -1);

      const addLeg = (side, direction) => {
        const x = direction * 0.4;
        addPart({
          name: `${side} hip`,
          geometry: new THREE.SphereGeometry(0.34, 22, 16),
          position: [x, -0.82, 0],
          color: JOINT_COLOR,
        });
        addPart({
          name: `${side} thigh`,
          frontPart: `${side} quadriceps`,
          backPart: `${side} hamstring`,
          geometry: new THREE.CapsuleGeometry(0.32, 1.08, 9, 22),
          position: [x, -1.57, 0],
          scale: [1, 1, 0.92],
        });
        addPart({
          name: `${side} knee`,
          geometry: new THREE.SphereGeometry(0.29, 22, 16),
          position: [x, -2.43, 0],
          scale: [1, 1.05, 0.9],
          color: JOINT_COLOR,
        });
        addPart({
          name: `${side} lower leg`,
          frontPart: `${side} shin`,
          backPart: `${side} calf`,
          geometry: new THREE.CapsuleGeometry(0.25, 0.98, 9, 22),
          position: [x, -3.12, 0],
          scale: [0.95, 1, 0.95],
        });
        addPart({
          name: `${side} foot`,
          geometry: new THREE.CapsuleGeometry(0.24, 0.42, 8, 20),
          position: [x, -3.9, 0.2],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.92, 1, 0.75],
          color: CORE_COLOR,
        });
      };

      addLeg("Left", 1);
      addLeg("Right", -1);

      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(2.15, 48),
        new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.25 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -4.16;
      shadow.receiveShadow = true;
      scene.add(shadow);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let selectedMesh = null;
      let hoveredMesh = null;
      let pointerStart = null;

      const paintMesh = (mesh, state) => {
        if (!mesh) return;
        if (state === "selected") {
          mesh.material.color.copy(SELECTED_COLOR);
          mesh.material.emissive.set("#45180c");
        } else if (state === "hover") {
          mesh.material.color.copy(HOVER_COLOR);
          mesh.material.emissive.set("#0b3529");
        } else {
          mesh.material.color.copy(mesh.userData.baseColor);
          mesh.material.emissive.set(0x000000);
        }
      };

      const getIntersection = (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        // Raycaster sorts nearest-first; only index 0 is selected so clicks
        // never pass through the visible surface to a body part behind it.
        return raycaster.intersectObjects(selectableMeshes, false)[0] || null;
      };

      const getBodyPart = (intersection) => {
        const mesh = intersection.object;
        const localPoint = mesh.worldToLocal(intersection.point.clone());
        return localPoint.z < -0.015
          ? mesh.userData.backPart
          : mesh.userData.frontPart;
      };

      const handlePointerDown = (event) => {
        pointerStart = {
          button: event.button,
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
        if (event.button === 2) {
          renderer.domElement.classList.add("is-orbiting");
        }
      };

      const handlePointerMove = (event) => {
        if (event.buttons !== 0) return;
        const intersection = getIntersection(event);
        const nextHovered = intersection?.object || null;
        if (nextHovered === hoveredMesh) return;
        if (hoveredMesh && hoveredMesh !== selectedMesh) {
          paintMesh(hoveredMesh, "default");
        }
        hoveredMesh = nextHovered;
        if (hoveredMesh && hoveredMesh !== selectedMesh) {
          paintMesh(hoveredMesh, "hover");
        }
        renderer.domElement.classList.toggle("is-over-part", Boolean(hoveredMesh));
      };

      const handlePointerUp = (event) => {
        renderer.domElement.classList.remove("is-orbiting");
        if (
          !pointerStart ||
          pointerStart.pointerId !== event.pointerId ||
          pointerStart.button !== 0
        ) {
          pointerStart = null;
          return;
        }

        const distance = Math.hypot(
          event.clientX - pointerStart.x,
          event.clientY - pointerStart.y
        );
        pointerStart = null;
        if (distance > 6) return;

        const intersection = getIntersection(event);
        if (!intersection) return;
        if (selectedMesh && selectedMesh !== intersection.object) {
          paintMesh(selectedMesh, "default");
        }
        selectedMesh = intersection.object;
        paintMesh(selectedMesh, "selected");
        onSelect(getBodyPart(intersection));
      };

      const handlePointerLeave = () => {
        renderer.domElement.classList.remove("is-orbiting", "is-over-part");
        if (hoveredMesh && hoveredMesh !== selectedMesh) {
          paintMesh(hoveredMesh, "default");
        }
        hoveredMesh = null;
      };

      const preventContextMenu = (event) => event.preventDefault();
      renderer.domElement.addEventListener("pointerdown", handlePointerDown);
      renderer.domElement.addEventListener("pointermove", handlePointerMove);
      renderer.domElement.addEventListener("pointerup", handlePointerUp);
      renderer.domElement.addEventListener("pointercancel", handlePointerLeave);
      renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.addEventListener("contextmenu", preventContextMenu);

      const resize = () => {
        const width = Math.max(mount.clientWidth, 1);
        const height = Math.max(mount.clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      const render = () => {
        controls.update();
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
      };
      render();

      return () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
        renderer.domElement.removeEventListener("pointermove", handlePointerMove);
        renderer.domElement.removeEventListener("pointerup", handlePointerUp);
        renderer.domElement.removeEventListener("pointercancel", handlePointerLeave);
        renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
        renderer.domElement.removeEventListener("contextmenu", preventContextMenu);
        controls.dispose();
        controlsRef.current = null;
        scene.traverse((object) => {
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material?.dispose?.();
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch (error) {
      console.error("Unable to initialize the 3D body map:", error);
      controls?.dispose();
      controlsRef.current = null;
      renderer?.dispose();
      renderer?.domElement?.remove();
      setWebglError("The interactive 3D view is unavailable in this browser.");
      return undefined;
    }
  }, [onSelect]);

  return (
    <div className="body-map-panel">
      <div className="body-map-toolbar">
        <div>
          <div className="body-map-eyebrow">3D body picker</div>
          <div className={`body-map-selection ${selectedPart ? "has-selection" : ""}`} aria-live="polite">
            {selectedPart ? `Selected: ${selectedPart}` : "Click the area you want help with"}
          </div>
        </div>
        <button
          type="button"
          className="body-map-reset"
          onClick={() => controlsRef.current?.reset()}
        >
          Reset view
        </button>
      </div>

      <div
        ref={mountRef}
        className="body-map-canvas"
        role="application"
        aria-label="Interactive 3D body map in a T-pose"
      >
        {webglError && <div className="body-map-error">{webglError}</div>}
      </div>

      <div className="body-map-controls" aria-hidden="true">
        <span><i className="control-dot click" />Click to select</span>
        <span><i className="control-dot drag" />Right-drag to move around</span>
        <span><i className="control-dot zoom" />Scroll to zoom</span>
      </div>
    </div>
  );
}

export default BodyMap3D;
