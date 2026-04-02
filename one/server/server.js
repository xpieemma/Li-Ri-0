// import express from 'express';

// import cors from 'cors';
// import { DIRNGClient } from '@buff-beacon-project/curby-client';

// const app = express();
// const PORT = 3000;


// app.use(cors());


// app.get('/api/pulse', async (req, res) => {
//     try {
//         const client = DIRNGClient.create(); // Create DIRNG client
//         const randomness = await client.randomness(); // Get randomness
//         const roundData = await client.latest(); // Get latest round data
        
        
//         res.json({
//             round: roundData.round, // Round number
//             bytes: Array.from(randomness.bytes()) // Bytes
//         });
        
//     } catch (error) {
//         console.error("Quantum fetch failed:", error); // Log error
//         res.status(500).json({ error: "Failed to fetch quantum entropy from entwine.me" }); // Return error
//     }
// });

// app.listen(PORT, () => {
//     console.log(`⚡ Quantum Proxy Microservice running on http://localhost:${PORT}`); // Log server start
// });










import express from 'express';
import { spawn } from 'child_process';
import { DIRNGClient } from '@buff-beacon-project/curby-client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
app.use(express.json());

// Serve static frontend files (optional)
app.use(express.static(path.join(__dirname, '../frontend')));

// Create a reusable client instance
let client;

// Helper to get or create client
async function getClient() {
    if (!client) {
        client = DIRNGClient.create();
    }
    return client;
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
        const hex = randomness.hex();               // full hex string of the pulse
        const roundData = await client.latest();
        const round = roundData.round;

        // Determine Python executable path (adjust for OS)
        const isWindows = process.platform === 'win32';
        const pythonPath = isWindows
            ? path.join(__dirname, '../python/venv/Scripts/python.exe')
            : path.join(__dirname, '../python/venv/bin/python');
        const scriptPath = path.join(__dirname, '../python/generate_synthetic_data.py');
        const outputPath = path.join(__dirname, '../data/synthetic_data.csv');

        // Spawn Python process
        pyProc = spawn(pythonPath, [
            scriptPath,
            '--entropy', hex,
            '--round', round.toString(),
            '--rows', '5000',
            '--output', outputPath
        ]);

        let stdout = '';
        let stderr = '';

        pyProc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pyProc.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`Python stderr: ${data}`);
        });

        pyProc.on('close', (code) => {
            if (code === 0) {
                res.json({
                    success: true,
                    message: 'Synthetic data generated successfully',
                    round: round,
                    outputPath: outputPath,
                    stdout: stdout.trim()
                });
            } else {
                console.error(`Python exited with code ${code}`);
                res.status(500).json({
                    success: false,
                    error: 'Python script failed',
                    stderr: stderr.trim(),
                    code: code
                });
            }
        });

        // Handle process spawn error
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

        pyProc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pyProc.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`CUDA-Q stderr: ${data}`);
        });

        pyProc.on('close', (code) => {
            if (code === 0) {
                // Parse expectation value from stdout if needed
                res.json({
                    success: true,
                    message: 'CUDA-Q simulation completed',
                    round: round,
                    output: stdout.trim()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'CUDA-Q script failed',
                    stderr: stderr.trim(),
                    code: code
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

// Start server
app.listen(PORT, () => {
    console.log(`⚡ Quantum Bridge server running on http://localhost:${PORT}`);
});