# Swapping

Open **Swapping** from the N-back home screen. Remember an arrangement, hide it with **Ready**, carry out each instruction in your head, then reconstruct the final arrangement. Positions always refer to their current screen coordinates.

Choose numbers, letters, shapes or mixed content for a sequence of 3–12 items or a 2×2, 2×3 or 3×3 grid. Spoken letters use sequences. Audio plays each letter completely; Ready and replay become available after the full pass. Use the sample button to check playback before starting.

Set the starting pattern, number of operations and operation tier separately. Basic exchanges two positions. Group adds reversals, shifts and grid transformations. Compound puts two operations on one instruction card, applied in the listed order. The count always means individual operations. Presets provide starting combinations; they are not calibrated ability levels.

To answer, select a slot, then choose a token from the palette. You can replace or clear any placement. Tab reaches controls, arrow keys move within slots or the palette, and Enter or Space activates the focused control. Delete or Backspace clears the active slot. After placing a token, focus moves to the next empty slot, or Submit when the board is full.

Results show exact correctness and correctly placed positions, with an optional solution trace. Results stay within the current round and do not affect N-back or elevator progress. Pause hides the entire round; an interrupted audio pass restarts on Resume. Exit or reload discards the round. Audio failures offer Retry or Back to setup without scoring an error.

Implementation lives in `src/model/swapping` and `src/components/Swapping`. Focused domain, controller, component and audio tests are included. They were not executed during implementation under the non-Goal-Mode policy.
