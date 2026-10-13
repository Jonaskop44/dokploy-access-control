import { posix } from 'node:path';
import { UnprocessableEntityException } from '@nestjs/common';
import { parse } from 'yaml';

export interface ComposePort {
  serviceName: string;
  containerPort: number;
  protocol: 'tcp' | 'udp';
}

type Obj = Record<string, unknown>;

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Rejects compose files that would let a student reach the VM and collects the
 * ports they publish. `composePath` is needed because relative bind mounts
 * resolve against the compose file's directory inside the cloned repo.
 */
export function analyzeCompose(
  yamlText: string,
  composePath: string,
): ComposePort[] {
  let doc: unknown;
  try {
    doc = parse(yamlText);
  } catch {
    throw new UnprocessableEntityException(
      'docker-compose file is not valid YAML',
    );
  }
  if (
    !isObj(doc) ||
    !isObj(doc.services) ||
    !Object.keys(doc.services).length
  ) {
    throw new UnprocessableEntityException(
      'docker-compose file defines no services',
    );
  }

  const violations: string[] = [];
  const ports = new Map<string, ComposePort>();
  const composeDir = posix.dirname(composePath.replaceAll('\\', '/'));

  // Pulls in files this check never sees.
  if ('include' in doc) violations.push('"include" is not allowed');

  for (const [serviceName, rawService] of Object.entries(doc.services)) {
    if (!isObj(rawService)) continue;
    const reject = (reason: string) =>
      violations.push(`${serviceName}: ${reason}`);

    if (rawService.privileged === true) reject('"privileged" is not allowed');
    if (rawService.network_mode === 'host') {
      reject('"network_mode: host" is not allowed');
    }
    if (rawService.pid === 'host') reject('"pid: host" is not allowed');
    if (rawService.ipc === 'host') reject('"ipc: host" is not allowed');
    if (Array.isArray(rawService.devices) && rawService.devices.length) {
      reject('"devices" is not allowed');
    }
    if (
      Array.isArray(rawService.cap_add) &&
      rawService.cap_add.some((cap) =>
        ['ALL', 'SYS_ADMIN'].includes(String(cap).toUpperCase()),
      )
    ) {
      reject('"cap_add" with ALL or SYS_ADMIN is not allowed');
    }
    if (isObj(rawService.extends) && 'file' in rawService.extends) {
      reject('"extends" from another file is not allowed');
    }

    if (Array.isArray(rawService.volumes)) {
      for (const volume of rawService.volumes) {
        const problem = checkVolume(volume, composeDir);
        if (problem) reject(problem);
      }
    }

    if (Array.isArray(rawService.ports)) {
      for (const entry of rawService.ports) {
        const parsed = parsePort(entry);
        if (typeof parsed === 'string') {
          reject(parsed);
          continue;
        }
        const port: ComposePort = { serviceName, ...parsed };
        ports.set(
          `${serviceName}/${port.containerPort}/${port.protocol}`,
          port,
        );
      }
    }
  }

  if (violations.length) {
    throw new UnprocessableEntityException({
      message: 'docker-compose file is not allowed',
      violations,
    });
  }
  return [...ports.values()];
}

/** Returns a reason when the volume is forbidden, otherwise undefined. */
function checkVolume(volume: unknown, composeDir: string): string | undefined {
  let source: string | undefined;
  let target: string | undefined;
  let isBind = false;

  if (typeof volume === 'string') {
    const [first, second] = volume.split(':');
    // "/data" alone is an anonymous volume, "name:/data" a named one.
    if (second === undefined) return undefined;
    source = first;
    target = second;
    isBind = /^[./~$]/.test(first) || first.includes('/');
  } else if (isObj(volume)) {
    source = typeof volume.source === 'string' ? volume.source : undefined;
    target = typeof volume.target === 'string' ? volume.target : undefined;
    isBind = volume.type === 'bind';
  } else {
    return undefined;
  }

  if (source?.includes('docker.sock') || target?.includes('docker.sock')) {
    return 'mounting docker.sock is not allowed';
  }
  if (!isBind || !source) return undefined;

  if (
    source.startsWith('/') ||
    source.startsWith('~') ||
    source.startsWith('$')
  ) {
    return `host path "${source}" is not allowed, only paths inside the repository`;
  }
  if (posix.normalize(posix.join(composeDir, source)).startsWith('..')) {
    return `bind mount "${source}" leaves the repository`;
  }
  return undefined;
}

/** Returns the container side of a published port, or a reason string. */
function parsePort(
  entry: unknown,
): Pick<ComposePort, 'containerPort' | 'protocol'> | string {
  let container: string;
  let protocol = 'tcp';

  if (typeof entry === 'number') {
    container = String(entry);
  } else if (typeof entry === 'string') {
    const [spec, proto] = entry.split('/');
    if (proto) protocol = proto.toLowerCase();
    container = spec.split(':').at(-1) ?? '';
  } else if (isObj(entry)) {
    container =
      typeof entry.target === 'number' || typeof entry.target === 'string'
        ? String(entry.target)
        : '';
    if (typeof entry.protocol === 'string') {
      protocol = entry.protocol.toLowerCase();
    }
  } else {
    return 'unsupported "ports" entry';
  }

  if (!/^\d+$/.test(container)) {
    return `port "${String(typeof entry === 'object' ? JSON.stringify(entry) : entry)}" is not supported (ranges and variables are not allowed)`;
  }
  if (protocol !== 'tcp' && protocol !== 'udp') {
    return `protocol "${protocol}" is not supported`;
  }
  return { containerPort: Number(container), protocol };
}
