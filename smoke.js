/**
 * SMOKE & SOUND ENGINE ДЛЯ ПЫЩ-ПАРАДА 3115
 * Реалистичный дым на Canvas + Синтезатор звуков Web Audio API
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Легендарный звук ПЫЩ! (Суб-басовый дроп + выброс сценического дыма)
    playPysh() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Мощный саб-бас 808
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.6);

        oscGain.gain.setValueAtTime(0.8, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);

        // 2. Пневматический выброс пара/дыма (White Noise с низкочастотным фильтром)
        const bufferSize = this.ctx.sampleRate * 1.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(250, now + 1.2);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 1.4);
    }

    // Звук щелчка терминала
    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    // Сигнал ОЛЕНЕ! ОПАСНОСТЕ!
    playAlarm() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.15);
        osc.frequency.setValueAtTime(880, now + 0.3);
        osc.frequency.setValueAtTime(440, now + 0.45);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
    }

    // Взрыв калькулятора Рамм
    playExplosion() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
    }
}

class SmokeEngine {
    constructor() {
        this.canvas = document.getElementById('smoke-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.active = false;
        this.density = 0;
        this.maxParticles = 140;
        this.animId = null;
        this.hud = document.getElementById('smoke-hud');
        this.densityText = document.getElementById('smoke-density-val');
        this.statusText = document.getElementById('smoke-status-text');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Интерактивное добавление дымка при касании/клике в режиме дыма
        window.addEventListener('pointermove', (e) => {
            if (this.density > 20 && Math.random() < 0.25) {
                this.addPuff(e.clientX, e.clientY, 1, 15);
            }
        });
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }

    // Добавить частицу дыма
    addPuff(x, y, count = 1, speed = 25) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * speed) / 10;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - Math.random() * 1.5 - 0.5, // тяга вверх
                radius: 40 + Math.random() * 80,
                growth: 0.8 + Math.random() * 1.2,
                alpha: 0.45 + Math.random() * 0.35,
                decay: 0.003 + Math.random() * 0.004,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                // Зеленовато-серый хакерский дым
                hue: Math.random() > 0.4 ? 140 : 120, // 3115 neon green tints
                lightness: 20 + Math.random() * 40
            });
        }
    }

    // Главный вызов ПЫЩ! Запуск плотного дыма по всему экрану
    triggerPysh() {
        this.active = true;
        this.canvas.classList.add('active');
        if (this.hud) this.hud.classList.add('visible');

        // Тряска экрана
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 600);

        // Генерация мощных вихрей дыма
        const spawnPoints = [
            { x: this.width * 0.5, y: this.height * 0.95 },
            { x: this.width * 0.2, y: this.height * 0.9 },
            { x: this.width * 0.8, y: this.height * 0.9 },
            { x: this.width * 0.5, y: this.height * 0.5 },
            { x: this.width * 0.1, y: this.height * 0.3 },
            { x: this.width * 0.9, y: this.height * 0.3 }
        ];

        spawnPoints.forEach(pt => {
            this.addPuff(pt.x, pt.y, 25, 45);
        });

        this.density = 3115;
        this.updateHUD();

        if (!this.animId) {
            this.animate();
        }
    }

    // Проветрить дым (постепенно или быстро)
    clearSmoke() {
        this.particles.forEach(p => p.decay *= 4);
        this.density = 0;
        this.updateHUD();
        setTimeout(() => {
            if (this.particles.length === 0) {
                this.active = false;
                this.canvas.classList.remove('active');
                if (this.hud) this.hud.classList.remove('visible');
            }
        }, 800);
    }

    updateHUD() {
        if (this.densityText) {
            this.densityText.textContent = `${Math.round(this.density)}%`;
        }
        if (this.statusText) {
            if (this.density > 2000) {
                this.statusText.textContent = 'ЗАВУЧ В ДЫМУ НЕ ВИДИТ! ТУРБИНА НА МАКСИМУМЕ!';
                this.statusText.style.color = '#00ff66';
            } else if (this.density > 500) {
                this.statusText.textContent = 'ГУСТОЙ ДЫМ 3115 // КАЛЬКУЛЯТОРЫ РАММ ГАСНУТ';
                this.statusText.style.color = '#39ff14';
            } else if (this.density > 50) {
                this.statusText.textContent = 'ДЫМ РАССЕИВАЕТСЯ... ТРЕБУЕТСЯ ПЫЩ!';
                this.statusText.style.color = '#00bb44';
            } else {
                this.statusText.textContent = 'АТМОСФЕРА СТАБИЛИЗИРОВАНА';
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Обновление и отрисовка частиц
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.radius += p.growth;
            p.rotation += p.rotSpeed;
            p.alpha -= p.decay;

            if (p.alpha <= 0 || p.radius > 450) {
                this.particles.splice(i, 1);
                continue;
            }

            // Отрисовка мягкого облака дыма с радиальным градиентом
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);

            const grad = this.ctx.createRadialGradient(0, 0, p.radius * 0.1, 0, 0, p.radius);
            grad.addColorStop(0, `hsla(${p.hue}, 85%, ${p.lightness}%, ${p.alpha * 0.85})`);
            grad.addColorStop(0.4, `hsla(${p.hue}, 60%, ${p.lightness * 0.7}%, ${p.alpha * 0.5})`);
            grad.addColorStop(0.8, `hsla(${p.hue}, 40%, 12%, ${p.alpha * 0.2})`);
            grad.addColorStop(1, `hsla(${p.hue}, 50%, 8%, 0)`);

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Плавное снижение плотности
        if (this.density > 0) {
            this.density = Math.max(0, this.density - 4.5);
            this.updateHUD();
        }

        if (this.particles.length > 0) {
            this.animId = requestAnimationFrame(() => this.animate());
        } else {
            this.animId = null;
            this.active = false;
            this.canvas.classList.remove('active');
            if (this.hud) this.hud.classList.remove('visible');
        }
    }
}

window.soundEngine = new SoundEngine();
window.smokeEngine = null;

document.addEventListener('DOMContentLoaded', () => {
    window.smokeEngine = new SmokeEngine();
});
