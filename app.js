// 全局状态
let currentStyle = 'rap';
let isGenerating = false;
let currentAudio = null;

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

// 音乐风格配置
const styleConfig = {
    rap: {
        drums: { kick: 0.8, snare: 0.6, hihat: 0.4 },
        bass: { octave: 1, pattern: 'pulse' },
        melody: { active: false }
    },
    electronic: {
        drums: { kick: 0.7, snare: 0.5, hihat: 0.5 },
        bass: { octave: 1, pattern: 'wobble' },
        melody: { active: true, notes: ['C3', 'D3', 'E3', 'G3'] }
    },
    trap: {
        drums: { kick: 0.9, snare: 0.7, hihat: 0.6 },
        bass: { octave: 0, pattern: 'punch' },
        melody: { active: false }
    },
    deep: {
        drums: { kick: 0.6, snare: 0.4, hihat: 0.3 },
        bass: { octave: 0, pattern: 'ambient' },
        melody: { active: true, notes: ['A2', 'C3', 'D3'] }
    }
};

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
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        styleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStyle = btn.dataset.style;
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
    showStatus('正在生成伴奏...', 'loading');

    try {
        const bpm = parseInt(bpmInput.value);
        const length = parseInt(lengthInput.value);
        const intensity = parseInt(intensityInput.value) / 10;
        const style = currentStyle;

        // 启动Tone
        await Tone.start();
        Tone.Transport.bpm.value = bpm;

        // 创建音频上下文
        const offlineContext = new OfflineAudioContext(2, 44100 * length, 44100);
        const offlineOscillator = offlineContext.createOscillator();
        const offlineGain = offlineContext.createGain();

        offlineOscillator.connect(offlineGain);
        offlineGain.connect(offlineContext.destination);

        // 根据风格生成不同的模式
        await generateByStyle(bpm, length, intensity, style);

        // 立即生成简单的示例音频（实际项目中会更复杂）
        currentAudio = generateSimpleAudio(bpm, length, style, intensity);

        // 显示音频
        audio.src = currentAudio;
        audioPlayer.classList.add('show');
        downloadBtn.disabled = false;

        showStatus('✅ 伴奏生成成功！', 'success');
    } catch (error) {
        console.error('生成失败:', error);
        showStatus('❌ 生成失败，请重试', 'error');
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
    }
}

// 根据风格生成音乐（示例函数）
async function generateByStyle(bpm, length, intensity, style) {
    // 这里是实现音乐生成的核心逻辑
    // 实际项目中会根据风格参数生成不同的鼓点、贝斯和旋律
    const beatTime = (60 / bpm) * 4; // 一个小节的时长
    const numBeats = Math.floor(length / beatTime);

    const config = styleConfig[style];

    // 模拟音乐生成过程
    console.log(`生成 ${style} 风格，BPM: ${bpm}, 长度: ${length}秒, 强度: ${intensity}`);
    console.log('配置:', config);
}

// 生成简单音频（使用Web Audio API）
function generateSimpleAudio(bpm, length, style, intensity) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const numberOfSamples = sampleRate * length;
    const audioBuffer = audioContext.createBuffer(2, numberOfSamples, sampleRate);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);

    // 生成简单的鼓点和低音模式
    const beatDuration = 60 / bpm; // 秒
    const beatSamples = beatDuration * sampleRate;

    // 生成鼓点
    for (let i = 0; i < numberOfSamples; i++) {
        const beatPosition = (i % beatSamples) / beatSamples;

        // 大鼓（低频）
        if (beatPosition < 0.1) {
            const kickFreq = 150 * Math.exp(-beatPosition * 10) * intensity;
            left[i] += Math.sin(2 * Math.PI * (kickFreq / sampleRate) * i) * 0.5 * Math.exp(-beatPosition * 5);
            right[i] += left[i];
        }

        // 小鼓（高频脉冲）
        if (beatPosition > 0.5 && beatPosition < 0.55) {
            left[i] += Math.random() * 0.3 * intensity;
            right[i] += left[i];
        }

        // 低音
        if (beatPosition < 0.8) {
            const bassFreq = (style === 'deep' ? 40 : 60) * (1 + Math.sin(beatPosition * Math.PI) * 0.5);
            left[i] += Math.sin(2 * Math.PI * (bassFreq / sampleRate) * i) * 0.2 * intensity;
            right[i] += left[i];
        }
    }

    // 转换为Blob
    const offlineContext = new OfflineAudioContext(2, numberOfSamples, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    return encodeWAVtoMP3(audioBuffer, sampleRate);
}

// 简单的WAV编码函数（实际项目会使用mp3库）
function encodeWAVtoMP3(audioBuffer, sampleRate) {
    // 这里使用WAV格式作为临时方案
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const interleaved = new Float32Array(left.length * 2);

    for (let i = 0; i < left.length; i++) {
        interleaved[i * 2] = left[i];
        interleaved[i * 2 + 1] = right[i];
    }

    const wav = encodeWAV(interleaved, sampleRate);
    const blob = new Blob([wav], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

// WAV编码函数
function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const writeFloat = (offset, value) => {
        view.setFloat32(offset, value, true);
    };

    const writeShort = (offset, value) => {
        view.setInt16(offset, value, true);
    };

    // WAV文件头
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    writeShort(20, 1);
    writeShort(22, 2);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    writeShort(32, 4);
    writeShort(34, 16);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // 写入样本
    const volume = 0.8;
    let index = 44;
    const length = samples.length;
    let s = 0;
    while (index < buffer.byteLength) {
        s = Math.max(-1, Math.min(1, samples[length]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(index, s, true);
        index += 2;
        length++;
    }

    return buffer;
}

// 预听
previewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentAudio) {
        audio.play();
    } else {
        showStatus('请先生成伴奏', 'error');
    }
});

// 下载
downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentAudio) {
        const link = document.createElement('a');
        link.href = currentAudio;
        link.download = `music_${currentStyle}_${new Date().getTime()}.wav`;
        link.click();
        showStatus('✅ 下载成功！', 'success');
    }
});

// 表单提交
form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateMusic();
});

console.log('🎵 音乐伴奏生成器已加载');