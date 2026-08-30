import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const INSTANCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const STABLE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function requireSingleLine(value, name) {
    if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
        throw new Error(`${name} must be a non-empty single-line value.`);
    }
    return value.trim();
}

function requireStableId(value, name) {
    const normalized = requireSingleLine(value, name);
    if (!STABLE_ID_PATTERN.test(normalized)) {
        throw new Error(`${name} may contain only letters, digits, dots, underscores and hyphens.`);
    }
    return normalized;
}

function requireWindowsPath(value, name) {
    const normalized = path.win32.normalize(requireSingleLine(value, name));
    if (!path.win32.isAbsolute(normalized)) {
        throw new Error(`${name} must be an absolute Windows path.`);
    }
    return normalized;
}

function normalizePublicOrigin(value) {
    let origin;
    try {
        origin = new URL(requireSingleLine(value, 'publicOrigin'));
    } catch {
        throw new Error('publicOrigin must be an absolute HTTPS origin.');
    }
    if (
        origin.protocol !== 'https:'
        || origin.username
        || origin.password
        || (origin.pathname && origin.pathname !== '/')
        || origin.search
        || origin.hash
    ) {
        throw new Error('publicOrigin must be an absolute HTTPS origin without credentials, path, query or fragment.');
    }
    return origin.origin;
}

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function windowsText(lines) {
    return `${lines.join('\r\n')}\r\n`;
}

