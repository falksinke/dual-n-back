# Working Memory Trainer

The app opens on a shared exercise chooser:

- **N-back:** follow a stream and identify matches from earlier trials. Existing settings, adaptive progression, statistics, and saved history stay in this mode.
- **Swapping:** remember an arrangement, apply instructions mentally, and reconstruct the result. See [Swapping](swapping.md) for its controls.
- **Spatial sequence:** recall locations in order, with optional changes to pace, interference, and a maths challenge before recall.
- **Remember & Decide:** remember a sequence of locations while judging vertical symmetry between each item. See [Remember & Decide](remember-decide.md) for its controls and scoring.

Choose **All exercises** from idle N-back to return home. This control is disabled during an active session, countdown, or pending continuation; finish or exit that session first. Exit from Swapping, spatial practice, or Remember & Decide returns home and discards that practice round. Opening N-back mounts its keyboard controls; leaving it removes them. Reloading returns to the chooser.

Light/dark mode is shared for the current visit. Each exercise keeps its own scoring rules; there is no combined score or new persistence. Browser and install labels identify the app as Working Memory Trainer, with Memory Trainer used for the compact install name. Existing URLs and storage keys are unchanged.

Implementation: `src/components/TrainerHome`, with mode selection in `src/App.tsx`. Navigation and manifest assertions were updated and statically inspected. Tests, typechecks, builds, lint, and browser acceptance were not run under the non-Goal-Mode policy.
