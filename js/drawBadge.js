
/**
 * Draws a pulsing ring + small red flag near (x,y).
 * Call every frame while violation is true.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} baseR - the base device dot radius (e.g., 7)
 * @param {number} now - performance.now()
 */
export function drawViolation(ctx, x, y, baseR, now){
  const t = (now % 1200) / 1200; // 0..1
  const pulseR = baseR * (1.7 + 0.7 * t); // grow then fade
  const alpha = 0.9 * (1.0 - t);

  // pulse ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, pulseR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,0,0,${alpha.toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // small flag (pole + triangle)
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,0,0,0.95)";
  ctx.fillStyle = "rgba(255,0,0,0.95)";
  const poleX = x + baseR + 2;
  const poleTopY = y - baseR - 6;
  const poleBotY = y - baseR - 1;
  ctx.beginPath();
  ctx.moveTo(poleX, poleBotY);
  ctx.lineTo(poleX, poleTopY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(poleX, poleTopY);
  ctx.lineTo(poleX + 7, poleTopY + 2);
  ctx.lineTo(poleX, poleTopY + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
