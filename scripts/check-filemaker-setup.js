import process from 'node:process';
import { checkFileMakerSetup } from '../src/deployment/filemaker-setup.js';

// Credentials travel through the parent process pipe, never command arguments.
try {
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk.toString('utf8');
        if (Buffer.byteLength(input) > 65536) throw new Error();
    }
    const result = await checkFileMakerSetup(JSON.parse(input.replace(/^\uFEFF/, '')));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
} catch {
    console.log(JSON.stringify({ ok: false, code: 'INVALID_SETUP_INPUT' }));
    process.exitCode = 1;
}
