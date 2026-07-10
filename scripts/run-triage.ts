import { runProjectLeadTriage } from '../src/agents/project-lead/index';

const projectId = process.argv[2];

try {
  const reports = await runProjectLeadTriage({ projectId });
  console.log(JSON.stringify(projectId ? reports[0] ?? null : reports, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
