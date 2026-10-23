import React, { useEffect, useRef, useState } from 'react';

interface Triangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  normal: [number, number, number];
}

function parseStl(buffer: ArrayBuffer): Triangle[] {
  const isBinary = (buf: ArrayBuffer) => {
    if (buf.byteLength < 84) return false;
    const reader = new DataView(buf);
    const numTriangles = reader.getUint32(80, true);
    return (84 + numTriangles * 50) <= buf.byteLength;
  };

  const triangles: Triangle[] = [];

  if (isBinary(buffer)) {
    const reader = new DataView(buffer);
    const numTriangles = reader.getUint32(80, true);
    let offset = 84;
    for (let i = 0; i < numTriangles; i++) {
      if (offset + 50 > buffer.byteLength) break;
      const normal: [number, number, number] = [
        reader.getFloat32(offset, true),
        reader.getFloat32(offset + 4, true),
        reader.getFloat32(offset + 8, true)
      ];
      const v0: [number, number, number] = [
        reader.getFloat32(offset + 12, true),
        reader.getFloat32(offset + 16, true),
        reader.getFloat32(offset + 20, true)
      ];
      const v1: [number, number, number] = [
        reader.getFloat32(offset + 24, true),
        reader.getFloat32(offset + 28, true),
        reader.getFloat32(offset + 32, true)
      ];
      const v2: [number, number, number] = [
        reader.getFloat32(offset + 36, true),
        reader.getFloat32(offset + 40, true),
        reader.getFloat32(offset + 44, true)
      ];
      triangles.push({ v0, v1, v2, normal });
      offset += 50;
    }
  } else {
    // ASCII parsing
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);
    const lines = text.split('\n');
    let vertices: [number, number, number][] = [];
    let normal: [number, number, number] = [0, 0, 0];

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('facet normal')) {
        const parts = line.split(/\s+/);
        normal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
        vertices = [];
      } else if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        vertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (line.startsWith('endfacet')) {
        if (vertices.length === 3) {
          triangles.push({
            v0: vertices[0],
            v1: vertices[1],
            v2: vertices[2],
            normal: normal
          });
        }
      }
    }
  }

  return triangles;
}

export default function StlViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [triangles, setTriangles] = useState<Triangle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Rotation angles
  const [rotX, setRotX] = useState(-0.5);
  const [rotY, setRotY] = useState(0.5);

  // Bounding box calculation results
  const [modelCenter, setModelCenter] = useState<[number, number, number]>([0, 0, 0]);
  const [modelScale, setModelScale] = useState<number>(1);

  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load STL file');
        return res.arrayBuffer();
      })
      .then(buffer => {
        const parsed = parseStl(buffer);
        setTriangles(parsed);

        // Precalculate center and scale
        if (parsed.length > 0) {
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;

          for (const t of parsed) {
            for (const v of [t.v0, t.v1, t.v2]) {
              if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
              if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1];
              if (v[2] < minZ) minZ = v[2]; if (v[2] > maxZ) maxZ = v[2];
            }
          }

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const cz = (minZ + maxZ) / 2;

          const sizeX = maxX - minX;
          const sizeY = maxY - minY;
          const sizeZ = maxZ - minZ;
          const maxDimension = Math.max(sizeX, sizeY, sizeZ);
          
          setModelCenter([cx, cy, cz]);
          // Scale to fit 70% of canvas dimensions
          setModelScale(maxDimension > 0 ? 250 / maxDimension : 1);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [url]);

  useEffect(() => {
    if (triangles.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#111111'; // Primary dark (Near black) background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const [centerX, centerY, centerZ] = modelCenter;
      const scale = modelScale;

      const sinX = Math.sin(rotX);
      const cosX = Math.cos(rotX);
      const sinY = Math.sin(rotY);
      const cosY = Math.cos(rotY);

      const rotate = (x: number, y: number, z: number): [number, number, number] => {
        // Center around (0,0,0)
        let tx = x - centerX;
        let ty = y - centerY;
        let tz = z - centerZ;

        // Rotate Y
        let x1 = tx * cosY - tz * sinY;
        let z1 = tx * sinY + tz * cosY;

        // Rotate X
        let y2 = ty * cosX - z1 * sinX;
        let z2 = ty * sinX + z1 * cosX;

        return [x1, y2, z2];
      };

      // Project and sort triangles for Painter's algorithm
      const transformed = [];
      for (const t of triangles) {
        const rv0 = rotate(...t.v0);
        const rv1 = rotate(...t.v1);
        const rv2 = rotate(...t.v2);

        // Calculate surface normal
        const ux = rv1[0] - rv0[0];
        const uy = rv1[1] - rv0[1];
        const uz = rv1[2] - rv0[2];
        const vx = rv2[0] - rv0[0];
        const vy = rv2[1] - rv0[1];
        const vz = rv2[2] - rv0[2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const normalZ = len > 0 ? nz / len : 0;

        const avgZ = (rv0[2] + rv1[2] + rv2[2]) / 3;
        transformed.push({ rv0, rv1, rv2, avgZ, normalZ });
      }

      // Sort by depth (farthest first)
      transformed.sort((a, b) => b.avgZ - a.avgZ);

      // Render triangles
      ctx.lineWidth = 0.5;
      for (const t of transformed) {
        // Backface culling: only render faces pointing towards viewer
        if (t.normalZ <= 0) continue;

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + t.rv0[0] * scale, canvas.height / 2 + t.rv0[1] * scale);
        ctx.lineTo(canvas.width / 2 + t.rv1[0] * scale, canvas.height / 2 + t.rv1[1] * scale);
        ctx.lineTo(canvas.width / 2 + t.rv2[0] * scale, canvas.height / 2 + t.rv2[1] * scale);
        ctx.closePath();

        // Shading: base color + intensity based on alignment with camera/light source
        const intensity = Math.floor(110 + t.normalZ * 125);
        ctx.fillStyle = `rgb(${Math.max(0, intensity - 30)}, ${intensity}, ${Math.min(255, intensity + 30)})`; // Shaded Blueish hue
        ctx.strokeStyle = `rgb(${Math.max(0, intensity - 60)}, ${Math.max(0, intensity - 30)}, ${Math.min(255, intensity + 10)})`;
        ctx.fill();
        ctx.stroke();
      }
    };

    render();
  }, [triangles, rotX, rotY, modelCenter, modelScale]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    setRotY(prev => prev + deltaX * 0.015);
    setRotX(prev => prev + deltaY * 0.015);

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-[350px] h-[350px] bg-slate-900 border border-slate-700 rounded-lg">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-3 font-semibold">Loading 3D STL model...</p>
      </div>
    );
  }

  if (error || triangles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-[350px] h-[350px] bg-slate-900 border border-red-900 rounded-lg text-slate-400 text-xs p-4 text-center">
        <p className="text-red-400 font-bold mb-1">Failed to Render STL Model</p>
        <p className="text-[10px] text-slate-500">File is invalid, corrupt, or could not be fetched.</p>
      </div>
    );
  }

  return (
    <div className="relative border border-slate-700 rounded-lg overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-1 w-[358px]">
      <canvas
        ref={canvasRef}
        width={350}
        height={350}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-grab active:cursor-grabbing w-[350px] h-[350px]"
      />
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 pointer-events-none select-none">
        🖱️ Click & Drag to Rotate 3D Model
      </div>
    </div>
  );
}
