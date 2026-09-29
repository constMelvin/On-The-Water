# Plan a Gala (skeleton)

UI skeleton for the Plan a Gala flow, matching `reference/otw` (`#/plan` and `#/created`).
Structure, copy, colors and layout are done. There is **no backend logic**: every place to wire
real behavior is marked `// TODO(team):` (search for it).

Preview it at **`/dev/plan`** (dev builds only). The real `/plan` route (`src/app/plan/page.tsx`)
was left untouched. When you're ready, render the wizard there:

```tsx
// src/app/plan/page.tsx
import { PlanWizard } from '@/features/plan-a-gala';
export default function PlanPage() {
  return <PlanWizard />;
}
```

## Files

| File | What it is |
| --- | --- |
| `gala-draft.ts` | **The contract.** `GalaDraft` type, `validateStep()` with the exact error copy, `passwordStrength()`, and the `createGala()` stub. |
| `PlanWizard.tsx` | Step state, Back / Next, validation on Next only, Enter advances (it's a form), calls `createGala()` and then shows the created screen. |
| `FocusLayout.tsx` | Full-bleed colored screen: OTW logo + round ghost X (goes to `/`). No sidebar. Step colors: rosy, zest, teal, blossom. |
| `steps/StepTitle.tsx` | Step 1: title input + "Use example" chip. |
| `steps/StepDate.tsx` | Step 2: date, optional start and end time. |
| `steps/StepPlace.tsx` | Step 3: destination search input, suggestion chips, mini map preview. **TODO: real place search.** |
| `steps/StepPassword.tsx` | Step 4: password + confirm with show/hide, 3-segment strength meter, code vs password explainer. |
| `steps/FieldError.tsx` | The cream / rosy-dark error box. |
| `steps/MiniMap.tsx` | Static illustrated map shown once a destination is set. |
| `CreatedScreen.tsx` | "Okay, this is happening." Code ticket, copy / share, masked password, account prompt, sticky "Enter the Gala" → `/gala/:code`. Sparkle burst on arrival. |
| `plan-a-gala.css` | Styles for all of the above (ported from `reference/otw/styles.css`). |
| `index.ts` | Public exports. |

Shared pieces come from the design system (`@/components/otw`: `Button`, `Icon`, `Tag`, `Sheet`)
and `@/lib/otw/feedback` (`toast`, `burst`).

## Step component props

Every step takes the same three props, so you can swap any of them:

| Step | `value` | `onChange` | `error` |
| --- | --- | --- | --- |
| `StepTitle` | `string` | `(title: string) => void` | `string \| undefined` |
| `StepDate` | `{ date, startTime?, endTime? }` | `(value) => void` | `string \| undefined` |
| `StepPlace` | `string` | `(destination: string) => void` | `string \| undefined` |
| `StepPassword` | `{ password, confirm }` | `(value) => void` | `string \| undefined` |

The step only renders fields and the error box. The question, helper line, progress pills and
bottom bar live in `PlanWizard`.

## Replacing the stub

`createGala(draft)` in `gala-draft.ts` currently waits 700ms and returns `{ code: 'OTW-7K2P' }`.
Replace the body with the real API call. Keep the signature:

```ts
export async function createGala(draft: GalaDraft): Promise<{ code: string }>;
```

- Resolve with the new gala's code. The wizard then shows `CreatedScreen`, and "Enter the Gala"
  routes to `/gala/<code>`.
- Throw on failure. The wizard shows an error toast and stays on step 4 (see the `TODO(team)` in
  `PlanWizard.tsx` to map real errors to friendly copy).
- Server-side validation rules can go in `validateStep()`. Keep the exact message strings in
  `MESSAGES`.
