// The cyberpunk outfit draws without throwing for every head pose it can meet.
import test from "node:test";
import assert from "node:assert/strict";

globalThis.Path2D = class {
  moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} ellipse() {} arc() {} closePath() {} rect() {} addPath() {}
};
const gradient = () => ({ addColorStop() {} });
const ctx = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : k === "createLinearGradient" || k === "createRadialGradient" ? gradient : () => {}),
  set: (t, k, v) => { t[k] = v; return true; },
});

const { makeHead, drawOutfitFront, drawOutfitBehind } = await import("../src/mochi/outfits.ts");

for (const [name, R, yaw] of [["front", 30, 0], ["small", 8, 0], ["turned away", 30, Math.PI], ["side", 30, 1.2]]) {
  test(`cyberpunk draws: ${name}`, () => {
    const H = makeHead(R, yaw, 0);
    const st = { presence: 1, morph: 0 };
    assert.doesNotThrow(() => {
      drawOutfitBehind(ctx, "cyberpunk", H, st);
      drawOutfitFront(ctx, "cyberpunk", H, st);
    });
  });
}
