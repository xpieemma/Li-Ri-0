#!/usr/bin/env python3
import argparse
import json
import numpy as np
import pandas as pd
from scipy.stats import norm

class GaussianCopula:
    """Simple Gaussian copula with a correlation matrix."""
    def __init__(self, correlation_matrix):
        self.correlation_matrix = np.array(correlation_matrix)

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--entropy', required=True, help='Hex string of quantum entropy')
    
    parser.add_argument('--round',   required=True, dest='beacon_round', help='CURBy round number')
    parser.add_argument('--rows',    type=int, default=5000)
    parser.add_argument('--output',  default='synthetic_data.csv')
    return parser.parse_args()

def entropy_to_seed(hex_str):
    """Use first 8 bytes as a 64-bit seed."""
    data = bytes.fromhex(hex_str)
    return int.from_bytes(data[:8], 'big')

def generate_copula_data(seed, n, corr_matrix):
    """
    Generate multivariate normal with given correlation,
    then transform to uniform marginals using normal CDF.
    """
    rng = np.random.default_rng(seed)

    mvn = rng.multivariate_normal(np.zeros(len(corr_matrix)), corr_matrix, size=n)
    u = norm.cdf(mvn)  # uniform marginals via probability integral transform
    return u

def map_to_schema(u):
    """Transform uniform copula samples to the desired marginals."""
    df = pd.DataFrame(u, columns=['c1', 'c2', 'c3'])

    # Age: integer between 18 and 90
    df['age'] = (df['c1'] * (90 - 18) + 18).astype(int)

    # Income: continuous between 30000 and 150000
    df['income'] = df['c2'] * (150000 - 30000) + 30000

    # Region: categorical based on quartiles of c3
    bins = [0, 0.25, 0.5, 0.75, 1.0]
    labels = ['North', 'South', 'East', 'West']
    df['region'] = pd.cut(df['c3'], bins=bins, labels=labels, include_lowest=True)

    return df[['age', 'income', 'region']]

def save_metadata(beacon_round, entropy_hex, rows, output_path):
    
    meta = {
        'round': beacon_round,
        'entropy_hex': entropy_hex,
        'rows': rows,
        'generated_with': 'pure_entropy (seed from first 8 bytes)',
        'copula': 'Gaussian with predefined correlation matrix'
    }
    with open(output_path + '.meta.json', 'w') as f:
        json.dump(meta, f, indent=2)

def main():
    args = parse_args()

    corr_matrix = [
        [1.0, 0.8, 0.3],
        [0.8, 1.0, 0.2],
        [0.3, 0.2, 1.0]
    ]
    copula = GaussianCopula(correlation_matrix=corr_matrix)

    seed = entropy_to_seed(args.entropy)
    u = generate_copula_data(seed, args.rows, copula.correlation_matrix)
    df = map_to_schema(u)

    df.to_csv(args.output, index=False)
    save_metadata(args.beacon_round, args.entropy, args.rows, args.output)

    print(f"Data saved to: {args.output}")
    print(f"Metadata saved to: {args.output}.meta.json")

if __name__ == '__main__':
    main()
