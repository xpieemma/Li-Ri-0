import express from 'express';
import cors from 'cors';
import { DIRNGClient } from '@buff-beacon-project/curby-client';

const app = express();
const PORT = 3000;


app.use(cors());


app.get('/api/pulse', async (req, res) => {
    try {
        const client = DIRNGClient.create(); // Create DIRNG client
        const randomness = await client.randomness(); // Get randomness
        const roundData = await client.latest(); // Get latest round data
        
        
        res.json({
            round: roundData.round, // Round number
            bytes: Array.from(randomness.bytes()) // Bytes
        });
        
    } catch (error) {
        console.error("Quantum fetch failed:", error); // Log error
        res.status(500).json({ error: "Failed to fetch quantum entropy from entwine.me" }); // Return error
    }
});

app.listen(PORT, () => {
    console.log(`⚡ Quantum Proxy Microservice running on http://localhost:${PORT}`); // Log server start
});