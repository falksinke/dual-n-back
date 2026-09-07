<task>Implement docs/plans/2026-09-08-0006-feat-remember-decide-plan.md U1 through U3.</task>
<classification>Orchestration-heavy: domain, timed UI, integration; serial dependencies.</classification>
<architecture>Pure model/rememberDecide -> local controller -> narrow projection -> views; App selects peer mode. No shared store or persistence.</architecture>
<selected_context>Plan is authority. Existing model/swapping and components/Swapping provide local patterns. src/hooks/useMountEffect.ts exists as unrelated untracked prerequisite; use but never edit/stage.</selected_context>
<relationships>U1 defines domain contracts; U2 consumes them; U3 imports RememberDecide shell.</relationships>
<constraints>Non-Goal Mode: implement named tests but NO executing tests, builds, typechecks, linters, browser or dev servers. Static inspection only. Preserve all unrelated WIP. Workers no Git mutations, no additional agents. Root owns commits. New branch codex/remember-decide based on 2198769.</constraints>
<ambiguities>None.</ambiguities>
<plan>U1 domain -> U2 timed UI -> U3 entry/docs. Independent review required for completed timing/integration. No deployment/push.</plan>
