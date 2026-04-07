// 全局状态
let currentStyle = 'rap';
let currentPattern = 'standard';
let isGenerating = false;
let currentAudio = null;
let audioContext = null;

// 获取DOM元素
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
const styleBtns = document.querySelectorAll('.style-btn');
const patternBtns = document.querySelectorAll('[data-pattern]');

// 音乐风格配置
const styleConfig = {
    rap: {
        baseFreq: 80,
        kickIntensity: 0.8,
        snareIntensity: 0.6,
        hihatIntensity: 0.4,
        bassPattern: 'pulse'
    },
    electronic: {
        baseFreq: 110,
        kickIntensity: 0.7,
        snareIntensity: 0.5,
        hihatIntensity: 0.5,
        bassPattern: 'wobble'
    },
    trap: {
        baseFreq: 70,
        kickIntensity: 0.9,
        snareIntensity: 0.7,
        hihatIntensity: 0.6,
        bassPattern: 'punch'
    },
    deep: {
        baseFreq: 55,
        kickIntensity: 0.6,
        snareIntensity: 0.4,
        hihatIntensity: 0.3,
        bassPattern: 'ambient'
    }
};

// 初始化音频上下文
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// 更新数值显示
bpmInput.addEventListener('input', (e) => {
    bpmValue.textContent = e.target.value;
});

lengthInput.addEventListener('input', (e) => {
    lengthValue.textContent = e.target.value;
});

intensityInput.addEventListener('input', (e) => {
    intensityValue.textContent = e.target.value;
});

// 风格选择
styleBtns.forEach(btn => {
    if (btn.dataset.style) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            styleBtns.forEach(b => {
                if (b.dataset.style) b.classList.remove('active');
            });
            btn.classList.add('active');
            currentStyle = btn.dataset.style;
        });
    }
});

// 节奏模式选择
patternBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        patternBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPattern = btn.dataset.pattern;
    });
});

// 显示状态信息
function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;
    setTimeout(() => {
        statusDiv.classList.remove('show');
    }, type === 'success' ? 3000 : 5000);
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

        // 生成音频
        const audioBlob = await generateAudioBlob(bpm, length, intensity, style);

        if (!audioBlob) {
            throw new Error('音频生成失败');
        }

        // 创建可播放的URL
        currentAudio = URL.createObjectURL(audioBlob);

        // 显示音频播放器
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

// 生成音频Blob
async function generateAudioBlob(bpm, length, intensity, style) {
    try {
        const ctx = initAudioContext();
        const sampleRate = ctx.sampleRate;
        const numberOfSamples = sampleRate * length;
        const audioBuffer = ctx.createBuffer(2, numberOfSamples, sampleRate);
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);

        const config = styleConfig[style];
        const beatDuration = 60 / bpm;
        const beatSamples = beatDuration * sampleRate;

        // 生成鼓点和低音
        for (let i = 0; i < numberOfSamples; i++) {
            const beatPosition = (i % beatSamples) / beatSamples;
            let sample = 0;

            // 大鼓（低频）
            if (beatPosition < 0.15) {
                const kickFreq = config.baseFreq * Math.exp(-beatPosition * 15);
                sample += Math.sin(2 * Math.PI * (i / sampleRate) * kickFreq) * 
                          config.kickIntensity * 0.6 * intensity * 
                          Math.exp(-beatPosition * 8);
            }

            // 小鼓（中高频打击）
            if ((beatPosition > 0.45 && beatPosition < 0.55) || 
                (beatPosition > 0.95 && beatPosition < 1.05)) {
                sample += (Math.random() * 2 - 1) * config.snareIntensity * 0.4 * intensity;
            }

            // 高帽（高频）
            if (beatPosition % 0.25 < 0.08) {
                sample += (Math.random() * 2 - 1) * config.hihatIntensity * 0.3 * intensity;
            }

            // 低音线
            const bassFreq = config.baseFreq * (1 + Math.sin(beatPosition * Math.PI) * 0.3);
            sample += Math.sin(2 * Math.PI * (i / sampleRate) * bassFreq) * 
                      0.15 * config.kickIntensity * intensity;

            // 限制动态范围
            sample = Math.max(-1, Math.min(1, sample)) * 0.8;

            left[i] = sample;
            right[i] = sample * (0.95 + Math.random() * 0.1); // 轻微立体声处理
        }

        // 转换为WAV
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

    // WAV文件头
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
previewBtn.addEventListener('click', (e) => {
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
downloadBtn.addEventListener('click', (e) => {
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

// 表单提交
form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateMusic();
});

console.log('🎵 Beat Forge 已加载完成');
