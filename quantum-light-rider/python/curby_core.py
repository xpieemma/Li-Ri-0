#!/usr/bin/env python3
"""
Quantum Entropy Core (Python SDK)
This serves as the engine for all Data Science and GPU workflows.

Install: pip install curby-client
"""

import asyncio
from curby_client import Client

async def main():
    # Initialize the official CURBy client
    async with Client() as client:
        # Fetch the latest pulse
        pulse = await client.latest()

        # Extract raw bytes (64 bytes = 512 bits of quantum randomness)
        raw_bytes = bytes(pulse.randomness[:64])
        pulse_meta = {
            'round': pulse.round,
            'timestamp': str(pulse.timestamp) if hasattr(pulse, 'timestamp') else 'N/A',
        }

        # Output traceability data for auditability
        print("--- CURBy Pulse Verification ---")
        print(f"Round:       {pulse_meta['round']}")
        print(f"Timestamp:   {pulse_meta['timestamp']}")
        print(f"Hex preview: {raw_bytes[:16].hex()}...{raw_bytes[-8:].hex()}")

if __name__ == '__main__':
    asyncio.run(main())
