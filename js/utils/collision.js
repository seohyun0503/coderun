import { DEBUG } from '../config/constants.js';

/**
 * Axis-Aligned Bounding Box (AABB) overlap test.
 * @param {Object} a  { x, y, width, height }
 * @param {Object} b  { x, y, width, height }
 * @param {number} [margin=0]  Shrinks each box by this many pixels on all sides
 *                             to allow slight visual overlap before registering.
 */
export function aabbOverlap(a, b, margin = 0) {
  return (
    a.x + margin < b.x + b.width - margin &&
    a.x + a.width - margin > b.x + margin &&
    a.y + margin < b.y + b.height - margin &&
    a.y + a.height - margin > b.y + margin
  );
}

/**
 * Returns the minimum translation vector needed to push `a` out of `b`.
 * @returns {{ dx: number, dy: number }}
 */
export function mtv(a, b) {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (overlapX < overlapY) {
    return { dx: a.x < b.x ? -overlapX : overlapX, dy: 0 };
  }
  return { dx: 0, dy: a.y < b.y ? -overlapY : overlapY };
}

/**
 * Simple circle–circle overlap.
 */
export function circleOverlap(a, b) {
  const dx = (a.x + a.radius) - (b.x + b.radius);
  const dy = (a.y + a.radius) - (b.y + b.radius);
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < a.radius + b.radius;
}

// ─── Collision class ──────────────────────────────────────────────────────────
//
// High-level entity-facing API built on top of the functions above.

/** Single bounding-rect helper (legacy path). */
function _rect(e) {
  if (!e) return null;
  if (typeof e.getBounds === 'function') return e.getBounds();
  if (e.bounds  !== undefined) return e.bounds;
  if (e.width   !== undefined) return e;
  return null;
}

/**
 * Returns an array of rects for e.
 * Uses e.getHitboxes() when available (multi-hitbox entities),
 * otherwise falls back to the single bounding box.
 */
function _rects(e) {
  if (!e) return [];
  if (typeof e.getHitboxes === 'function') return e.getHitboxes();
  const r = _rect(e);
  return r ? [r] : [];
}

export class Collision {
  /**
   * AABB check between two entities.
   * Supports multi-hitbox entities (getHitboxes()), single-box entities
   * (getBounds() / .bounds), and plain rect objects { x, y, width, height }.
   * Returns true when ANY hitbox pair overlaps.
   * @param {object} entityA
   * @param {object} entityB
   * @param {number} [margin=0]  Shrinks each AABB by this many px on every side.
   * @returns {boolean}
   */
  static checkCollision(entityA, entityB, margin = 0) {
    const as = _rects(entityA);
    const bs = _rects(entityB);
    if (as.length === 0 || bs.length === 0) return false;
    for (const a of as) {
      for (const b of bs) {
        if (aabbOverlap(a, b, margin)) return true;
      }
    }
    return false;
  }

  /**
   * Render hitboxes for all entities in the list.
   * No-ops when DEBUG.DEBUG_MODE is falsy — call unconditionally.
   *
   * Per entity:
   *   • Outer bounding box  – dashed, dim (reference for the full sprite area)
   *   • Each hitbox rect    – solid fill + bright border (actual collision shape)
   *   • Margin-shrunken box – thin inner border (real check boundary)
   *   • Entity label        – type or state name above the first hitbox
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array}  entities   Entity instances (getBounds / getHitboxes)
   * @param {string} color      Stroke / label colour
   * @param {number} [margin=0] Same margin value passed to checkCollision
   */
  static drawDebugBoxes(ctx, entities, color, margin = 0) {
    if (!DEBUG.DEBUG_MODE) return;

    ctx.save();
    ctx.font         = 'bold 9px monospace';
    ctx.textBaseline = 'bottom';

    for (const e of entities) {
      const outer    = _rect(e);
      const hitboxes = _rects(e);
      if (!outer || hitboxes.length === 0) continue;

      // ── Outer bounding box (dashed, dim) ──────────────────────────────────
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(outer.x, outer.y, outer.width, outer.height);
      ctx.setLineDash([]);

      // ── Per-hitbox rendering ───────────────────────────────────────────────
      ctx.globalAlpha = 1;
      for (const hb of hitboxes) {
        // Semi-transparent fill
        ctx.fillStyle   = color;
        ctx.globalAlpha = 0.08;
        ctx.fillRect(hb.x, hb.y, hb.width, hb.height);

        // Solid border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);

        // Margin-shrunken collision border (thin, slightly dim)
        if (margin > 0 && hb.width > margin * 2 && hb.height > margin * 2) {
          ctx.globalAlpha = 0.55;
          ctx.lineWidth   = 1;
          ctx.strokeRect(
            hb.x + margin, hb.y + margin,
            hb.width  - margin * 2,
            hb.height - margin * 2,
          );
          ctx.globalAlpha = 1;
        }

        // Centre crosshair
        const midX = hb.x + hb.width  / 2;
        const midY = hb.y + hb.height / 2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(midX - 4, midY); ctx.lineTo(midX + 4, midY);
        ctx.moveTo(midX, midY - 4); ctx.lineTo(midX, midY + 4);
        ctx.stroke();
      }

      // ── Entity label above first hitbox ───────────────────────────────────
      const label = e.type ?? e.state ?? '';
      if (label) {
        ctx.fillStyle = color;
        ctx.fillText(label, hitboxes[0].x + 2, hitboxes[0].y - 1);
      }
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
