import template from './integrationGuide.txt?raw';

export function generateIntegrationGuide(versions: Record<string, string>): string {
  const verylVersion = versions['rggen-veryl'] ?? '0.0.0';
  return template.replace('{{VERYL_VERSION}}', verylVersion);
}
