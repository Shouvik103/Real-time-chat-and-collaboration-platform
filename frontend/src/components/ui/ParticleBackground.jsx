import { useEffect, useRef } from "react";
export function ParticleBackground() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId;
    let particles = [];
    const mouse = { x: -1e3, y: -1e3 };
    const edgePadding = 16;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };
    class Particle {
      x;
      y;
      ox;
      oy;
      dx;
      dy;
      radius;
      quadrant;
      constructor(x, y, quadrant) {
        this.x = x;
        this.y = y;
        this.ox = x;
        this.oy = y;
        this.quadrant = quadrant;
        this.dx = (Math.random() - 0.5) * 1.5;
        this.dy = (Math.random() - 0.5) * 1.5;
        this.radius = 1.5;
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(56, 189, 248, 1)";
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      update() {
        const returnStrength = 1e-3;
        this.x += (this.ox - this.x) * returnStrength;
        this.y += (this.oy - this.y) * returnStrength;
        const wander = 0.08;
        this.dx += (Math.random() - 0.5) * wander;
        this.dy += (Math.random() - 0.5) * wander;
        const maxSpeed = 2.2;
        const minSpeed = 0.3;
        const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy) || 1e-4;
        if (speed > maxSpeed) {
          this.dx = this.dx / speed * maxSpeed;
          this.dy = this.dy / speed * maxSpeed;
        } else if (speed < minSpeed) {
          this.dx = this.dx / speed * minSpeed;
          this.dy = this.dy / speed * minSpeed;
        }
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
      }
    }
    const initParticles = () => {
      particles = [];
      const numParticles = Math.min(Math.floor(canvas.width * canvas.height / 7500), 250);
      const randInRange = (min, max) => {
        if (max <= min) return min;
        return min + Math.random() * (max - min);
      };
      for (let i = 0; i < numParticles; i++) {
        let x = randInRange(edgePadding, canvas.width - edgePadding);
        let y = randInRange(edgePadding, canvas.height - edgePadding);
        const card = document.getElementById("login-card");
        if (card) {
          const rect = card.getBoundingClientRect();
          const pad = edgePadding + 4;
          if (x > rect.left - pad && x < rect.right + pad && y > rect.top - pad && y < rect.bottom + pad) {
            if (Math.random() > 0.5) {
              y = Math.random() > 0.5 ? randInRange(edgePadding, rect.top - pad) : randInRange(rect.bottom + pad, canvas.height - edgePadding);
            } else {
              x = Math.random() > 0.5 ? randInRange(edgePadding, rect.left - pad) : randInRange(rect.right + pad, canvas.width - edgePadding);
            }
          }
        }
        const quad = x < canvas.width / 2 ? y < canvas.height / 2 ? "lt" : "lb" : y < canvas.height / 2 ? "rt" : "rb";
        particles.push(new Particle(x, y, quad));
      }
    };
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const boundary = 6;
      const bounceDamping = 0.6;
      const edgeKick = 0.08;
      const enforceBounds = (p) => {
        if (p.x < edgePadding) {
          p.x = edgePadding;
          p.dx = Math.abs(p.dx) * bounceDamping + edgeKick;
        } else if (p.x > canvas.width - edgePadding) {
          p.x = canvas.width - edgePadding;
          p.dx = -Math.abs(p.dx) * bounceDamping - edgeKick;
        }
        if (p.y < edgePadding) {
          p.y = edgePadding;
          p.dy = Math.abs(p.dy) * bounceDamping + edgeKick;
        } else if (p.y > canvas.height - edgePadding) {
          p.y = canvas.height - edgePadding;
          p.dy = -Math.abs(p.dy) * bounceDamping - edgeKick;
        }
        const card = document.getElementById("login-card");
        if (card) {
          const rect = card.getBoundingClientRect();
          const pad = edgePadding + 4;
          const minX = rect.left - pad;
          const maxX = rect.right + pad;
          const minY = rect.top - pad;
          const maxY = rect.bottom + pad;
          if (p.x > minX && p.x < maxX && p.y > minY && p.y < maxY) {
            const distLeft = Math.abs(p.x - minX);
            const distRight = Math.abs(maxX - p.x);
            const distTop = Math.abs(p.y - minY);
            const distBottom = Math.abs(maxY - p.y);
            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            if (minDist === distLeft) {
              p.x = minX;
              p.dx = -Math.abs(p.dx) * bounceDamping - edgeKick;
            } else if (minDist === distRight) {
              p.x = maxX;
              p.dx = Math.abs(p.dx) * bounceDamping + edgeKick;
            } else if (minDist === distTop) {
              p.y = minY;
              p.dy = -Math.abs(p.dy) * bounceDamping - edgeKick;
            } else {
              p.y = maxY;
              p.dy = Math.abs(p.dy) * bounceDamping + edgeKick;
            }
          }
        }
      };
      const dotRepelRadius = 100;
      const axisRepelStrength = 0.055;
      const diagAttractRadius = 70;
      const diagAttractStrength = 0.02;
      const diagRepelStrength = 0.075;
      const diagTolerance = 0.2;
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        enforceBounds(particles[i]);
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 1e-3) {
            const nx = dx / distance;
            const ny = dy / distance;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (absDx < dotRepelRadius) {
              const pushX = (dotRepelRadius - absDx) / dotRepelRadius;
              const dirX = Math.sign(dx) || 1;
              particles[i].x += dirX * pushX * axisRepelStrength;
              particles[j].x -= dirX * pushX * axisRepelStrength;
            }
            if (absDy < dotRepelRadius) {
              const pushY = (dotRepelRadius - absDy) / dotRepelRadius;
              const dirY = Math.sign(dy) || 1;
              particles[i].y += dirY * pushY * axisRepelStrength;
              particles[j].y -= dirY * pushY * axisRepelStrength;
            }
            if (absDx < dotRepelRadius && absDy < dotRepelRadius) {
              const maxAxis = Math.max(absDx, absDy);
              const diagAligned = maxAxis > 0 && Math.abs(absDx - absDy) / maxAxis < diagTolerance;
              if (distance < diagAttractRadius && diagAligned) {
                const pull = (diagAttractRadius - distance) / diagAttractRadius;
                particles[i].x -= nx * pull * diagAttractStrength;
                particles[i].y -= ny * pull * diagAttractStrength;
                particles[j].x += nx * pull * diagAttractStrength;
                particles[j].y += ny * pull * diagAttractStrength;
              } else {
                const push = (dotRepelRadius - distance) / dotRepelRadius;
                particles[i].x += nx * push * diagRepelStrength;
                particles[i].y += ny * push * diagRepelStrength;
                particles[j].x -= nx * push * diagRepelStrength;
                particles[j].y -= ny * push * diagRepelStrength;
              }
            }
            enforceBounds(particles[i]);
            enforceBounds(particles[j]);
          }
          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 - distance / 120 * 0.15})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        const dxMouse = particles[i].x - mouse.x;
        const dyMouse = particles[i].y - mouse.y;
        const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const magnetRadius = 200;
        const magnetStrength = 0.2;
        if (distanceMouse < magnetRadius && distanceMouse > 1e-3) {
          ctx.beginPath();
          const linkAlpha = 0.45 * (1 - distanceMouse / magnetRadius);
          ctx.strokeStyle = `rgba(56, 189, 248, ${linkAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
          const forceDirectionX = dxMouse / distanceMouse;
          const forceDirectionY = dyMouse / distanceMouse;
          const force = (magnetRadius - distanceMouse) / magnetRadius;
          particles[i].x += forceDirectionX * force * magnetStrength;
          particles[i].y += forceDirectionY * force * magnetStrength;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseOut = () => {
      mouse.x = -1e3;
      mouse.y = -1e3;
    };
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);
    resize();
    animate();
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  return <canvas
    ref={canvasRef}
    className="pointer-events-none absolute inset-0 z-0 h-full w-full"
  />;
}
