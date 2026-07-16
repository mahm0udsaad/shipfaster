'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerContext } from '../dashboard';
import { createTask, getAssignableAgents } from '../db/repository';
import { buildHandoffPrompt } from '../handoff';

export async function getAssignableAgentsAction(projectId: string) {
  return getAssignableAgents(await getOwnerContext(), projectId);
}

/**
 * Create a handoff task assigned to an agent, with the handoff context living IN the task
 * (description + acceptance criteria). Returns the new task id and a thin prompt that points
 * the incoming agent at it.
 */
export async function createHandoffAction(input: {
  projectId: string;
  slug: string;
  title: string;
  description: string;
  acceptanceCriteria?: string;
  assigneeAgentId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}) {
  const task = await createTask(await getOwnerContext(), {
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    acceptanceCriteria: input.acceptanceCriteria,
    assigneeAgentId: input.assigneeAgentId,
    priority: input.priority,
  });
  const prompt = await buildHandoffPrompt(task.id);
  revalidatePath(`/projects/${input.slug}`);
  revalidatePath('/today');
  return { taskId: task.id, prompt };
}
