import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { DIRNGClient } from '@buff-beacon-project/curby-client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Bug fix: cors middleware must be registered before routes
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Bug fix: don't cache the client across requests — CURBy client
// holds internal state tied to a specific beacon round. A fresh
// client per request ensures we always get the latest pulse.
async function getClient() {
    return DIRNGClient.create();
}

// Endpoint for frontend (returns quantum bytes)
app.get('/api/pulse', async (req, res) => {
    try {
        const client = await getClient();
        const randomness = await client.randomness();
        const roundData = await client.latest();
        res.json({
            round: roundData.round,
            bytes: Array.from(randomness.bytes())
        });
    } catch (err) {
        console.error('Pulse fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch quantum entropy' });
    }
});

// Endpoint to generate synthetic data using Python
app.post('/api/generate-sync', async (req, res) => {
    let pyProc = null;
    try {
        const client = await getClient();
        const randomness = await client.randomness();
        const hex = randomness.hex();
        const roundData = await client.latest();
        const round = roundData.round;

        const isWindows = process.platform === 'win32';
        const pythonPath = isWindows
            ? path.join(__dirname, '../python/venv/Scripts/python.exe')
            : path.join(__dirname, '../python/venv/bin/python');
        const scriptPath = path.join(__dirname, '../python/generate_synthetic_data.py');
        const outputPath = path.join(__dirname, '../data/synthetic_data.csv');

        pyProc = spawn(pythonPath, [
            scriptPath,
            '--entropy', hex,
            '--round', round.toString(),
            '--rows', '5000',
            '--output', outputPath
        ]);

        let stdout = '';
        let stderr = '';

        pyProc.stdout.on('data', (data) => { stdout += data.toString(); });
        pyProc.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`Python stderr: ${data}`);
        });

        pyProc.on('close', (code) => {
            if (code === 0) {
                res.json({
                    success: true,
                    message: 'Synthetic data generated successfully',
                    round,
                    outputPath,
                    stdout: stdout.trim()
                });
            } else {
                console.error(`Python exited with code ${code}`);
                res.status(500).json({
                    success: false,
                    error: 'Python script failed',
                    stderr: stderr.trim(),
                    code
                });
            }
        });

        pyProc.on('error', (err) => {
            console.error('Failed to spawn Python process:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Could not start Python script' });
            }
        });

    } catch (err) {
        console.error('Error in generate-sync:', err);
        if (pyProc && !pyProc.killed) pyProc.kill();
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Endpoint to run CUDA-Q circuit simulation
app.post('/api/run-cudaq', async (req, res) => {
    let pyProc = null;
    try {
        const client = await getClient();
        const randomness = await client.randomness();
        const hex = randomness.hex();
        const roundData = await client.latest();
        const round = roundData.round;

        const isWindows = process.platform === 'win32';
        const pythonPath = isWindows
            ? path.join(__dirname, '../python/venv/Scripts/python.exe')
            : path.join(__dirname, '../python/venv/bin/python');
        const scriptPath = path.join(__dirname, '../python/cudaq_entropy_circuit.py');

        pyProc = spawn(pythonPath, [
            scriptPath,
            '--entropy', hex,
            '--round', round.toString()
        ]);

        let stdout = '';
        let stderr = '';

        pyProc.stdout.on('data', (data) => { stdout += data.toString(); });
        pyProc.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`CUDA-Q stderr: ${data}`);
        });

        pyProc.on('close', (code) => {
            if (code === 0) {
                res.json({
                    success: true,
                    message: 'CUDA-Q simulation completed',
                    round,
                    output: stdout.trim()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'CUDA-Q script failed',
                    stderr: stderr.trim(),
                    code
                });
            }
        });

        pyProc.on('error', (err) => {
            console.error('Failed to spawn CUDA-Q process:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Could not start CUDA-Q script' });
            }
        });

    } catch (err) {
        console.error('Error in run-cudaq:', err);
        if (pyProc && !pyProc.killed) pyProc.kill();
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`⚡ Quantum Bridge server running on http://localhost:${PORT}`);
});
