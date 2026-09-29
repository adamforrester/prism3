const W='/tmp/claude-0/-home-user/5ab0f976-957b-5ab4-8218-87380c5a045f/scratchpad/wt-tag2/';
const { buildFloatWritePlan } = await import(W+'packages/engine/write-plan.ts').catch(() => ({} as any));
console.log(typeof buildFloatWritePlan);
