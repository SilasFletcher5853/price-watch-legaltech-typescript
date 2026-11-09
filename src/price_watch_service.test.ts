import { strict as assert } from "node:assert";
import { chooseFollowUp } from "./price_watch_service.js";

const now = new Date("2026-09-11T00:00:00.000Z");
assert.equal(chooseFollowUp(new Date("2026-09-12T12:00:00.000Z"), now), "urgent");
assert.equal(chooseFollowUp(new Date("2026-09-15T12:00:00.000Z"), now), "scheduled");
console.log("deadline follow-up decision passed");
