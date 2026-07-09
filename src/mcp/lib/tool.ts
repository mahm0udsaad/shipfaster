import { z } from 'zod';
import type { ActorContext } from '../../lib/db/repository';

/**
 * A ship-faster MCP tool definition.
 *
 * The `description` object is STRUCTURED on purpose: scripts/lint-tool-descriptions.ts
 * fails CI if any field is missing or too thin (docs/section-18-19 §18.3b — smelly
 * descriptions measurably degrade agent tool selection). This is the lint contract.
 */
export type ToolDescription = {
  summary: string; // verb-first, one sentence
  useWhen: string; // the trigger, from the agent's point of view
  doNotUseWhen: string; // the common wrong reach + the right tool instead
  sideEffects: string; // 'none' or exactly what is written, and that it's logged
  returns: string; // shape, including ids the agent needs next
  errors: string; // typed errors and what to do about each
};

export type ToolDef<Input> = {
  name: string;
  description: ToolDescription;
  input: z.ZodType<Input>;
  /** roles permitted to call this tool at all (fine-grained checks live in the handler) */
  allowedRoles: ActorContext['role'][];
  /** does this tool write? (used by rate limiting + audit expectations) */
  mutates: boolean;
  handler: (args: { ctx: ActorContext; input: Input }) => Promise<unknown>;
};

export function defineTool<Input>(def: ToolDef<Input>): ToolDef<Input> {
  return def;
}

/** Render the structured description into the single string the MCP SDK expects. */
export function renderDescription(d: ToolDescription): string {
  return [
    d.summary,
    `Use when: ${d.useWhen}`,
    `Do NOT use when: ${d.doNotUseWhen}`,
    `Side effects: ${d.sideEffects}`,
    `Returns: ${d.returns}`,
    `Errors: ${d.errors}`,
  ].join('\n');
}
