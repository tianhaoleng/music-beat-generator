// 全局状态
let currentStyle = 'rap';
let currentMood = 'neutral';
let currentCurve = 'flat';
let selectedInstruments = {
    kick: true,
    snare: true,
    hihat: true,
    bass: true,
    piano: false,
    guitar: false,
    strings: false,
    pad: false,
    organ: false,
    'synth-bass': false
};
let isGenerating = false;
let currentAudio = null;
let audioContext = null;

// DOM元素
const form = document.getElementById('form');
const bpmInput = document.getElementById('bpm');
const lengthInput = document.getElementById('length');
const intensityInput = document.getElementById('intensity');
const bpmValue = document.getElementById('bpmValue');
const lengthValue = document.getElementById('lengthValue');
const intensityValue = document.getElementById('intensityValue');
const statusDiv = document.getElementById('status');
const audioPlayer = document.getElementById('audioPlayer');
const audio = document.getElementById('audio');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewBtn = document.getElementById('previewBtn');
const styleBtns = document.querySelectorAll('[data-style]');
const instrumentBtns = document.querySelectorAll('[data-instrument]');
const moodBtns = document.querySelectorAll('[data-mood]');
const curveBtns = document.querySelectorAll('[data-curve]');

// 风格配置
const styleConfig = {
    rap: { baseFreq: 80, kickIntensity: 0.8, complexity: 0.7 },
    rnb: { baseFreq: 70, kickIntensity: 0.6, complexity: 0.8 },
    jazz: { baseFreq: 60, kickIntensity: 0.5, complexity: 0.9 },
    rock: { baseFreq: 75, kickIntensity: 0.9, complexity: 0.7 },
    folk: { baseFreq: 55, kickIntensity: 0.4, complexity: 0.6 },
    kpop: { baseFreq: 80, kickIntensity: 0.8, complexity: 0.8 },
    pop: { baseFreq: 85, kickIntensity: 0.7, complexity: 0.7 },
    classical: { baseFreq: 50, kickIntensity: 0.3, complexity: 0.9 },
    electronic: { baseFreq: 110, kickIntensity: 0.7, complexity: 0.8 },
    trap: { baseFreq: 70, kickIntensity: 0.9, complexity: 0.8 },
    funk: { baseFreq: 80, kickIntensity: 0.8, complexity: 0.8 },
    soul: { baseFreq: 65, kickIntensity: 0.6, complexity: 0.8 },
    disco: { baseFreq: 75, kickIntensity: 0.8, complexity: 0.7 },
    reggae: { baseFreq: 70, kickIntensity: 0.5, complexity: 0.6 },
    latin: { baseFreq: 90, kickIntensity: 0.7, complexity: 0.8 }
};

// 情绪配置
const moodConfig = {
    neutral: { energyMultiplier: 1.0, harmonyShift: 0 },
    happy: { energyMultiplier: 1.3, harmonyShift: 2 },
    sad: { energyMultiplier: 0.7, harmonyShift: -3 },
    intense: { energyMultiplier: 1.5, harmonyShift: 1 }
};

// 初始化
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// 更新显示
bpmInput.addEventListener('input', e => { bpmValue.textContent = e.target.value; });
lengthInput.addEventListener('input', e => { lengthValue.textContent = e.target.value; });
intensityInput.addEventListener('input', e => { intensityValue.textContent = e.target.value; });

// 风格选择
styleBtns.forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        styleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStyle = btn.dataset.style;
    });
});

// 乐器选择
instrumentBtns.forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        btn.classList.toggle('active');
        selectedInstruments[btn.dataset.instrument] = btn.classList.contains('active');
    });
});

// 情绪选择
moodBtns.forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        moodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMood = btn.dataset.mood;
    });
});

// 强度曲线选择
curveBtns.forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        curveBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCurve = btn.dataset.curve;
    });
});

// 显示状态
function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;
    setTimeout(() => {
        statusDiv.classList.remove('show');
    }, type === 'success' ? 3000 : 5000);
}