export function buildWindowsInstanceFiles({
    instanceId,
    port,
    publicOrigin,
    projectRoot = 'C:\\Apps\\flashterm-stage\\current',
    programDataDirectory,
    dataDirectory,
    nodeExecutable = 'C:\\Program Files\\nodejs\\node.exe',
    tenantId = 'YOUR-TENANT-ID',
    termbaseId = 'YOUR-TERMBASE-ID',
    groupName
} = {}) {
    const normalizedInstanceId = requireSingleLine(instanceId, 'instanceId');
    if (!INSTANCE_ID_PATTERN.test(normalizedInstanceId)) {
        throw new Error('instanceId must use lowercase letters, digits and hyphens only.');
    }
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        throw new Error('port must be an integer between 1024 and 65535.');
    }

    const normalizedOrigin = normalizePublicOrigin(publicOrigin);
    const normalizedProjectRoot = requireWindowsPath(projectRoot, 'projectRoot');
    const normalizedProgramData = requireWindowsPath(
        programDataDirectory ?? `C:\\ProgramData\\flashterm-stage-${normalizedInstanceId}`,
        'programDataDirectory'
    );
    const normalizedDataDirectory = requireWindowsPath(
        dataDirectory ?? `D:\\flashterm-stage-${normalizedInstanceId}\\data`,
        'dataDirectory'
    );
    const normalizedNodeExecutable = requireWindowsPath(nodeExecutable, 'nodeExecutable');
    const normalizedTenantId = requireStableId(tenantId, 'tenantId');
    const normalizedTermbaseId = requireStableId(termbaseId, 'termbaseId');
    const serviceId = `flashterm-stage-${normalizedInstanceId}`;
    const wrapperBaseName = `${serviceId}-service`;
    const normalizedGroupName = requireStableId(
        groupName ?? `${serviceId}-readers`,
        'groupName'
    );
    const settingsPath = path.win32.join(normalizedProgramData, 'service.env');
    const logDirectory = path.win32.join(normalizedProgramData, 'logs');
    const startScript = path.win32.join(
        normalizedProjectRoot,
        'deploy',
        'windows',
        'start-stage.ps1'
    );
    const proxyDirectory = `C:\\inetpub\\${serviceId}-proxy`;

    const settings = windowsText([
        '# Copy this file to the protected settings target shown by the generator.',
        '# Replace all placeholders only in that protected copy and never commit it.',
        '',
        `FLASHTERM_STAGE_PORT=${port}`,
        `FLASHTERM_STAGE_DATA=${normalizedDataDirectory}`,
        `FLASHTERM_STAGE_TENANT=${normalizedTenantId}`,
        'FLASHTERM_STAGE_TERMBASE=',
        '',
        'FLASHTERM_STAGE_AUTH=oidc',
        `FLASHTERM_STAGE_PUBLIC_ORIGIN=${normalizedOrigin}`,
        'FLASHTERM_OIDC_ISSUER=https://identity.example.org/YOUR-TENANT',
        'FLASHTERM_OIDC_CLIENT_ID=YOUR-CLIENT-ID',
        'FLASHTERM_OIDC_CLIENT_SECRET=REPLACE_IN_PROTECTED_COPY',
        'FLASHTERM_OIDC_GROUP_CLAIM=groups',
        `FLASHTERM_STAGE_GROUP_ACCESS=${JSON.stringify({
            [normalizedGroupName]: [normalizedTermbaseId]
        })}`,
        '',
        'FLASHTERM_PUBLISH_TOKEN=REPLACE_IN_PROTECTED_COPY',
        `FLASHTERM_PUBLISH_TERMBASES=${normalizedTermbaseId}`
    ]);

    const argumentsText = [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        `-File "${startScript}"`,
        `-ProjectRoot "${normalizedProjectRoot}"`,
        `-SettingsFile "${settingsPath}"`,
        `-NodeExecutable "${normalizedNodeExecutable}"`
    ].join(' ');
    const serviceXml = windowsText([
        '<service>',
        `  <id>${escapeXml(serviceId)}</id>`,
        `  <name>${escapeXml(`flashterm stage (${normalizedInstanceId})`)}</name>`,
        `  <description>${escapeXml(`Serves the isolated ${normalizedInstanceId} flashterm stage instance.`)}</description>`,
        '  <executable>powershell.exe</executable>',
        `  <arguments>${escapeXml(argumentsText)}</arguments>`,
        `  <workingdirectory>${escapeXml(normalizedProjectRoot)}</workingdirectory>`,
        '  <startmode>Automatic</startmode>',
        '  <delayedAutoStart>true</delayedAutoStart>',
        '  <hidewindow>true</hidewindow>',
        `  <logpath>${escapeXml(logDirectory)}</logpath>`,
        '  <log mode="roll-by-size">',
        '    <sizeThreshold>10240</sizeThreshold>',
        '    <keepFiles>14</keepFiles>',
        '  </log>',
        '  <onfailure action="restart" delay="10 sec" />',
        '  <onfailure action="restart" delay="30 sec" />',
        '  <resetfailure>1 hour</resetfailure>',
        '  <stoptimeout>15 sec</stoptimeout>',
        '</service>'
    ]);

    const webConfig = windowsText([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<configuration>',
        '    <system.webServer>',
        '        <rewrite>',
        '            <rules>',
        `                <rule name="${escapeXml(`flashterm stage ${normalizedInstanceId} reverse proxy`)}" stopProcessing="true">`,
        '                    <match url="(.*)" />',
        `                    <action type="Rewrite" url="http://127.0.0.1:${port}/{R:1}" appendQueryString="true" />`,
        '                </rule>',
        '            </rules>',
        '        </rewrite>',
        '        <security>',
        '            <requestFiltering>',
        '                <requestLimits maxAllowedContentLength="31457280" />',
        '            </requestFiltering>',
        '        </security>',
        '        <httpErrors existingResponse="PassThrough" />',
        '    </system.webServer>',
        '</configuration>'
    ]);

    return {
        instanceId: normalizedInstanceId,
        port,
        publicOrigin: normalizedOrigin,
        serviceId,
        wrapperBaseName,
        settingsPath,
        dataDirectory: normalizedDataDirectory,
        proxyDirectory,
        files: {
            'service.env.example': settings,
            [`${wrapperBaseName}.xml`]: serviceXml,
            'iis/web.config': webConfig
        }
    };
}

export async function writeWindowsInstanceFiles({ outputDirectory, ...options } = {}) {
    const normalizedOutputDirectory = requireSingleLine(outputDirectory, 'outputDirectory');
    const bundle = buildWindowsInstanceFiles(options);
    const targetDirectory = path.resolve(normalizedOutputDirectory, bundle.instanceId);

    try {
        await access(targetDirectory);
        throw new Error(`The output directory already exists: ${targetDirectory}`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    await mkdir(targetDirectory, { recursive: true });
    for (const [relativePath, contents] of Object.entries(bundle.files)) {
        const targetPath = path.join(targetDirectory, ...relativePath.split('/'));
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, contents, { encoding: 'utf8', flag: 'wx' });
    }

    return { ...bundle, outputDirectory: targetDirectory };
}
