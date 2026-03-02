import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

(async () => {
    console.log("Starting dev server...");
    const server = spawn('npm', ['run', 'dev', '--', '--port', '5179', '--host'], {
        stdio: 'pipe',
        cwd: 'c:\\Users\\thoma\\Documents\\COS App',
        shell: true
    });

    server.stdout.on('data', d => console.log('DEV:', d.toString()));
    server.stderr.on('data', d => console.error('DEV ERR:', d.toString()));

    await new Promise(r => setTimeout(r, 6000));
    console.log("Launching browser...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let logs = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            logs.push('CONSOLE ERROR: ' + msg.text());
        }
    });
    page.on('pageerror', err => {
        logs.push('PAGE ERROR: ' + err.message + '\n' + err.stack);
    });

    try {
        await page.goto('http://localhost:5179', { waitUntil: 'networkidle0', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
        logs.push('PUPPETEER EXCEPTION: ' + e.message);
    }

    fs.writeFileSync('C:\\Users\\thoma\\Documents\\COS App\\crash_logs.txt', logs.join('\n\n'));
    console.log("Wrote logs to crash_logs.txt");
    await browser.close();
    server.kill();
    process.exit(0);
})();
