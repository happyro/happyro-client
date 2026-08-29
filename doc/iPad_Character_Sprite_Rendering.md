# iPad Character Sprite Rendering Compatibility

## Symptom

On iPadOS, the same character could show misaligned body, hair, and head layers in the character selection or character creation screen. Typical symptoms were a duplicated head, leftover hair, or separated layers. The issue usually did not reproduce in macOS browsers. Third-party iPad browsers may still use the WebKit rendering path, so the browser name alone is not sufficient to classify the environment.

## Cause

The character preview is not a single image. Body, head, accessories, weapons, and shields are rendered as separate sprite layers into a 2D Canvas. The previous implementation amplified WebKit differences in two ways:

1. Each layer calculated its animation time independently. On slower devices, rendering the body could cross an animation-frame boundary before the head was rendered, causing different ACT frames and inconsistent layer coordinates.
2. The temporary Canvas reused `ImageData` and wrote pixels through `Uint32Array`, while allowing the backing store to be larger than the current sprite. Some WebKit versions handle repeated transparent compositing and leftover regions inconsistently.

## Fix

- `Entity.renderEntity()` captures one `renderTick` at the start of an entity render and passes it to animation calculation for every layer.
- Character-preview 2D Canvas rendering uses standard byte-wise RGBA writes, avoiding assumptions about native byte order and shared buffer layout.
- The temporary Canvas backing store always matches the current sprite dimensions. `ImageData` is recreated when the dimensions change, preventing transparent regions from a previous larger sprite from being reused.
- The WebGL sprite path used by map scenes is not affected by this compatibility path.

## Verification

1. Build the production client with `npm run build:pwa`.
2. Fully close and reopen the PWA on iPadOS so that an old JavaScript bundle is not reused from cache.
3. Open character selection and verify that the selected character's body, hair, and accessories remain aligned while switching characters and while the animation continues to play.
4. If the issue returns, first lock the character animation to frame 0. If the layers are still misaligned, use Safari Web Inspector to inspect the target Canvas with `getImageData()`. Incorrect Canvas pixels indicate a drawing-pipeline issue; correct pixels with an incorrect screen result indicate a final WebKit compositing issue.

## Maintenance

New character-preview layers must receive the same `renderTick` captured by `renderEntity()`. Do not call `Date.now()` again inside an individual layer to select its animation frame, and do not reintroduce 32-bit pixel-layout assumptions into the iPad 2D Canvas path.
