#!/usr/bin/env python3
"""
Validates the quantum-generated synthetic dataset.
Run after generate_synthetic_data.py has produced synthetic_data.csv.
"""

import pandas as pd
import matplotlib
matplotlib.use('Agg')  # headless — no display required
import matplotlib.pyplot as plt

#  Load the quantum-generated dataset
df = pd.read_csv("synthetic_data.csv")

# Mathematical Validation (Pearson Correlation)
corr_age_income = df['age'].corr(df['income'])
print(f"Target Pearson Correlation:   0.800")
print(f"Observed Pearson Correlation: {corr_age_income:.3f}")

#  Visual Validation (Scatter Plot)
plt.figure(figsize=(8, 6))
plt.scatter(df['age'], df['income'], alpha=0.5, s=10, color='teal')
plt.title('Synthetic Data Validation: Age vs Income\n(Driven purely by CURBy Quantum Entropy)')
plt.xlabel('Age (Years)')
plt.ylabel('Income (USD)')
plt.grid(True, alpha=0.3)

plt.savefig("correlation_plot.png")
print("Correlation plot saved to correlation_plot.png")
