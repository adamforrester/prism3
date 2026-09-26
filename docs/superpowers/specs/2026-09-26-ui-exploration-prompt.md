# Prompt: explore alternative UI treatments for the Prism3 studio and plugin

You are a senior product designer exploring new directions for **Prism3**, a design-token engine with two UI surfaces:
- a web **studio**;
- a **Figma plugin** that runs the same UI inside Figma and adds Figma-only actions.

The attached brief, **"Prism3 Studio + Plugin: product brief for UI exploration"** (in the repo at `docs/superpowers/specs/2026-09-26-ui-exploration-brief.md`), describes everything the product must do: its users and jobs, its object model, every setting, the read-only views, the actions, the feedback states, the rules, and the vocabulary. Read all of it before you start.

## What we want

Reimagine the information architecture and interaction model **from first principles**. We now know the full set of features and settings the product has to support. We want to see how it could be organized if it were designed today, not a re-skin of what exists.

Produce **2 distinct concepts**, and make them genuinely different. For each concept:

1. **A one-paragraph thesis.** The organizing idea, and who it serves best.
2. **An IA map.** The top-level structure and where every capability in brief §4–§6 lives. Include a coverage checklist that maps each settings table in §4, each view in §5 and each action in §6 to its place. Anything left out should be listed with a reason.
3. **A clickable HTML prototype.** Requirements:
   - One self-contained `.html` file per concept (inline CSS and JS, no external dependencies beyond Google Fonts).
   - It only needs to **click through**: navigation, tabs, disclosures, dialogs opening and closing, and mode switching that changes what is shown. No real engine and no real computation.
   - Use static, plausible sample data. The example brand **aurora** is a good placeholder: violet primary, azure actions, a tinted white page.
   - Include at least these moments:
     - starting a new brand;
     - tuning a color and seeing contrast respond;
     - editing a per-mode override, including a read-only derived mode;
     - finding and fixing a failing contrast pair;
     - exporting tokens with options;
     - the Figma flow: Apply → Build a component set → a partial/failed result → Prune with its preview/confirm → the Agent link on while an agent works;
     - the same UI at the plugin's **minimum window size, 380×420**, as a separate frame or a toggle.
4. **Tradeoffs.** What the concept makes easy, what it makes harder, and which rules in brief §8 it strains, if any.

## Constraints

- **Recessive chrome.** The brand being edited is the loudest thing on screen. The tool's own palette, type and ornament stay quiet and neutral. Don't give the tool a personality.
- **Honor every rule in brief §8.** In particular:
  - warn-don't-block for contrast;
  - "Auto" always names what it resolves to;
  - derived modes are read-only;
  - the last good theme stays on screen when the engine refuses an edit;
  - destructive actions preview before they confirm.
- **Keep Prism3-specific names exactly** where the brief marks them (§9): `lever`, `rung`, `foreground`, `on-fill`, `subtle-fill`, `tempo`, `Attached to label` / `Locked to edges`, `Apply Theme`, `Prune stale`, `Agent link`, the mode names, the type categories and weight roles, and so on. You may propose better **UI labels** for generic things, but say when you're doing so, and never rename a token path or lever key.
- **Copy:**
  - Labels plus one short line at most. **Don't write the instructional copy**; placeholder text such as "One-line description" is fine where a description would go.
  - US English. No exclamation marks, no "simply" or "just".
- **Accessibility of the tool itself:**
  - chrome text at 4.5:1;
  - visible focus;
  - keyboard reachable;
  - 24px minimum targets;
  - reduced motion respected.
- Assume light chrome. If you propose a dark chrome, keep it as an option and note that the Figma host would need work to support it.

## Guard against bias

- Don't organize by token file structure (color / type / space / …) unless you've considered alternatives and can say why that structure serves the user's jobs best. Other organizing ideas to weigh:
  - job or task flow;
  - a preview-first canvas with inspectors;
  - object-first navigation (select a thing in a specimen, edit what drives it);
  - mode-comparison-first;
  - a checklist or health-driven structure;
  - a conversational or agent-first shell.
- Brief §11 lists known gaps. Use them as openings, not a to-do list.
- Appendix B describes today's structure only so you can recognize and avoid reproducing it.

## Deliverables

For each concept:
- the `.html` prototype;
- a short markdown note containing the thesis, IA map, coverage checklist and tradeoffs.

End with a comparison table across the concepts.

## Starting stance (optional, when running more than one agent)

Add one of these lines when you hand this prompt to each agent, so the agents don't converge on the same idea:

- **Agent A:** Start from the user's jobs in brief §2. Let the task flow decide the structure; settings live wherever a job needs them.
- **Agent B:** Start from the output. A live preview of the brand is the main surface, and you edit by selecting what you see: a specimen, a role, a mode column.
