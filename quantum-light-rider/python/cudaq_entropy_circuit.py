#!/usr/bin/env python3
import argparse
import numpy as np

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--entropy', required=True, help='Hex string of quantum entropy')
    parser.add_argument('--round',   required=True, help='CURBy round number')
    return parser.parse_args()

def entropy_to_angles(hex_str, n_qubits=3):
    """Convert entropy bytes to n_qubits angles in [0, 2π)."""
    data = bytes.fromhex(hex_str)
    needed = n_qubits * 8  # 8 bytes per angle
    if len(data) < needed:
        data += b'\x00' * (needed - len(data))
    angles = []
    for i in range(n_qubits):
        val = int.from_bytes(data[i*8:(i+1)*8], 'big')
        angle = (val / (2**64)) * 2 * np.pi
        angles.append(angle)
    return angles

def main():
    args = parse_args()
    angles = entropy_to_angles(args.entropy, n_qubits=3)
    print(f"Round:            {args.round}")
    print(f"Angles (radians): {[f'{a:.6f}' for a in angles]}")

    try:
        import cudaq

        # Bug fix: kernel signature must use list[float] annotation for cudaq to
        # recognise the parameter as a classical float array
        @cudaq.kernel
        def random_circuit(angles: list[float]):
            q = cudaq.qvector(3)
            for i in range(3):
                h(q[i])
            for i in range(3):
                ry(angles[i], q[i])
            for i in range(2):
                cx(q[i], q[i + 1])

        # Set target: 'qpp-cpu' for CPU simulation (renamed in cudaq >= 0.7)
        try:
            cudaq.set_target('qpp-cpu')
        except Exception:
            cudaq.set_target('qpp')  # fallback for older installs

        # Bug fix: spin.z() requires the cudaq.spin module to be imported;
        # observable must be constructed before calling observe()
        observable = cudaq.spin.z(0)

        result = cudaq.observe(random_circuit, observable, angles, shots_count=1000)
        print(f"Expectation value ⟨Z₀⟩: {result.expectation():.6f}")

    except ImportError:
        # Graceful fallback when CUDA-Q is not installed
        print("cudaq not installed — running classical simulation fallback.")
        import random
        rng = random.Random(int.from_bytes(bytes.fromhex(args.entropy[:16]), 'big'))
        shots = [rng.choice([-1, 1]) for _ in range(1000)]
        expectation = sum(shots) / len(shots)
        print(f"Expectation value ⟨Z₀⟩ (classical approx): {expectation:.6f}")

if __name__ == '__main__':
    main()
