"use client";

import { useEffect, useRef } from "react";

type Rig = { position: { y: number }; skin: Record<"rightArm" | "leftArm" | "rightLeg" | "leftLeg" | "head" | "body", { rotation: { x: number; y: number; z: number }; position: { x: number; y: number; z: number } }> };

// Chaque pose est une boucle en fonction du temps t (secondes) ; x = avant/arrière, z = écart latéral.
// Instant de la boucle où la pose est la plus marquée (bras levés au maximum pour l'acclamation).
const PEAK: Record<string, number> = { cheering: 0.52 };

const LOOPS: Record<string, (p: Rig["skin"], t: number, o: { position: { y: number } }) => void> = {
  // Les bras montent au-dessus de la tête puis redescendent.
  cheering: (p, t) => {
    const up = 0.5 + 0.5 * Math.sin(t * 3);
    p.rightArm.rotation.z = -0.15 - 1.9 * up; p.leftArm.rotation.z = 0.15 + 1.9 * up; // montent par les côtés, sans traverser la tête
    p.head.rotation.x = -0.15 * up;
  },
  // Bras croisés, respiration lente et léger balancement de tête.
  crossed: (p, t) => {
    p.rightArm.rotation.x = -0.75; p.rightArm.rotation.z = 0.35;
    p.leftArm.rotation.x = -0.75; p.leftArm.rotation.z = -0.35;
    p.body.rotation.x = 0.02 * Math.sin(t * 2); p.head.rotation.y = 0.35 * Math.sin(t * 0.8);
  },
  // Détendu : la tête se balade, un bras se balance, une jambe en appui.
  relaxing: (p, t) => {
    p.head.rotation.y = 0.5 * Math.sin(t * 0.9); p.head.rotation.z = 0.1 * Math.sin(t * 0.9);
    p.rightArm.rotation.x = 0.15 * Math.sin(t * 1.5); p.leftArm.rotation.x = -0.15 * Math.sin(t * 1.5);
    p.rightLeg.rotation.x = -0.3; p.leftLeg.rotation.z = -0.08;
  },
  // Vainqueur (figé) : un bras tendu vers le ciel, l'autre baissé, de face, menton levé, jambes ouvertes.
  winner: (p) => {
    p.rightArm.rotation.z = -2.75; p.rightArm.rotation.x = -0.15;
    p.leftArm.rotation.z = 0.3; p.leftArm.rotation.x = 0.1;
    p.rightLeg.rotation.z = 0.15; p.leftLeg.rotation.z = -0.15;
    p.head.rotation.x = -0.15;
  },
  // Fente : la jambe avant et le poing partent vers l'avant, en boucle.
  lunging: (p, t) => {
    const k = 0.5 + 0.5 * Math.sin(t * 4);
    p.rightLeg.rotation.x = -0.9 * k; p.leftLeg.rotation.x = 0.5 * k;
    p.rightArm.rotation.x = -1.6 * k; p.leftArm.rotation.x = 0.6 * k;
    p.body.rotation.x = 0.15 * k;
  },
};

/** Skin 3D posé (skinview3d). Glisser pour tourner ; le zoom est désactivé pour ne pas bloquer le scroll. */
export default function SkinPose({ skinUrl, pose, className }: { skinUrl: string; pose: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let dispose = () => {};
    let alive = true;
    import("skinview3d").then(({ SkinViewer, WalkingAnimation }) => {
      if (!alive || !ref.current) return;
      const v = new SkinViewer({ canvas: ref.current, width: 300, height: 400, skin: skinUrl });
      v.controls.enableZoom = false;
      v.controls.enablePan = false;
      v.camera.position.set(-10, 6, 52); // presque de face, pour que les pieds touchent le bas du cadre
      if (pose === "walking") v.animation = new WalkingAnimation();
      else if (LOOPS[pose]) LOOPS[pose](v.playerObject.skin, PEAK[pose] ?? 0, v.playerObject); // pose figée, sans animation
      dispose = () => v.dispose();
    });
    return () => { alive = false; dispose(); };
  }, [skinUrl, pose]);

  return <canvas ref={ref} role="img" aria-label="Skin 3D du joueur" className={className} />;
}
