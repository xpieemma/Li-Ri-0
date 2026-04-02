const canvas = document.getElementById('quantumCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width = 800;
const H = canvas.height = 500;

let x = W / 2, y = H / 2;
let totalBytesConsumed = 0;

let byteQueue = [];
let isFetching = false;
const MIN_BYTES_BEFORE_FETCH = 100;

const sourceStatus = document.getElementById('sourceStatus');
const pulseIdSpan = document.getElementById('pulseId');
const bytesUsedSpan = document.getElementById('bytesUsed');
const fadeSlider = document.getElementById('fadeSlider');

async function refillBuffer() {
    if (isFetching) return;
    isFetching = true;
    sourceStatus.innerText = '⏳ fetching quantum pulse via local proxy...';

    try {
        const response = await fetch('http://localhost:3000/api/pulse');

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        byteQueue.push(...data.bytes);

        pulseIdSpan.innerText = `round ${data.round}`;
        sourceStatus.innerText = '✅ quantum proxy ready';
    } catch (err) {
        console.error('Local proxy fetch error:', err);
        sourceStatus.innerText = '⚠️ backend fetch error, retrying...';
        setTimeout(refillBuffer, 3000);
    } finally {
        isFetching = false;
    }
}

function ensureBytes(needed) {
    if (byteQueue.length < MIN_BYTES_BEFORE_FETCH && !isFetching) {
        refillBuffer();
    }
    return byteQueue.length >= needed;
}

function getByte() {
    if (byteQueue.length === 0) throw new Error('No entropy available');
    const b = byteQueue.shift();
    totalBytesConsumed++;
    bytesUsedSpan.innerText = `${totalBytesConsumed.toLocaleString()} bytes`;
    return b;
}

const STEP_SIZE = 3.6;

function performStep() {
    if (!ensureBytes(3)) return false;

    try {
        const angleHigh = getByte();
        const angleLow  = getByte();
        const hueByte   = getByte();

        const angle = ((angleHigh << 8) | angleLow) / 65536 * 2 * Math.PI;
        const hue = (hueByte / 255) * 360;

        const dx = Math.cos(angle) * STEP_SIZE;
        const dy = Math.sin(angle) * STEP_SIZE;

        let newX = x + dx;
        let newY = y + dy;
        let wrapped = false;

        // Bug fix: use >= W and >= H to catch exact boundary hits
        if (newX < 0)  { newX = W + (newX % W); wrapped = true; }
        if (newX >= W) { newX = newX % W;        wrapped = true; }
        if (newY < 0)  { newY = H + (newY % H);  wrapped = true; }
        if (newY >= H) { newY = newY % H;         wrapped = true; }

        if (!wrapped) {
            drawSegment(x, y, newX, newY, hue);
        }

        x = newX;
        y = newY;
        return true;
    } catch (e) {
        console.warn(e);
        return false;
    }
}

function drawSegment(x1, y1, x2, y2, hue) {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, `hsla(${hue}, 85%, 65%, 0.9)`);
    grad.addColorStop(1, `hsla(${hue}, 85%, 65%, 0.3)`);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = grad;
    ctx.shadowBlur = 6;
    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function resetWalk() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#010105';
    ctx.fillRect(0, 0, W, H);
    x = W / 2;
    y = H / 2;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffdd99';
    ctx.fill();
}

function animate() {
    const currentAlpha = parseFloat(fadeSlider.value);
    ctx.fillStyle = `rgba(1, 1, 5, ${currentAlpha})`;
    ctx.fillRect(0, 0, W, H);

    const tookStep = performStep();

    if (tookStep) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${(Date.now() * 0.02) % 360}, 85%, 70%, 0.9)`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    requestAnimationFrame(animate);
}

function downloadCanvasImage() {
    const dataURL = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadLink.download = `quantum-light-rider_${timestamp}.png`;
    downloadLink.href = dataURL;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

document.getElementById('saveBtn').addEventListener('click', downloadCanvasImage);
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    downloadCanvasImage();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    resetWalk();
});

// Init
resetWalk();
refillBuffer();
animate();
