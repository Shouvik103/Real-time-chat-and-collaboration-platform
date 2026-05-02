import { useEffect, useRef } from 'react';

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000 };
    const edgePadding = 16;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      ox: number;
      oy: number;
      dx: number;
      dy: number;
      radius: number;
      quadrant: 'lt' | 'lb' | 'rt' | 'rb';

      constructor(x: number, y: number, quadrant: 'lt' | 'lb' | 'rt' | 'rb') {
        this.x = x;
        this.y = y;
        this.ox = x;
        this.oy = y;
        this.quadrant = quadrant;
        // Slower drift for a calmer motion
        this.dx = (Math.random() - 0.5) * 0.9;
        this.dy = (Math.random() - 0.5) * 0.9;
        this.radius = 1.5;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        // Make the dots glowy
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(56, 189, 248, 1)'; // Sky glow
        ctx.fill();
        ctx.shadowBlur = 0; // Reset so lines don't get the heavy blur
      }

      update() {
        // Bounce off edges
        if (this.x < 0 || this.x > canvas!.width) this.dx = -this.dx;
        if (this.y < 0 || this.y > canvas!.height) this.dy = -this.dy;

        // Gently ease back to the original position to avoid clustering
        const returnStrength = 0.002;
        this.x += (this.ox - this.x) * returnStrength;
        this.y += (this.oy - this.y) * returnStrength;

        // Add a tiny random wander so particles never settle
        const wander = 0.03;
        this.dx += (Math.random() - 0.5) * wander;
        this.dy += (Math.random() - 0.5) * wander;

        // Clamp speed to keep motion smooth and consistent
        const maxSpeed = 1.2;
        const minSpeed = 0.18;
        const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy) || 0.0001;
        if (speed > maxSpeed) {
          this.dx = (this.dx / speed) * maxSpeed;
          this.dy = (this.dy / speed) * maxSpeed;
        } else if (speed < minSpeed) {
          this.dx = (this.dx / speed) * minSpeed;
          this.dy = (this.dy / speed) * minSpeed;
        }

        this.x += this.dx;
        this.y += this.dy;
        this.draw();
      }
    }

    const initParticles = () => {
      particles = [];
      // Balanced density between the original 10000 and the previous 5000 setting
      const numParticles = Math.min(Math.floor((canvas.width * canvas.height) / 7500), 250);
      const evenTotal = Math.max(4, numParticles - (numParticles % 4));
      const quarter = evenTotal / 4;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const boundary = 6;

      const leftMinX = edgePadding;
      const leftMaxX = Math.max(edgePadding, centerX - boundary - edgePadding);
      const rightMinX = Math.min(canvas.width - edgePadding, centerX + boundary + edgePadding);
      const rightMaxX = canvas.width - edgePadding;

      const topMinY = edgePadding;
      const topMaxY = Math.max(edgePadding, centerY - boundary - edgePadding);
      const bottomMinY = Math.min(canvas.height - edgePadding, centerY + boundary + edgePadding);
      const bottomMaxY = canvas.height - edgePadding;

      const randInRange = (min: number, max: number) => {
        if (max <= min) return min;
        return min + Math.random() * (max - min);
      };

      for (let i = 0; i < quarter; i++) {
        const x = randInRange(leftMinX, leftMaxX);
        const y = randInRange(topMinY, topMaxY);
        particles.push(new Particle(x, y, 'lt'));
      }
      for (let i = 0; i < quarter; i++) {
        const x = randInRange(leftMinX, leftMaxX);
        const y = randInRange(bottomMinY, bottomMaxY);
        particles.push(new Particle(x, y, 'lb'));
      }
      for (let i = 0; i < quarter; i++) {
        const x = randInRange(rightMinX, rightMaxX);
        const y = randInRange(topMinY, topMaxY);
        particles.push(new Particle(x, y, 'rt'));
      }
      for (let i = 0; i < quarter; i++) {
        const x = randInRange(rightMinX, rightMaxX);
        const y = randInRange(bottomMinY, bottomMaxY);
        particles.push(new Particle(x, y, 'rb'));
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      const centerX = canvas!.width / 2;
      const centerY = canvas!.height / 2;
      const boundary = 6;
      const bounceDamping = 0.6;
      const edgeKick = 0.08;

      const enforceBounds = (p: Particle) => {
        const isLeft = p.quadrant === 'lt' || p.quadrant === 'lb';
        const isTop = p.quadrant === 'lt' || p.quadrant === 'rt';

        const minX = isLeft ? edgePadding : centerX + boundary + edgePadding;
        const maxX = isLeft ? centerX - boundary - edgePadding : canvas!.width - edgePadding;
        const minY = isTop ? edgePadding : centerY + boundary + edgePadding;
        const maxY = isTop ? centerY - boundary - edgePadding : canvas!.height - edgePadding;

        if (p.x < minX) {
          p.x = minX;
          p.dx = Math.abs(p.dx) * bounceDamping + edgeKick;
        } else if (p.x > maxX) {
          p.x = maxX;
          p.dx = -Math.abs(p.dx) * bounceDamping - edgeKick;
        }

        if (p.y < minY) {
          p.y = minY;
          p.dy = Math.abs(p.dy) * bounceDamping + edgeKick;
        } else if (p.y > maxY) {
          p.y = maxY;
          p.dy = -Math.abs(p.dy) * bounceDamping - edgeKick;
        }
      };

      const dotRepelRadius = 100; // Axis repulsion radius in px
      const axisRepelStrength = 0.055;
      const diagAttractRadius = 70; // ~1.5cm at 96dpi
      const diagAttractStrength = 0.02;
      const diagRepelStrength = 0.075;
      const diagTolerance = 0.2; // smaller = stricter 45/135/225/315 alignment

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        enforceBounds(particles[i]);

        // Connections between particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0.001) {
            const nx = dx / distance;
            const ny = dy / distance;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Axis-aligned repulsion within dotRepelRadius (horizontal + vertical)
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

            // Diagonal behavior: attract within 1.5cm, then repulse
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

            // Keep both particles inside their quadrants after adjustments
            enforceBounds(particles[i]);
            enforceBounds(particles[j]);
          }

          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 - (distance / 120) * 0.15})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // Magnetic effect with mouse
        const dxMouse = particles[i].x - mouse.x;
        const dyMouse = particles[i].y - mouse.y;
        const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        const magnetRadius = 200;
        const magnetStrength = 0.2;

        if (distanceMouse < magnetRadius && distanceMouse > 0.001) {
          // Draw connection to mouse (the magnetic web links)
          ctx.beginPath();
          const linkAlpha = 0.45 * (1 - distanceMouse / magnetRadius);
          ctx.strokeStyle = `rgba(56, 189, 248, ${linkAlpha})`; // Sky glow
          ctx.lineWidth = 1.2;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();

          // Magnetic repulsion from the cursor
          const forceDirectionX = dxMouse / distanceMouse;
          const forceDirectionY = dyMouse / distanceMouse;
          const force = (magnetRadius - distanceMouse) / magnetRadius;

          particles[i].x += forceDirectionX * force * magnetStrength;
          particles[i].y += forceDirectionY * force * magnetStrength;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
