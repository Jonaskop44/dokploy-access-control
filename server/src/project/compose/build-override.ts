export interface PublishedPort {
  serviceName: string;
  containerPort: number;
  protocol: string;
  hostPort: number;
}

export const OVERRIDE_FILE_NAME = 'htl-dock.override.yml';

export function buildOverride(ports: PublishedPort[]) {
  const byService = new Map<string, PublishedPort[]>();
  for (const port of ports) {
    byService.set(port.serviceName, [
      ...(byService.get(port.serviceName) ?? []),
      port,
    ]);
  }
  if (!byService.size) return 'services: {}\n';

  const lines = ['services:'];
  for (const [serviceName, servicePorts] of byService) {
    lines.push(`  ${JSON.stringify(serviceName)}:`, '    ports: !override');
    for (const p of servicePorts) {
      lines.push(
        `      - ${JSON.stringify(`${p.hostPort}:${p.containerPort}/${p.protocol}`)}`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}
