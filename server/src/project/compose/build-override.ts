export interface PublishedPort {
  serviceName: string;
  containerPort: number;
  protocol: string;
  hostPort: number;
}

export interface ResourceLimits {
  cpuLimit: number;
  memoryMb: number;
}

export const OVERRIDE_FILE_NAME = 'htl-dock.override.yml';

export function buildOverride(
  ports: PublishedPort[],
  serviceNames: string[],
  limits: ResourceLimits,
) {
  const byService = new Map<string, PublishedPort[]>();
  for (const port of ports) {
    byService.set(port.serviceName, [
      ...(byService.get(port.serviceName) ?? []),
      port,
    ]);
  }
  if (!serviceNames.length) return 'services: {}\n';

  const lines = ['services:'];
  for (const serviceName of serviceNames) {
    lines.push(`  ${JSON.stringify(serviceName)}:`);
    const servicePorts = byService.get(serviceName);
    if (servicePorts) {
      lines.push('    ports: !override');
      for (const p of servicePorts) {
        lines.push(
          `      - ${JSON.stringify(`${p.hostPort}:${p.containerPort}/${p.protocol}`)}`,
        );
      }
    }
    lines.push(
      '    deploy:',
      '      resources:',
      '        limits:',
      `          cpus: ${JSON.stringify(String(limits.cpuLimit))}`,
      `          memory: ${JSON.stringify(`${limits.memoryMb}M`)}`,
    );
  }
  return `${lines.join('\n')}\n`;
}