// 获取强度曲线值
function getIntensityAtPosition(position, curve, baseIntensity) {
    const intensity = parseInt(intensityInput.value) / 10;

    switch(curve) {
        case 'crescendo':
            return baseIntensity * intensity * position;
        case 'decrescendo':
            return baseIntensity * intensity * (1 - position);
        case 'wave':
            return baseIntensity * intensity * (0.5 + 0.5 * Math.sin(position * Math.PI * 2));
        default:
            return baseIntensity * intensity;
    }
}

// 生成音乐
async function generateMusic() {
    if (isGenerating) return;

    isGenerating = true;
    generateBtn.disabled = true;
    showStatus('⏳ 正在生成伴奏...', 'loading');

    try {
        const bpm = parseInt(bpmInput.value);
        const length = parseInt(lengthInput.value);
        const intensity = parseInt(intensityInput.value) / 10;
        const style = currentStyle;
        const mood = currentMood;
        const curve = currentCurve;

        const audioBlob = await generateAudioBlob(bpm, length, intensity, style, mood, curve);

        if (!audioBlob) {
            throw new Error('音频生成失败');
        }

        currentAudio = URL.createObjectURL(audioBlob);
        audio.src = currentAudio;
        audioPlayer.classList.add('show');
        downloadBtn.disabled = false;

        showStatus('✅ 伴奏生成成功！', 'success');
    } catch (error) {
        console.error('生成失败:', error);
        showStatus('❌ 生成失败：' + error.message, 'error');
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
    }
}

// 生成音频
async function generateAudioBlob(bpm, length, intensity, style, mood, curve) {
    try {
        const ctx = initAudioContext();
        const sampleRate = ctx.sampleRate;
        const numberOfSamples = sampleRate * length;
        const audioBuffer = ctx.createBuffer(2, numberOfSamples, sampleRate);
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);

        const config = styleConfig[style];
        const moodMod = moodConfig[mood];
        const beatDuration = 60 / bpm;
        const beatSamples = beatDuration * sampleRate;

        for (let i = 0; i < numberOfSamples; i++) {
            const beatPosition = (i % beatSamples) / beatSamples;
            const totalPosition = i / numberOfSamples;
            const currentIntensity = getIntensityAtPosition(totalPosition, curve, intensity);
            let sample = 0;

            // 大鼓
            if (selectedInstruments.kick && beatPosition < 0.15) {
                const kickFreq = config.baseFreq * Math.exp(-beatPosition * 15);
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * kickFreq) *
                          config.kickIntensity * 0.6 * currentIntensity *
                          Math.exp(-beatPosition * 8);
            }

            // 小鼓
            if (selectedInstruments.snare &&
                ((beatPosition > 0.45 && beatPosition < 0.55) ||
                 (beatPosition > 0.95 && beatPosition < 1.05))) {
                sample += (Math.random() * 2 - 1) * 0.4 * currentIntensity;
            }

            // 高帽
            if (selectedInstruments.hihat && beatPosition % 0.25 < 0.08) {
                sample += (Math.random() * 2 - 1) * 0.3 * currentIntensity;
            }

            // 低音
            if (selectedInstruments.bass || selectedInstruments['synth-bass']) {
                const bassFreq = config.baseFreq * (1 + Math.sin(beatPosition * Math.PI) * 0.3) + moodMod.harmonyShift * 5;
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * bassFreq) *
                          0.15 * config.kickIntensity * currentIntensity;
            }

            // 钢琴和弦
            if (selectedInstruments.piano) {
                const chordFreq = 200 + moodMod.harmonyShift * 50;
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * chordFreq) * 0.08 * currentIntensity * 0.5;
            }

            // 吉他
            if (selectedInstruments.guitar && beatPosition < 0.3) {
                const guitarFreq = 300 * Math.exp(-beatPosition * 5);
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * guitarFreq) * 0.1 * currentIntensity;
            }

            // 弦乐Pad
            if (selectedInstruments.strings) {
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * 150) * 0.06 * currentIntensity * 0.3;
            }

            // Pad
            if (selectedInstruments.pad) {
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * 100) * 0.05 * currentIntensity * 0.2;
            }

            // 风琴
            if (selectedInstruments.organ) {
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * 120) * 0.08 * currentIntensity * 0.4;
            }

            sample = Math.max(-1, Math.min(1, sample)) * 0.8;

            left[i] = sample;
            right[i] = sample * (0.95 + Math.random() * 0.1);
        }

        const wav = encodeWAV(audioBuffer, sampleRate);
        return new Blob([wav], { type: 'audio/wav' });

    } catch (error) {
        console.error('音频生成错误:', error);
        throw error;
    }
}

