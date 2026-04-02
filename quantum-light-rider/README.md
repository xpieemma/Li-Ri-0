# ⚡ Quantum Light Rider

A canvas visualizer + data science toolkit powered by real quantum randomness from the [CURBy DIRNG beacon](https://entwine.me).

## Project Structure

```
quantum-light-rider/
├── frontend/
│   ├── index.html       # Canvas UI
│   ├── script.js        # Quantum random walk renderer
│   └── styles.css       # Styling
├── backend/
│   ├── server.js        # Express proxy + Python bridge
│   └── package.json
├── python/
│   ├── curby_core.py              # CURBy SDK demo
│   ├── generate_synthetic_data.py # Gaussian copula data generator
│   ├── cudaq_entropy_circuit.py   # CUDA-Q quantum circuit (optional)
│   ├── validate_synthetic_data.py # Correlation + scatter plot validation
│   └── requirements.txt
└── data/                          # Generated CSV output goes here
```

## Setup

### 1. Backend (Node.js)

```bash
cd backend
npm install
npm start
# Server runs at http://localhost:3000
```

### 2. Frontend

Open `http://localhost:3000` in your browser (served by the Express static middleware).

Or open `frontend/index.html` directly — update the fetch URL in `script.js` if needed.

### 3. Python (optional — for synthetic data + CUDA-Q)

```bash
cd python
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run data generation directly:
```bash
python generate_synthetic_data.py --entropy <hex> --round <n> --rows 5000 --output ../data/synthetic_data.csv
```

Or trigger it via the backend endpoint:
```bash
curl -X POST http://localhost:3000/api/generate-sync
```

### 4. CUDA-Q (GPU simulation — optional)

Install CUDA-Q separately following [NVIDIA's guide](https://nvidia.github.io/cuda-quantum/latest/install.html), then uncomment `cudaq` in `requirements.txt`.

The script falls back to a classical approximation automatically if `cudaq` is not installed.

## Bug Fixes Applied

| File | Bug | Fix |
|------|-----|-----|
| `backend/server.js` | `cors` imported but never registered as middleware | Added `app.use(cors())` before routes |
| `backend/server.js` | Shared `client` instance goes stale across rounds | Fresh client created per request |
| `frontend/script.js` | Wrap check used `> W` / `> H` (missed exact boundary) | Changed to `>= W` / `>= H` |
| `python/generate_synthetic_data.py` | `--round` arg shadowed Python built-in `round()` | Renamed to `dest='beacon_round'` |
| `python/generate_synthetic_data.py` | `save_metadata` used undefined `round_num` variable | Corrected to `beacon_round` |
| `python/generate_synthetic_data.py` | Unused `scipy.multivariate_normal` import; used wrong API | Removed; uses `rng.multivariate_normal` |
| `python/cudaq_entropy_circuit.py` | Target name `'qpp'` renamed to `'qpp-cpu'` in newer cudaq | Try/except fallback for both names |
| `python/cudaq_entropy_circuit.py` | No graceful fallback when `cudaq` not installed | Added classical approximation fallback |
| `python/curby_core.py` | Used non-existent `curby` package with wrong API | Rewritten to use `curby-client` async API |
