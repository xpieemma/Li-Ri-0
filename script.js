

const canvas = document.getElementById('quantumCanvas'); // Get canvas element
const ctx = canvas.getContext('2d'); // Get 2D context
const W = canvas.width = 800; // Set width
const H = canvas.height = 500; // Set height

let x = W / 2, y = H / 2; // Set initial position
let totalBytesConsumed = 0; // Total bytes consumed


let byteQueue = [];  // Byte queue
let isFetching = false; // Is fetching
const MIN_BYTES_BEFORE_FETCH = 100; // Minimum bytes before fetch


const sourceStatus = document.getElementById('sourceStatus'); // Source status
const pulseIdSpan = document.getElementById('pulseId'); // Pulse ID
const bytesUsedSpan = document.getElementById('bytesUsed'); // Bytes used
const fadeSlider = document.getElementById('fadeSlider'); // Fade slider


async function refillBuffer() {
    if (isFetching) return; // If fetching, return
    isFetching = true; // Set fetching to true
    sourceStatus.innerText = '⏳ fetching quantum pulse via local proxy...'; // Set source status
    
    try {
       
        const response = await fetch('http://localhost:3000/api/pulse'); // Fetch from local proxy
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`); // Throw error if response is not ok
        }
        
        const data = await response.json(); // Get data from response

      
        byteQueue.push(...data.bytes); // Add bytes to queue

     
        pulseIdSpan.innerText = `round ${data.round}`; // Set pulse ID
        sourceStatus.innerText = '✅ quantum proxy ready'; // Set source status
    } catch (err) {
        console.error('Local proxy fetch error:', err); // Log error
        sourceStatus.innerText = '⚠️ backend fetch error, retrying...'; // Set source status
        setTimeout(refillBuffer, 3000); // Retry after 3 seconds
    } finally {
        isFetching = false; // Set fetching to false
    }
}

function ensureBytes(needed) {
    if (byteQueue.length < MIN_BYTES_BEFORE_FETCH && !isFetching) {// If byte queue is less than minimum bytes before fetch and not fetching, refill buffer
        refillBuffer(); // Refill buffer
    }
    return byteQueue.length >= needed; // Return true if byte queue is greater than or equal to needed
}

function getByte() {
    if (byteQueue.length === 0) throw new Error('No entropy available'); // Throw error if byte queue is empty
    const b = byteQueue.shift(); // Get byte from queue
    totalBytesConsumed++; // Increment total bytes consumed
    bytesUsedSpan.innerText = `${totalBytesConsumed.toLocaleString()} bytes`; // Update bytes used
    return b; // Return byte
}


const STEP_SIZE = 3.6; // Step size for movement

function performStep() {
    if (!ensureBytes(3)) return false; // If not enough bytes, return false 

    try {
        const angleHigh = getByte(); // Get angle high byte
        const angleLow  = getByte(); // Get angle low byte
        const hueByte   = getByte(); // Get hue byte

        const angle = ((angleHigh << 8) | angleLow) / 65536 * 2 * Math.PI; // Calculate angle
        const hue = (hueByte / 255) * 360; // Calculate hue

        const dx = Math.cos(angle) * STEP_SIZE; // Calculate dx
        const dy = Math.sin(angle) * STEP_SIZE; // Calculate dy

        let newX = x + dx; // Calculate new x
        let newY = y + dy; // Calculate new y
        let wrapped = false; // Check if wrapped

      
        if (newX < 0) { newX = W + (newX % W); wrapped = true; } // Wrap x
        if (newX > W) { newX = newX % W; wrapped = true; } // Wrap x
        if (newY < 0) { newY = H + (newY % H); wrapped = true; } // Wrap y
        if (newY > H) { newY = newY % H; wrapped = true; } // Wrap y

  
        if (!wrapped) {
            drawSegment(x, y, newX, newY, hue); // Draw segment
        }

        x = newX; // Update x
        y = newY; // Update y
        return true; // Return true
    } catch (e) {
        console.warn(e); // Log error
        return false; // Return false
    }
}


function drawSegment(x1, y1, x2, y2, hue) { // Draw segment
    const grad = ctx.createLinearGradient(x1, y1, x2, y2); // Create gradient
    grad.addColorStop(0, `hsla(${hue}, 85%, 65%, 0.9)`); // Add color stop
    grad.addColorStop(1, `hsla(${hue}, 85%, 65%, 0.3)`); // Add color stop
    ctx.beginPath(); // Begin path
    ctx.moveTo(x1, y1); // Move to x1, y1
    ctx.lineTo(x2, y2); // Line to x2, y2
    ctx.lineWidth = 2.8; // Set line width
    ctx.strokeStyle = grad; // Set stroke style
    ctx.shadowBlur = 6; // Set shadow blur
    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`; // Set shadow color
    ctx.stroke(); // Draw stroke
    ctx.shadowBlur = 0; // Reset shadow blur
}


function resetWalk() { // Reset walk
    ctx.clearRect(0, 0, W, H); // Clear canvas
    ctx.fillStyle = '#010105'; // Set fill style
    ctx.fillRect(0, 0, W, H); // Fill canvas
    x = W / 2; // Set x
    y = H / 2; // Set y
    
    ctx.beginPath(); // Begin path
    ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw circle
    ctx.fillStyle = '#ffdd99'; // Set fill style
    ctx.fill(); // Fill circle
}


function animate() {

    const currentAlpha = parseFloat(fadeSlider.value);// Get fade slider value
    ctx.fillStyle = `rgba(1, 1, 5, ${currentAlpha})`; // Set fill style
    ctx.fillRect(0, 0, W, H); // Fill canvas

    const tookStep = performStep(); // Perform step

  
    if (tookStep) {
        ctx.beginPath(); // Begin path
        ctx.arc(x, y, 2.5, 0, 2 * Math.PI); // Draw circle
        ctx.fillStyle = `hsla(${(Date.now() * 0.02) % 360}, 85%, 70%, 0.9)`; // Set fill style
        ctx.shadowBlur = 5; // Set shadow blur
        ctx.shadowColor = ctx.fillStyle; // Set shadow color
        ctx.fill(); // Fill circle
        ctx.shadowBlur = 0; // Reset shadow blur
    }

    requestAnimationFrame(animate); // Request animation frame
}


function downloadCanvasImage() {
    const dataURL = canvas.toDataURL('image/png'); // Get data URL
    const downloadLink = document.createElement('a'); // Create download link
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Get timestamp
    downloadLink.download = `quantum-light-rider_${timestamp}.png`; // Set download link
    downloadLink.href = dataURL; // Set href
    document.body.appendChild(downloadLink); // Append download link
    downloadLink.click(); // Click download link
    document.body.removeChild(downloadLink); // Remove download link
}

document.getElementById('saveBtn').addEventListener('click', downloadCanvasImage);
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent default context menu
    downloadCanvasImage(); // Download canvas image
});


resetWalk(); // Reset walk
refillBuffer(); // Refill buffer
animate(); // Animate

document.getElementById('resetBtn').addEventListener('click', () => {
    resetWalk(); // Reset walk
});