// WAV编码
function encodeWAV(audioBuffer, sampleRate) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const interleaved = new Float32Array(left.length * 2);

    for (let i = 0; i < left.length; i++) {
        interleaved[i * 2] = left[i];
        interleaved[i * 2 + 1] = right[i];
    }

    const buffer = new ArrayBuffer(44 + interleaved.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + interleaved.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setInt16(20, 1, true);
    view.setInt16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setInt16(32, 4, true);
    view.setInt16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, interleaved.length * 2, true);

    let index = 44;
    const volume = 0.8;
    for (let i = 0; i < interleaved.length; i++) {
        let s = Math.max(-1, Math.min(1, interleaved[i])) * volume;
        view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        index += 2;
    }

    return buffer;
}

// 预听
previewBtn.addEventListener('click', e => {
    e.preventDefault();
    if (currentAudio) {
        audio.play().catch(err => {
            console.error('播放失败:', err);
            showStatus('❌ 播放失败', 'error');
        });
    } else {
        showStatus('⚠️ 请先生成伴奏', 'error');
    }
});

// 下载
downloadBtn.addEventListener('click', e => {
    e.preventDefault();
    if (currentAudio) {
        const link = document.createElement('a');
        link.href = currentAudio;
        link.download = `beat_${currentStyle}_${new Date().getTime()}.wav`;
        link.click();
        showStatus('✅ 下载成功！', 'success');
    } else {
        showStatus('⚠️ 没有可下载的文件', 'error');
    }
});

// 快速预设
function applyQuickPreset(preset) {
    switch(preset) {
        case 'rap-boom':
            currentStyle = 'rap';
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns.forEach(b => { if(b.dataset.style === 'rap') b.classList.add('active'); });
            bpmInput.value = 90;
            bpmValue.textContent = 90;
            generateMusic();
            break;
        case 'rnb-smooth':
            currentStyle = 'rnb';
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns.forEach(b => { if(b.dataset.style === 'rnb') b.classList.add('active'); });
            bpmInput.value = 85;
            bpmValue.textContent = 85;
            intensityInput.value = 4;
            intensityValue.textContent = 4;
            generateMusic();
            break;
        case 'jazz-cool':
            currentStyle = 'jazz';
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns.forEach(b => { if(b.dataset.style === 'jazz') b.classList.add('active'); });
            bpmInput.value = 80;
            bpmValue.textContent = 80;
            generateMusic();
            break;
        case 'rock-power':
            currentStyle = 'rock';
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns.forEach(b => { if(b.dataset.style === 'rock') b.classList.add('active'); });
            bpmInput.value = 120;
            bpmValue.textContent = 120;
            intensityInput.value = 8;
            intensityValue.textContent = 8;
            generateMusic();
            break;
        case 'electronic-dance':
            currentStyle = 'electronic';
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns.forEach(b => { if(b.dataset.style === 'electronic') b.classList.add('active'); });
            bpmInput.value = 128;
            bpmValue.textContent = 128;
            intensityInput.value = 7;
            intensityValue.textContent = 7;
            generateMusic();
            break;
    }
}

// 表单提交
form.addEventListener('submit', e => {
    e.preventDefault();
    generateMusic();
});

console.log('🎵 Beat Forge Pro 已加载完成');
