# Arrow Spec (Deprecated - Debug Only)

**Purpose:** Arrow was added for agent feedback, not needed in production.

**Previous experiment:** Drew yellow arrow at `layout.exit` `src/main.ts:130` perpendicular to wall. Tested `iso-grid` `26.565° (HW,HH)` vs `screen-pixel` `63.435° (HH,HW)`; iso-grid looked visually perpendicular in `2:1` diamond. Tested angles `200-270°`.

**Current:** Kept in `src/main.ts:139` with `switch(layout.exitDirection)` using `BASE_HW/HH` iso-grid outward, but can be removed. `SPEC.md` marks deprecated.

**Cleanup:** Remove `g.add.graphics()` arrow code when visual debug no longer needed.
